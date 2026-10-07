import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "access_token";
type SessionExpiredListener = () => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

export function notifySessionExpired(): void {
  sessionExpiredListeners.forEach((listener) => listener());
}
