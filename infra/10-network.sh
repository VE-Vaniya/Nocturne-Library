#!/usr/bin/env bash
# 10-network.sh - VPC, subnets, IGW, NAT gateway, route tables, S3 endpoint.
# Layout (docs/ARCHITECTURE.md section 2):
#   VPC 10.20.0.0/16 (DNS hostnames + resolution on)
#   public-a 10.20.0.0/24 (ap-south-1a)    public-b 10.20.1.0/24 (ap-south-1b)
#   private-app-a 10.20.10.0/24            private-app-b 10.20.11.0/24
#   rt-public: 0.0.0.0/0 -> IGW; rt-private-a/b: 0.0.0.0/0 -> NAT-a (single NAT)
#   S3 gateway endpoint on both private route tables (free; ECR layers come from S3)
# Re-runnable: if the NAT gateway was deleted to save money (infra/90-pause.sh),
# running this again recreates it with the SAME Elastic IP and repoints routes.
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="10-network"
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") [-h|--help]

Creates (or reconciles) the Nocturne VPC network in ${AWS_REGION} and prints the
NAT gateway Elastic IP to add to the MongoDB Atlas IP access list.
EOF
}

ensure_vpc() {
  local id
  id="$(vpc_id)"
  if [[ -z "${id}" ]]; then
    id="$(awsq ec2 create-vpc --cidr-block "${VPC_CIDR}" \
      --tag-specifications "$(ec2_tag_spec vpc "${VPC_NAME}")" --query Vpc.VpcId)"
    awsq ec2 wait vpc-available --vpc-ids "${id}" >/dev/null
    ok "created VPC ${id} (${VPC_CIDR})"
  else
    info "VPC ${VPC_NAME} exists: ${id}"
  fi
  awsq ec2 modify-vpc-attribute --vpc-id "${id}" --enable-dns-support '{"Value":true}' >/dev/null
  awsq ec2 modify-vpc-attribute --vpc-id "${id}" --enable-dns-hostnames '{"Value":true}' >/dev/null
  printf '%s' "${id}"
}

ensure_igw() {
  local vpc=$1 id attached
  id="$(ec2_id_by_name describe-internet-gateways 'InternetGateways[0].InternetGatewayId' "${IGW_NAME}")"
  if [[ -z "${id}" ]]; then
    id="$(awsq ec2 create-internet-gateway \
      --tag-specifications "$(ec2_tag_spec internet-gateway "${IGW_NAME}")" \
      --query InternetGateway.InternetGatewayId)"
    ok "created IGW ${id}"
  fi
  attached="$(nn "$(awsq ec2 describe-internet-gateways --internet-gateway-ids "${id}" \
    --query 'InternetGateways[0].Attachments[0].VpcId')")"
  if [[ -z "${attached}" ]]; then
    awsq ec2 attach-internet-gateway --internet-gateway-id "${id}" --vpc-id "${vpc}" >/dev/null
    ok "attached IGW ${id} to ${vpc}"
  elif [[ "${attached}" != "${vpc}" ]]; then
    die "IGW ${id} is attached to another VPC (${attached})"
  fi
  printf '%s' "${id}"
}

# ensure_subnet VPC NAME CIDR AZ TIER
ensure_subnet() {
  local vpc=$1 name=$2 cidr=$3 az=$4 tier=$5 id
  id="$(subnet_id "${name}")"
  if [[ -z "${id}" ]]; then
    id="$(awsq ec2 create-subnet --vpc-id "${vpc}" --cidr-block "${cidr}" --availability-zone "${az}" \
      --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${name}},{Key=Project,Value=${PROJECT}},{Key=Environment,Value=${ENV_NAME}},{Key=Tier,Value=${tier}}]" \
      --query Subnet.SubnetId)"
    ok "created subnet ${name} ${id} ${cidr} ${az}"
  else
    info "subnet ${name} exists: ${id}"
  fi
  # Nothing in our public subnets needs an auto-assigned public IP (only ALB + NAT).
  awsq ec2 modify-subnet-attribute --subnet-id "${id}" --no-map-public-ip-on-launch >/dev/null
  printf '%s' "${id}"
}

