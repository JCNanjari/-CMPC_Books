const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function validateImage(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return 'La imagen debe ser JPG, PNG o WEBP';
  if (file.size > MAX_IMAGE_BYTES) return 'La imagen no puede superar 2 MB';
  return null;
}
