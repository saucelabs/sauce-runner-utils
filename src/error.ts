export function errCode(obj: unknown): string | number {
  if (typeof obj !== 'object' || obj === null || !('code' in obj)) {
    return '';
  }
  if (typeof obj.code === 'number' || typeof obj.code === 'string') {
    return obj.code;
  }
  return '';
}
