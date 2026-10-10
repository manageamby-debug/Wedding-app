// Money shown as millions: 18000000 -> "18M", 6500000 -> "6.5M".
export function millions(value: number) {
  const rounded = Math.round((value / 1_000_000) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export const tzs = (value: number) => `TZS ${millions(value)}M`;

export function initials(name: string) {
  return name
    .split(/\s|&/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// "14:00:00" -> "2:00 PM"
export function timeLabel(time?: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m || 0).padStart(2, "0")} ${suffix}`;
}

// "Saturday, 6 February 2027"
export function longDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const rest = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `${weekday}, ${rest}`;
}

export function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (Number.isNaN(minutes)) return "";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}