ensure_eip() {
  local alloc
  alloc="$(nn "$(awsq ec2 describe-addresses \
    --filters "Name=tag:Name,Values=${NAT_EIP_NAME}" "Name=tag:Project,Values=${PROJECT}" \
    --query 'Addresses[0].AllocationId')")"
  if [[ -z "${alloc}" ]]; then
    alloc="$(awsq ec2 allocate-address --domain vpc \
      --tag-specifications "$(ec2_tag_spec elastic-ip "${NAT_EIP_NAME}")" --query AllocationId)"
    ok "allocated Elastic IP ${alloc}"
  else
    info "Elastic IP ${NAT_EIP_NAME} exists: ${alloc}"
  fi
  printf '%s' "${alloc}"
}

ensure_nat() {
  local subnet=$1 alloc=$2 id
  id="$(ec2_id_by_name describe-nat-gateways 'NatGateways[0].NatGatewayId' "${NAT_NAME}" \
    "Name=state,Values=pending,available")"
  if [[ -z "${id}" ]]; then
    id="$(awsq ec2 create-nat-gateway --subnet-id "${subnet}" --allocation-id "${alloc}" \
      --connectivity-type public \
      --tag-specifications "$(ec2_tag_spec natgateway "${NAT_NAME}")" \
      --query NatGateway.NatGatewayId)"
    ok "creating NAT gateway ${id} (takes 1-3 minutes)"
  else
    info "NAT gateway ${NAT_NAME} exists: ${id}"
  fi
  awsq ec2 wait nat-gateway-available --nat-gateway-ids "${id}" >/dev/null
  printf '%s' "${id}"
}

ensure_route_table() {
  local vpc=$1 name=$2 id
  id="$(ec2_id_by_name describe-route-tables 'RouteTables[0].RouteTableId' "${name}")"
  if [[ -z "${id}" ]]; then
    id="$(awsq ec2 create-route-table --vpc-id "${vpc}" \
      --tag-specifications "$(ec2_tag_spec route-table "${name}")" --query RouteTable.RouteTableId)"
    ok "created route table ${name} ${id}"
  else
    info "route table ${name} exists: ${id}"
  fi
  printf '%s' "${id}"
}

# ensure_default_route RT --gateway-id X | --nat-gateway-id X
ensure_default_route() {
  local rt=$1 kind=$2 target=$3
  if awsq ec2 replace-route --route-table-id "${rt}" --destination-cidr-block 0.0.0.0/0 \
      "${kind}" "${target}" >/dev/null 2>&1; then
    info "route ${rt}: 0.0.0.0/0 -> ${target} (replaced)"
  else
    awsq ec2 create-route --route-table-id "${rt}" --destination-cidr-block 0.0.0.0/0 \
      "${kind}" "${target}" >/dev/null
    ok "route ${rt}: 0.0.0.0/0 -> ${target}"
  fi
}

ensure_association() {
  local rt=$1 subnet=$2 assoc current
  read -r assoc current < <(awsq ec2 describe-route-tables \
    --filters "Name=association.subnet-id,Values=${subnet}" \
    --query "RouteTables[0].Associations[?SubnetId=='${subnet}'] | [0].[RouteTableAssociationId,RouteTableId]")
  # (no `tr`: IFS is $'\n\t', so `read` splits the CLI's tab-separated output;
  #  turning tabs into spaces made re-runs pass "assoc rtb" as one association id)
  assoc="$(nn "${assoc:-}")"
  current="$(nn "${current:-}")"
  if [[ "${current}" == "${rt}" ]]; then
    info "subnet ${subnet} already associated with ${rt}"
  elif [[ -n "${assoc}" ]]; then
    awsq ec2 replace-route-table-association --association-id "${assoc}" --route-table-id "${rt}" >/dev/null
    ok "re-associated subnet ${subnet} -> ${rt}"
  else
    awsq ec2 associate-route-table --route-table-id "${rt}" --subnet-id "${subnet}" >/dev/null
    ok "associated subnet ${subnet} -> ${rt}"
  fi
}

