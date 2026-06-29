const allowedLogoPattern = /^data:image\/(png|jpeg|jpg);base64,[a-z0-9+/=]+$/i;
const maxLogoDataUrlLength = 1_500_000;

function normalizeClientLogoDataUrl(value) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLogoDataUrlLength || !allowedLogoPattern.test(normalized)) {
    const error = new Error('Client logo must be a PNG or JPG image under 1 MB.');
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function getLogoExtension(dataUrl = '') {
  const match = String(dataUrl).match(/^data:image\/(png|jpeg|jpg);base64,/i);
  if (!match) {
    return null;
  }

  return match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
}

module.exports = {
  getLogoExtension,
  normalizeClientLogoDataUrl
};
