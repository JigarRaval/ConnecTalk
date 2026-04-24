
const getStoredUploadValue = (file) => {
  if (!file) return null;
  // Cloudinary stores the secure URL in file.path
  return file.path || null;
};

const normalizeStoredUploadValue = (value) => {
  if (!value) return null;
  // Already a full URL (Cloudinary) – return as is
  return value;
};

module.exports = { getStoredUploadValue, normalizeStoredUploadValue };