ensure_s3_endpoint() {
  local vpc=$1 rta=$2 rtb=$3 id svc="com.amazonaws.${AWS_REGION}.s3"
  id="$(nn "$(awsq ec2 describe-vpc-endpoints \
    --filters "Name=vpc-id,Values=${vpc}" "Name=service-name,Values=${svc}" \
              "Name=vpc-endpoint-state,Values=pending,available" \
    --query 'VpcEndpoints[0].VpcEndpointId')")"
  if [[ -z "${id}" ]]; then
    id="$(awsq ec2 create-vpc-endpoint --vpc-id "${vpc}" --vpc-endpoint-type Gateway \
      --service-name "${svc}" --route-table-ids "${rta}" "${rtb}" \
      --tag-specifications "$(ec2_tag_spec vpc-endpoint "${S3_ENDPOINT_NAME}")" \
      --query VpcEndpoint.VpcEndpointId)"
    ok "created S3 gateway endpoint ${id}"
  else
    info "S3 gateway endpoint exists: ${id}"
  fi
}

main() {
  case "${1:-}" in
    -h|--help) usage; exit 0 ;;
    '') ;;
    *) usage; die "unknown argument: $1" ;;
  esac
  preflight

  local vpc igw pub_a pub_b prv_a prv_b alloc nat rt_pub rt_a rt_b eip
  vpc="$(ensure_vpc)"
  igw="$(ensure_igw "${vpc}")"
  pub_a="$(ensure_subnet "${vpc}" "${PROJECT}-public-a" "${PUBLIC_A_CIDR}" "${AZ_A}" public)"
  pub_b="$(ensure_subnet "${vpc}" "${PROJECT}-public-b" "${PUBLIC_B_CIDR}" "${AZ_B}" public)"
  prv_a="$(ensure_subnet "${vpc}" "${PROJECT}-private-app-a" "${PRIVATE_A_CIDR}" "${AZ_A}" private)"
  prv_b="$(ensure_subnet "${vpc}" "${PROJECT}-private-app-b" "${PRIVATE_B_CIDR}" "${AZ_B}" private)"

  rt_pub="$(ensure_route_table "${vpc}" "${RT_PUBLIC_NAME}")"
  ensure_default_route "${rt_pub}" --gateway-id "${igw}"
  ensure_association "${rt_pub}" "${pub_a}"
  ensure_association "${rt_pub}" "${pub_b}"

  alloc="$(ensure_eip)"
  nat="$(ensure_nat "${pub_a}" "${alloc}")"

  rt_a="$(ensure_route_table "${vpc}" "${RT_PRIVATE_A_NAME}")"
  rt_b="$(ensure_route_table "${vpc}" "${RT_PRIVATE_B_NAME}")"
  # Single NAT (cost trade-off, ARCHITECTURE.md section 2): both private RTs -> NAT-a.
  ensure_default_route "${rt_a}" --nat-gateway-id "${nat}"
  ensure_default_route "${rt_b}" --nat-gateway-id "${nat}"
  ensure_association "${rt_a}" "${prv_a}"
  ensure_association "${rt_b}" "${prv_b}"

  ensure_s3_endpoint "${vpc}" "${rt_a}" "${rt_b}"

  eip="$(awsq ec2 describe-addresses --allocation-ids "${alloc}" --query 'Addresses[0].PublicIp')"
  ok "network ready: vpc=${vpc} public=${pub_a},${pub_b} private=${prv_a},${prv_b} nat=${nat}"
  printf '\n  NAT Elastic IP (add to MongoDB Atlas -> Network Access): %s/32\n\n' "${eip}"
  info "next: infra/20-iam.sh"
}

main "$@"
