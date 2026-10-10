import { Appearance, DevSettings, Platform } from "react-native";
import { getStored, removeStored, setStored } from "./themeStorage";

// Chereko design tokens.
// Light theme: Teal & Marigold. Dark theme: Violet & Apricot.
// The user can choose System / Light / Dark (saved on the phone). The choice is read
// synchronously when the app starts, so every screen is built with the right palette.
export type ThemeMode = "system" | "light" | "dark";
const stored = getStored("themeMode");
export const themeMode: ThemeMode = stored === "light" || stored === "dark" ? stored : "system";
if (themeMode !== "system" && typeof Appearance.setColorScheme === "function") {
  try { Appearance.setColorScheme(themeMode); } catch { /* not supported on this platform */ }
}
const isLight = themeMode === "system" ? Appearance.getColorScheme() === "light" : themeMode === "light";
export const isLightTheme = isLight;

// Saves the choice and restarts the app so the new palette is applied everywhere.
// Returns false when the app cannot restart itself (the user must reopen it).
export function applyThemeMode(mode: ThemeMode, returnTo?: string): boolean {
  setStored("themeMode", mode);
  if (returnTo) setStored("themeReturn", returnTo);
  if (Platform.OS === "web") { window.location.reload(); return true; }
  if (__DEV__) { DevSettings.reload(); return true; }
  return false;
}

// After a theme restart, the screen the user was on (e.g. "/more") to go back to, once.
export function takeReturnRoute(): string | null {
  const route = getStored("themeReturn");
  if (route) removeStored("themeReturn");
  return route;
}

export const colors = isLight ? {
  background: "#F6FAF9",
  primary: "#0F5C63",
  primarySoft: "#DFF0EE",
  primaryLight: "#2C7C83",
  navIcon: "#8FC3C3",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  border: "#DDE8E7",
  text: "#10262B",
  textMuted: "#52676B",
  accent: "#F2A93B",
  accentSoft: "#DFF0EE",
  onAccent: "#10262B",
  success: "#17664F",
  successSoft: "#DDEFE7",
  warning: "#8A5A13",
  warningSoft: "#F9E8C6",
  info: "#287A9A",
  danger: "#B94B3D",
  dangerSoft: "#F6DDD8",
  onDangerSoft: "#9A4032",
  heroA: "#0A3F45",
  heroB: "#1C7C84",
  ringB: "#5BB5AD",
  link: "#0F5C63",
  dock: "#0A3F45",
  // Segmented control (Categories / Analytics, By status / By table)
  segmentBg: "#E6EEED",
  segmentActive: "#FFFFFF",
  // Striped "couple photo" placeholder + countdown ring track
  heroBase: "#0A4A50",
  heroStripe: "#2A6A72",
  ringTrack: "#2C7C83",
  tagBg: "rgba(6,38,42,0.72)",
  // Check-in screen (dark scanner backdrop even in light theme)
  scanBg: "#0A3F45",
  scanText: "#D5E6E6",
  countBadge: "#2C7C83",
  // Category / chart colours: venue, catering, decor, photography
  chart: ["#0F5C63", "#F2A93B", "#5BB5AD", "#DE634D"],
} : {
  background: "#120E1C",
  primary: "#7655E0",
  primarySoft: "#2B2250",
  primaryLight: "#4A3A8F",
  navIcon: "#A79FC0",
  surface: "#1D1730",
  card: "#1D1730",
  border: "#2E2646",
  text: "#F2EEFA",
  textMuted: "#A79FC0",
  accent: "#F6C177",
  accentSoft: "#2B2250",
  onAccent: "#1A1226",
  success: "#69D0A5",
  successSoft: "#17382E",
  warning: "#F6C177",
  warningSoft: "#402F18",
  info: "#83BFE8",
  danger: "#EF829E",
  dangerSoft: "#40212B",
  onDangerSoft: "#EF829E",
  heroA: "#0B0816",
  heroB: "#4A3A8F",
  ringB: "#9B7BFF",
  link: "#C9B8FF",
  dock: "#241C3D",
  segmentBg: "#251E3E",
  segmentActive: "#1A1528",
  heroBase: "#3A2D78",
  heroStripe: "#5B45B8",
  ringTrack: "#4A3A9A",
  tagBg: "rgba(18,14,40,0.72)",
  scanBg: "#0A0914",
  scanText: "#C9C3DD",
  countBadge: "#4A3A8F",
  chart: ["#9B7BFF", "#F6C177", "#6ED0C0", "#FF8FB1"],
};

// Soft gradient pairs used by the "Our Story" photo placeholders.
export const gradientPairs: [string, string][] = isLight
  ? [["#1F6B63", "#F2A93B"], ["#F2A93B", "#5BB5AD"], ["#5BB5AD", "#DE634D"], ["#DE634D", "#1F6B63"]]
  : [["#A58BFF", "#F6C177"], ["#F6C177", "#6ED0C0"], ["#6ED0C0", "#FF8FB1"], ["#FF8FB1", "#A58BFF"]];

// Typography. The designs use a serif for headings and DM Sans for body text.
// To switch fonts later, change them here only.
export const fonts = {
  serif: "Georgia",
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};
