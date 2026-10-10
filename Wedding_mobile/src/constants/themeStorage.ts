import Storage from "expo-sqlite/kv-store";

// Small synchronous key-value store (phone). The web version uses localStorage.
export function getStored(key: string): string | null {
  try { return Storage.getItemSync(key); } catch { return null; }
}
export function setStored(key: string, value: string) {
  try { Storage.setItemSync(key, value); } catch { /* ignore */ }
}
export function removeStored(key: string) {
  try { Storage.removeItemSync(key); } catch { /* ignore */ }
}
