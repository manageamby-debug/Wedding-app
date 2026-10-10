import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors } from "../constants/theme";

type Tab = "home" | "guests" | "checkin" | "budget" | "more";
const tabs: { key: Tab; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "guests", label: "Guests" },
  { key: "checkin", label: "Check-in" },
  { key: "budget", label: "Budget" },
  { key: "more", label: "More" },
];

function Icon({ tab, color }: { tab: Tab; color: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {tab === "home" ? <Path {...common} d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" /> : null}
      {tab === "guests" ? (
        <>
          <Circle {...common} cx="9" cy="8" r="3.5" />
          <Path {...common} d="M3 20c0-3.5 3-5.5 6-5.5s6 2 6 5.5M16 5a3.5 3.5 0 010 7M18 15c2 .6 3 2.2 3 5" />
        </>
      ) : null}
      {tab === "checkin" ? <Path {...common} d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M9 9h6v6H9z" /> : null}
      {tab === "budget" ? (
        <>
          <Rect {...common} x="3" y="6" width="18" height="13" rx="3" />
          <Path {...common} d="M16 12.5h5" />
        </>
      ) : null}
      {tab === "more" ? (
        <>
          <Rect {...common} x="4" y="4" width="6" height="6" rx="1.5" />
          <Rect {...common} x="14" y="4" width="6" height="6" rx="1.5" />
          <Rect {...common} x="4" y="14" width="6" height="6" rx="1.5" />
          <Rect {...common} x="14" y="14" width="6" height="6" rx="1.5" />
        </>
      ) : null}
    </Svg>
  );
}

export default function WeddingNav({ active, eventId }: { active: Tab; eventId?: number }) {
  const { bottom } = useSafeAreaInsets();

  function open(tab: Tab) {
    if (tab === "home") router.push("/dashboard");
    else if (tab === "more") router.push("/more");
    else if (!eventId) router.push("/dashboard");
    else if (tab === "guests") router.push("/guests");
    else if (tab === "checkin") router.push("/check-in");
    else router.push("/budget");
  }

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(bottom - 12, 16) }]}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              onPress={() => open(tab.key)}
              style={[styles.item, selected && styles.selected]}
            >
              <Icon tab={tab.key} color={selected ? colors.onAccent : colors.navIcon} />
              {selected ? <Text numberOfLines={1} style={styles.label}>{tab.label}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 24, paddingTop: 8, backgroundColor: colors.background },
  bar: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dock,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },
  item: { minWidth: 44, height: 44, borderRadius: 22, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  selected: { backgroundColor: colors.accent, paddingHorizontal: 18 },
  label: { color: colors.onAccent, fontSize: 15, fontWeight: "700" },
});
