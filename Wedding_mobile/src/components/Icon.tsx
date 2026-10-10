import Svg, { Circle, Path, Rect } from "react-native-svg";

export type IconName =
  | "search" | "plus" | "mail" | "heart" | "users" | "vendors"
  | "bell" | "receipt" | "settings" | "user" | "lock" | "back" | "chevron" | "theme" | "check";

export default function Icon({ name, color, size = 22, strokeWidth = 2 }: { name: IconName; color: string; size?: number; strokeWidth?: number }) {
  const p = { fill: "none", stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "search" ? <><Circle {...p} cx="11" cy="11" r="6.5" /><Path {...p} d="M16 16l4.5 4.5" /></> : null}
      {name === "plus" ? <Path {...p} d="M12 5v14M5 12h14" /> : null}
      {name === "mail" ? <><Rect {...p} x="3" y="5.5" width="18" height="13" rx="3" /><Path {...p} d="M4 8l8 5.5L20 8" /></> : null}
      {name === "heart" ? <Path {...p} d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" /> : null}
      {name === "users" ? <><Circle {...p} cx="9" cy="8" r="3.5" /><Path {...p} d="M3 20c0-3.5 3-5.5 6-5.5s6 2 6 5.5M16 5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3 2.2 3 5" /></> : null}
      {name === "vendors" ? <Path {...p} d="M6 4.5h9.5L18 7v12.5H6z" /> : null}
      {name === "bell" ? <Path {...p} d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" /> : null}
      {name === "receipt" ? <Path {...p} d="M6 3.5h12V21l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" /> : null}
      {name === "settings" ? <><Circle {...p} cx="12" cy="12" r="2.5" /><Path {...p} d="M12 3v4M12 17v4M3 12h4M17 12h4" /></> : null}
      {name === "user" ? <><Circle {...p} cx="12" cy="8" r="4" /><Path {...p} d="M4.5 20c.8-4 4-5.5 7.5-5.5s6.7 1.5 7.5 5.5" /></> : null}
      {name === "lock" ? <><Rect {...p} x="5" y="11" width="14" height="9" rx="3" /><Path {...p} d="M8 11V8a4 4 0 0 1 8 0v3" /></> : null}
      {name === "back" ? <Path {...p} d="M14.5 6l-6 6 6 6" /> : null}
      {name === "chevron" ? <Path {...p} d="M9.5 6l6 6-6 6" /> : null}
      {name === "theme" ? <><Circle {...p} cx="12" cy="12" r="8" /><Path {...p} fill={color} d="M12 4a8 8 0 0 1 0 16z" /></> : null}
      {name === "check" ? <Path {...p} d="M5 12.5l4.5 4.5L19 7.5" /> : null}
    </Svg>
  );
}
