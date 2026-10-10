import { Platform } from "react-native";
import Storage from "expo-sqlite/kv-store";

// The browser should use its native synchronous storage. Expo SQLite's web
// backend requires browser capabilities that aren't enabled by every host.
// Native apps use SQLite's synchronous key-value store so the theme is ready
// before screens read the palette at startup.
export function getStored(key: string): string | null {
  try {
    return Platform.OS === "web" ? window.localStorage.getItem(key) : Storage.getItemSync(key);
  } catch { return null; }
}
export function setStored(key: string, value: string) {
  try {
    if (Platform.OS === "web") window.localStorage.setItem(key, value);
    else Storage.setItemSync(key, value);
  } catch { /* ignore unavailable storage */ }
}
export function removeStored(key: string) {
  try {
    if (Platform.OS === "web") window.localStorage.removeItem(key);
    else Storage.removeItemSync(key);
  } catch { /* ignore unavailable storage */ }
}
