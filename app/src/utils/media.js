const API_URL = import.meta.env.VITE_URL || "http://localhost:5000";

const normalizeUploadValue = (value) => {
  if (!value || typeof value !== "string") return null;
  if (/^(https?:|blob:|data:)/i.test(value)) return value;

  const normalized = value.replace(/\\/g, "/").trim();
  const uploadsMarker = "/uploads/";
  const uploadsIndex = normalized.toLowerCase().lastIndexOf(uploadsMarker);

  if (uploadsIndex !== -1) {
    return normalized.slice(uploadsIndex + uploadsMarker.length);
  }

  if (normalized.toLowerCase().startsWith("uploads/")) {
    return normalized.slice("uploads/".length);
  }

  if (normalized.toLowerCase().startsWith("/uploads/")) {
    return normalized.slice("/uploads/".length);
  }

  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : null;
};

export const buildUploadUrl = (value) => {
  if (!value) return null;
  if (/^(https?:|blob:|data:)/i.test(value)) return value;

  const normalized = normalizeUploadValue(value);
  return normalized ? `${API_URL}/uploads/${normalized}` : null;
};

export const buildImageUrl = (value, fallback = "/default-avatar.png") =>
  buildUploadUrl(value) || fallback;

export { normalizeUploadValue };
