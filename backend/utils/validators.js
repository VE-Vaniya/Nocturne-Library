const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const DATA_URL_RE = /^data:image\/(png|jpe?g|gif|webp|avif);base64,([A-Za-z0-9+/=\s]+)$/;

// Returns an error message, or null when the avatar is acceptable.
// Accepts "" (clear), an https URL, or a base64 image data URL <= 2 MB.
const avatarError = (avatar) => {
  if (typeof avatar !== 'string') return 'Avatar must be a string';
  if (avatar === '') return null;

  if (avatar.startsWith('data:')) {
    const m = DATA_URL_RE.exec(avatar);
    if (!m) return 'Avatar must be a base64 image data URL (png, jpeg, gif, webp or avif)';
    const b64 = m[2].replace(/\s/g, '');
    const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
    const bytes = Math.floor((b64.length * 3) / 4) - padding;
    if (bytes > MAX_AVATAR_BYTES) return 'Avatar image must be 2 MB or smaller';
    return null;
  }

  if (avatar.length > 2048) return 'Avatar URL is too long';
  try {
    const url = new URL(avatar);
    if (url.protocol !== 'https:') return 'Avatar URL must use https';
    return null;
  } catch {
    return 'Avatar must be an https URL or an image data URL';
  }
};

module.exports = { USERNAME_RE, MAX_AVATAR_BYTES, avatarError };
