import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import api from "../src/services/api";
import { signOut } from "../src/services/auth";
import { applyThemeMode, colors, fonts, gradientPairs, themeMode, type ThemeMode } from "../src/constants/theme";
import WeddingNav from "../src/components/WeddingNav";
import Icon, { type IconName } from "../src/components/Icon";
import GradientBlock from "../src/components/GradientBlock";
import LoadingState from "../components/LoadingState";
import { useTopPadding } from "../src/hooks/useTopPadding";
import { initials } from "../src/utils/format";

type Event = { id: number; couple_names: string; name: string };
type Destination = "event" | "invite" | "budget" | "edit" | "story" | "appearance";

const tools: { label: string; icon: IconName; destination: Destination }[] = [
  { label: "Invitations", icon: "mail", destination: "invite" },
  { label: "Pledges", icon: "heart", destination: "budget" },
  { label: "Committees", icon: "users", destination: "event" },
  { label: "Vendors", icon: "vendors", destination: "story" },
];
const preferences: { label: string; icon: IconName; destination: Destination }[] = [
  { label: "Appearance", icon: "theme", destination: "appearance" },
  { label: "Notifications", icon: "bell", destination: "edit" },
  { label: "Transactions", icon: "receipt", destination: "budget" },
  { label: "Settings", icon: "settings", destination: "edit" },
  { label: "Account", icon: "user", destination: "edit" },
];
const CHAPTER_COUNT = 5;
const modeOptions: { mode: ThemeMode; label: string; hint: string }[] = [
  { mode: "system", label: "System", hint: "Follow your phone" },
  { mode: "light", label: "Light", hint: "Teal & marigold" },
  { mode: "dark", label: "Dark", hint: "Violet & apricot" },
];
const modeLabel = (mode: ThemeMode) => modeOptions.find((item) => item.mode === mode)?.label ?? "System";

