# Shared names (Vaniya <-> Walija)

One list of names so the IAM policies, the workflows and the scripts all point at the same things. If a name here changes, change it in `infra/config.env` and the GitHub variables too.

The AWS account ID is not written here on purpose (this repo is public). It is in the GitHub variable `ECR_REGISTRY`.

## AWS

| Thing                 | Name                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Region                | `ap-south-1`                                                                             |
| ECR repo (frontend)   | `nocturne-frontend` (tags immutable)                                                     |
| ECR repo (backend)    | `nocturne-backend` (tags immutable)                                                      |
| ECR registry          | `<acct>.dkr.ecr.ap-south-1.amazonaws.com`                                                |
| Auto Scaling Group    | `nocturne-asg`                                                                           |
| Launch template       | `nocturne-lt`                                                                            |
| Load balancer         | `nocturne-alb`                                                                           |
| Config bucket         | `nocturne-config-<acct>-ap-south-1`                                                      |
| Deploy role (OIDC)    | `gha-deploy`                                                                             |
| CI role (OIDC)        | `gha-ci`                                                                                 |
| EC2 role and profile  | `nocturne-ec2`                                                                           |
| OIDC provider         | `token.actions.githubusercontent.com`                                                    |
| OIDC subject (deploy) | `repo:Vania-s-Organization@357513584/Nocturne-Library@1179123000:environment:production` |

## Image tags

`sha-<short commit>` and `v<major>.<minor>.<run number>` (major.minor come from the `VERSION` file).

## Parameter Store (prefix `/nocturne/prod/`)

| Parameter                             | Type         | Holds                             |
| ------------------------------------- | ------------ | --------------------------------- |
| `/nocturne/prod/MONGODB_URI`          | SecureString | Atlas connection string           |
| `/nocturne/prod/JWT_SECRET`           | SecureString | JWT signing secret                |
| `/nocturne/prod/EMAIL_USER`           | SecureString | mail account (optional)           |
| `/nocturne/prod/EMAIL_PASS`           | SecureString | mail password (optional)          |
| `/nocturne/prod/GOOGLE_BOOKS_API_KEY` | SecureString | Google Books key (optional)       |
| `/nocturne/prod/CORS_ORIGINS`         | String       | allowed origin, written by 40-alb |
| `/nocturne/prod/image_tag`            | String       | tag the ASG should run            |
| `/nocturne/prod/previous_image_tag`   | String       | last good tag, used for rollback  |

## GitHub

| Kind                   | Names                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Secrets                | `SONAR_TOKEN`, `SNYK_TOKEN`                                                                                        |
| Variables              | `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`, `AWS_CI_ROLE_ARN`, `ECR_REGISTRY`, `ASG_NAME`, `CONFIG_BUCKET`, `APP_URL`     |
| Environment            | `production` (deploys limited to `main`)                                                                           |
| Required status checks | `secret-scan`, `lint`, `format`, `dockerfile-lint`, `test`, `sonarcloud`, `dependency-scan`, `build`, `image-scan` |

## Where each name lives

- `infra/config.env` - AWS names and defaults
- `.github/workflows/cd.yml`, `rollback.yml` - read the GitHub variables above
- `scripts/deploy.sh`, `rollback.sh` - read `AWS_REGION`, `ASG_NAME`, `CONFIG_BUCKET` and the two image-tag parameters
