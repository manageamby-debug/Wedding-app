// Web version: localStorage.
export function getStored(key: string): string | null {
  try { return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null; } catch { return null; }
}
export function setStored(key: string, value: string) {
  try { if (typeof localStorage !== "undefined") localStorage.setItem(key, value); } catch { /* ignore */ }
}
export function removeStored(key: string) {
  try { if (typeof localStorage !== "undefined") localStorage.removeItem(key); } catch { /* ignore */ }
}