export default function MoreScreen() {
  const topPadding = useTopPadding();
  const [event, setEvent] = useState<Event | null>(null); const [loading, setLoading] = useState(true); const [photoCount, setPhotoCount] = useState(0);
  const [pickingTheme, setPickingTheme] = useState(false);
  useFocusEffect(useCallback(() => {
    let live = true;
    api.get<Event[]>("/events").then(async (r) => {
      const first = r.data[0] ?? null;
      if (live) setEvent(first);
      if (first) {
        const photos = await api.get<unknown[]>(`/events/${first.id}/story-photos`).then((p) => p.data.length).catch(() => 0);
        if (live) setPhotoCount(photos);
      }
    }).catch(() => {}).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []));

  const logout = async () => { await signOut(); router.replace("/login"); };
  const confirmLogout = () => {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (window.confirm("Una uhakika unataka kutoka kwenye akaunti yako?")) void logout();
      return;
    }
    Alert.alert("Toka kwenye akaunti", "Una uhakika unataka kutoka kwenye akaunti yako?", [
      { text: "Ghairi", style: "cancel" },
      { text: "Toka", style: "destructive", onPress: () => void logout() },
    ]);
  };
  if (loading) return <LoadingState message="Loading your planner…" />;

  const chooseMode = (mode: ThemeMode) => {
    setPickingTheme(false);
    if (mode === themeMode) return;
    const restarted = applyThemeMode(mode, "/more");
    if (!restarted) Alert.alert("Theme saved", "Funga app kisha uifungue tena ili theme mpya ianze kufanya kazi.");
  };

  const open = (destination: Destination) => {
    if (destination === "appearance") { setPickingTheme(true); return; }
    if (destination === "story") { router.push("/our-story"); return; }
    if (!event) return;
    if (destination === "event") router.push("/event/" + event.id);
    else if (destination === "invite") router.push("/event/invitations?id=" + event.id);
    else if (destination === "budget") router.push("/event/payment-dashboard?id=" + event.id);
    else router.push("/event/edit-event?id=" + event.id);
  };
  const coupleName = event?.couple_names || event?.name || "Chereko";

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPadding }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>More</Text>

        <Pressable onPress={() => open("edit")} style={styles.profile}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials(coupleName)}</Text></View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.couple}>{coupleName}</Text>
            <Text style={styles.profileSub}>Wedding organizer</Text>
          </View>
          <Text style={styles.edit}>Edit</Text>
        </Pressable>

        <Text style={styles.section}>Event tools</Text>
        <Pressable onPress={() => router.push("/our-story")} style={styles.story}>
          <View style={styles.thumbs}>
            {gradientPairs.slice(0, 3).map((pair, index) => (
              <GradientBlock key={index} colors={pair} style={[styles.thumb, index > 0 && { marginLeft: -9 }]} />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.storyTitle}>Our Story</Text>
            <Text style={styles.subtitle}>{photoCount} photos · {CHAPTER_COUNT} chapters</Text>
          </View>
          <Text style={styles.new}>New</Text>
        </Pressable>

        <View style={styles.grid}>
          {tools.map((tool) => (
            <Pressable key={tool.label} onPress={() => open(tool.destination)} style={styles.tool}>
              <View style={styles.iconBox}><Icon name={tool.icon} color={colors.link} size={20} /></View>
              <Text style={styles.toolTitle}>{tool.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Preferences</Text>
        <View style={styles.card}>
          {preferences.map((item, index) => (
            <Pressable key={item.label} onPress={() => open(item.destination)} style={[styles.row, index === preferences.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.iconBox}><Icon name={item.icon} color={colors.link} size={20} /></View>
              <Text style={styles.rowText}>{item.label}</Text>
              {item.destination === "appearance" ? <Text style={styles.rowValue}>{modeLabel(themeMode)}</Text> : null}
              <Icon name="chevron" color={colors.textMuted} size={18} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={confirmLogout} style={styles.logout}><Text style={styles.logoutText}>Log out</Text></Pressable>
        <View style={{ height: 22 }} />
      </ScrollView>
      <WeddingNav active="more" eventId={event?.id} />
      <Modal visible={pickingTheme} transparent animationType="fade" onRequestClose={() => setPickingTheme(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickingTheme(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>Appearance</Text>
            {modeOptions.map((option) => (
              <Pressable key={option.mode} accessibilityRole="radio" accessibilityState={{ selected: option.mode === themeMode }} onPress={() => chooseMode(option.mode)} style={styles.option}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionHint}>{option.hint}</Text>
                </View>
                {option.mode === themeMode ? <Icon name="check" color={colors.accent} size={22} strokeWidth={2.6} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 22, paddingBottom: 18, maxWidth: 620, width: "100%", alignSelf: "center" },
  title: { fontFamily: fonts.serif, fontSize: 34, fontWeight: "700", color: colors.text, height: 46, lineHeight: 46 },

  profile: { marginTop: 20, height: 88, borderRadius: 24, backgroundColor: colors.primary, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 17, color: colors.onAccent, fontWeight: "800" },
  couple: { fontFamily: fonts.serif, fontSize: 22, color: "#FFFFFF", fontWeight: "700" },
  profileSub: { fontSize: 14, color: "rgba(255,255,255,0.78)", marginTop: 1 },
  edit: { color: "#FFFFFF", fontWeight: "800", fontSize: 13, backgroundColor: colors.primaryLight, paddingHorizontal: 14, height: 26, lineHeight: 26, borderRadius: 13, overflow: "hidden" },

  section: { fontSize: 17, color: colors.text, fontWeight: "800", marginTop: 20, marginBottom: 11, paddingHorizontal: 4 },
  story: { height: 68, borderRadius: 22, paddingHorizontal: 16, backgroundColor: colors.primarySoft, flexDirection: "row", alignItems: "center", gap: 14 },
  thumbs: { flexDirection: "row", alignItems: "center", width: 86 },
  thumb: { width: 34, height: 34, borderRadius: 9, borderWidth: 2, borderColor: colors.primarySoft },
  storyTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 1 },
  new: { borderRadius: 13, overflow: "hidden", backgroundColor: colors.accent, color: colors.onAccent, height: 26, lineHeight: 26, paddingHorizontal: 14, fontSize: 13, fontWeight: "800" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  tool: { width: "47.6%", flexGrow: 1, height: 62, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  toolTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },

  card: { borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden" },
  row: { height: 61, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: colors.border },
  rowText: { color: colors.text, fontSize: 17, flex: 1 },
  rowValue: { color: colors.textMuted, fontSize: 14 },

  backdrop: { flex: 1, backgroundColor: "rgba(8,6,16,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 34, maxWidth: 620, width: "100%", alignSelf: "center" },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 24, fontWeight: "700", color: colors.text, marginBottom: 8 },
  option: { minHeight: 62, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: colors.border },
  optionLabel: { color: colors.text, fontSize: 17, fontWeight: "700" },
  optionHint: { color: colors.textMuted, fontSize: 14, marginTop: 1 },

  logout: { marginTop: 18, height: 54, borderRadius: 27, borderWidth: 1, borderColor: colors.danger, alignItems: "center", justifyContent: "center" },
  logoutText: { fontSize: 17, fontWeight: "800", color: colors.danger },
});
