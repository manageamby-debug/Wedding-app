import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import api from "../src/services/api";
import { colors, fonts } from "../src/constants/theme";
import WeddingNav from "../src/components/WeddingNav";
import LoadingState from "../components/LoadingState";
import { useTopPadding } from "../src/hooks/useTopPadding";
import { initials, timeAgo } from "../src/utils/format";

type Event = { id: number; status: string };
type Guest = {
  id: number; full_name: string; guest_code: string; check_in_status?: string | null; checked_in_at?: string | null;
  table_number?: number | string | null; table_name?: string | null;
};
type Summary = { guests: { total: number }; check_in: { checked_in: number } };

export default function CheckInScreen() {
  const topPadding = useTopPadding();
  const [event, setEvent] = useState<Event | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<{ done: number; total: number } | null>(null);
  const [recent, setRecent] = useState<Guest | null>(null);

  useFocusEffect(useCallback(() => {
    let live = true;
    api.get<Event[]>("/events").then(async (res) => {
      const selected = res.data.find((e) => e.status === "active" || e.status === "published") ?? res.data[0] ?? null;
      if (!live) return;
      setEvent(selected);
      if (!selected) return;
      const [summary, guests] = await Promise.all([
        api.get<Summary>(`/events/${selected.id}/dashboard`).then((r) => r.data).catch(() => null),
        api.get<Guest[]>(`/events/${selected.id}/guest`).then((r) => r.data).catch(() => [] as Guest[]),
      ]);
      if (!live) return;
      if (summary) setCounts({ done: summary.check_in.checked_in, total: summary.guests.total });
      const done = guests.filter((guest) => guest.check_in_status === "checked_in");
      done.sort((a, b) => new Date(b.checked_in_at ?? 0).getTime() - new Date(a.checked_in_at ?? 0).getTime());
      setRecent(done[0] ?? null);
    }).catch(() => {}).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []));

  if (loading) return <LoadingState message="Preparing check-in…" />;

  const table = recent ? (recent.table_name || (recent.table_number != null && recent.table_number !== "" ? `Table ${recent.table_number}` : null)) : null;
  const when = recent ? (timeAgo(recent.checked_in_at) || "checked in") : "";

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <Text style={styles.title}>Check-in</Text>
          <Text style={styles.count}>{counts ? `${counts.done} / ${counts.total}` : "Live"}</Text>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Scan invitation QR code" onPress={() => event && router.push("/event/scan?id=" + event.id)} style={styles.scanArea}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.tl]} /><View style={[styles.corner, styles.tr]} />
            <View style={styles.scanLine} />
            <View style={[styles.corner, styles.bl]} /><View style={[styles.corner, styles.br]} />
          </View>
          <Text style={styles.hint}>Align the invitation QR code in the frame</Text>
        </Pressable>

        <View style={styles.panel}>
          <View style={styles.handle} />
          <Text style={styles.label}>Enter card number</Text>
          <TextInput value={code} onChangeText={setCode} placeholder="e.g. 068/SINGLE" placeholderTextColor={colors.textMuted} autoCapitalize="characters" autoCorrect={false} style={styles.input} />
          <Pressable
            accessibilityRole="button"
            disabled={!event || !code.trim()}
            onPress={() => router.push("/event/check-in-search?id=" + event?.id + "&code=" + encodeURIComponent(code.trim()))}
            style={[styles.button, (!event || !code.trim()) && styles.disabled]}
          >
            <Text style={styles.buttonText}>Verify guest</Text>
          </Pressable>

          {recent ? (
            <Pressable style={styles.recent} onPress={() => router.push("/event/check-in-search?id=" + event?.id + "&code=" + encodeURIComponent(recent.guest_code))}>
              <View style={styles.initials}><Text style={styles.initialText}>{initials(recent.full_name)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.guest}>{recent.full_name}</Text>
                <Text style={styles.recentMeta}>{[table, when].filter(Boolean).join(" · ")}</Text>
              </View>
              <Text style={styles.welcome}>Welcome</Text>
            </Pressable>
          ) : (
            <Text style={styles.noRecent}>No guests checked in yet</Text>
          )}
        </View>
      </ScrollView>
      <WeddingNav active="checkin" eventId={event?.id} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.scanBg },
  content: { flexGrow: 1, maxWidth: 620, width: "100%", alignSelf: "center" },
  header: { paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.serif, fontSize: 34, color: "#FFFFFF", fontWeight: "700" },
  count: { backgroundColor: colors.countBadge, color: "#FFFFFF", overflow: "hidden", paddingHorizontal: 12, paddingVertical: 4, lineHeight: 18, borderRadius: 13, fontSize: 13, fontWeight: "800" },

  scanArea: { flexGrow: 1, minHeight: 320, alignItems: "center", paddingTop: 70, paddingHorizontal: 25 },
  frame: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  corner: { position: "absolute", width: 48, height: 48, borderColor: colors.accent, borderWidth: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 20 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 20 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 20 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 20 },
  scanLine: { width: 196, height: 2, backgroundColor: colors.accent },
  hint: { marginTop: 22, color: colors.scanText, fontSize: 15, textAlign: "center" },

  panel: { backgroundColor: colors.background, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 16 },
  handle: { height: 5, width: 44, borderRadius: 3, backgroundColor: colors.border, alignSelf: "center", marginBottom: 20 },
  label: { fontSize: 17, color: colors.text, fontWeight: "800", marginBottom: 12 },
  input: { height: 54, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 18, color: colors.text, fontSize: 17, marginBottom: 13 },
  button: { height: 54, borderRadius: 27, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.55 },
  buttonText: { fontSize: 17, color: colors.onAccent, fontWeight: "800" },

  recent: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
  initials: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  initialText: { fontSize: 14, color: colors.link, fontWeight: "800" },
  guest: { fontSize: 17, color: colors.text, fontWeight: "700" },
  recentMeta: { fontSize: 14, color: colors.textMuted, marginTop: 1 },
  welcome: { color: colors.success, fontWeight: "700", fontSize: 14, backgroundColor: colors.successSoft, borderRadius: 13, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 4, lineHeight: 18 },
  noRecent: { marginTop: 18, color: colors.textMuted, fontSize: 14, textAlign: "center" },
});
