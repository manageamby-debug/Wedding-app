import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import api from "../../src/services/api";
import { colors, fonts } from "../../src/constants/theme";
import WeddingNav from "../../src/components/WeddingNav";
import Icon from "../../src/components/Icon";
import StripedBlock, { type Pattern } from "../../src/components/StripedBlock";
import LoadingState from "../../components/LoadingState";
import { useTopPadding } from "../../src/hooks/useTopPadding";
import { longDate, timeLabel } from "../../src/utils/format";

type Event = {
  id: number; couple_names?: string; name?: string; groom_name?: string; bride_name?: string;
  event_date: string; event_time?: string; venue_name?: string; venue?: string;
};
type Guest = { id: number; full_name: string; guest_code: string; table_number?: number | string | null; table_name?: string | null };

const templates: { key: string; label: string; pattern: Pattern }[] = [
  { key: "classic", label: "Classic", pattern: "stripes" },
  { key: "floral", label: "Floral", pattern: "dots" },
  { key: "modern", label: "Modern", pattern: "plain" },
];

export default function InvitationsScreen() {
  const topPadding = useTopPadding();
  const params = useLocalSearchParams<{ id?: string }>();
  const eventParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState("classic");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useFocusEffect(useCallback(() => {
    let live = true;
    api.get<Event[]>("/events").then(async (res) => {
      const selected = res.data.find((item) => String(item.id) === eventParam) ?? res.data[0] ?? null;
      if (!live) return;
      setEvent(selected);
      if (selected) {
        const list = await api.get<Guest[]>(`/events/${selected.id}/guest`).then((r) => r.data).catch(() => [] as Guest[]);
        if (live) setGuests(list);
      }
    }).catch(() => {}).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [eventParam]));

  if (loading) return <LoadingState message="Loading invitations…" />;

  const sample = guests[0];
  const pattern = templates.find((item) => item.key === template)?.pattern ?? "stripes";
  const names = event?.groom_name && event?.bride_name
    ? [event.groom_name, event.bride_name]
    : (event?.couple_names || event?.name || "Juma & Neema").split("&").map((part) => part.trim());
  const sampleTable = sample ? (sample.table_name || (sample.table_number != null && sample.table_number !== "" ? `Table ${sample.table_number}` : null)) : null;
  const place = event?.venue_name || event?.venue || "";
  const when = [place, timeLabel(event?.event_time)].filter(Boolean).join(" · ");

  async function sendAll() {
    if (sending || !guests.length) return;
    setSending(true); setMessage("");
    let done = 0;
    for (const guest of guests) {
      try { await api.post("/invitations", { guest_id: guest.id }); done += 1; } catch { /* keep going; reported below */ }
      setMessage(`Preparing invitations… ${done} / ${guests.length}`);
    }
    setSending(false);
    setMessage(done === guests.length ? `Invitations ready for all ${done} guests.` : `Invitations ready for ${done} of ${guests.length} guests. Try again for the rest.`);
  }
  function confirmSend() {
    const text = `Create invitations for ${guests.length} guests?`;
    if (Platform.OS === "web") { if (window.confirm(text)) void sendAll(); return; }
    Alert.alert("Send invitations", text, [{ text: "Cancel", style: "cancel" }, { text: "Send", onPress: () => void sendAll() }]);
  }
  function preview() {
    if (!event || !sample) return;
    router.push(`/event/invitation?id=${event.id}&guestId=${sample.id}&guestName=${encodeURIComponent(sample.full_name)}&guestCode=${encodeURIComponent(sample.guest_code)}`);
  }

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPadding }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Invitation</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.round}>
            <Icon name="back" color={colors.text} size={18} strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.photo}>
            <StripedBlock pattern={pattern} />
            <View style={styles.photoTag}><Text style={styles.photoTagText}>COUPLE PHOTO</Text></View>
          </View>
          <View style={styles.body}>
            <Text style={styles.eyebrow}>TUNAKUALIKA</Text>
            <Text style={styles.names}>
              {names[0]}{names[1] ? <Text style={styles.amp}> &amp; </Text> : null}{names[1] ?? ""}
            </Text>
            <Text style={styles.date}>{event ? longDate(event.event_date) : ""}</Text>
            <Text style={styles.place}>{when}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.admit}>
            <View style={{ flex: 1 }}>
              <Text style={styles.admitLabel}>ADMIT</Text>
              <Text numberOfLines={1} style={styles.admitName}>{sample?.full_name ?? "Guest name"}</Text>
              <Text numberOfLines={1} style={styles.admitMeta}>{[sampleTable, sample?.guest_code ?? "068/SINGLE"].filter(Boolean).join(" · ")}</Text>
            </View>
            <View style={styles.qr}><QRCode value={sample?.guest_code ?? "068/SINGLE"} size={52} backgroundColor="#FFFFFF" color="#10262B" /></View>
          </View>
        </View>

        <View style={styles.chips}>
          {templates.map((item) => (
            <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: template === item.key }} onPress={() => setTemplate(item.key)} style={[styles.chip, template === item.key && styles.chipActive]}>
              <Text style={[styles.chipText, template === item.key && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={!sample} onPress={preview} style={[styles.preview, !sample && styles.disabled]}><Text style={styles.previewText}>Preview</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={!guests.length || sending} onPress={confirmSend} style={[styles.send, (!guests.length || sending) && styles.disabled]}>
            <Text style={styles.sendText}>{sending ? "Sending…" : `Send to ${guests.length} guests`}</Text>
          </Pressable>
        </View>
        {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
        <View style={{ height: 20 }} />
      </ScrollView>
      <WeddingNav active="more" eventId={event?.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 22, paddingBottom: 15, maxWidth: 620, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 46 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.text, fontWeight: "700" },
  round: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },

  card: { marginTop: 18, borderRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden" },
  photo: { height: 179, overflow: "hidden", backgroundColor: colors.heroBase },
  photoTag: { position: "absolute", top: 15, left: 15, borderRadius: 14, backgroundColor: colors.tagBg, paddingVertical: 4, paddingHorizontal: 12 },
  photoTagText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  body: { alignItems: "center", paddingTop: 24, paddingBottom: 20, paddingHorizontal: 16 },
  eyebrow: { color: colors.textMuted, fontSize: 12, letterSpacing: 4 },
  names: { marginTop: 10, color: colors.text, fontFamily: fonts.serif, fontSize: 34, fontWeight: "700", textAlign: "center" },
  amp: { color: colors.accent, fontStyle: "italic" },
  date: { marginTop: 14, color: colors.text, fontSize: 17, fontWeight: "700" },
  place: { marginTop: 2, color: colors.textMuted, fontSize: 14.5 },
  divider: { borderTopWidth: 1, borderStyle: "dashed", borderColor: colors.border, marginHorizontal: 0 },
  admit: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  admitLabel: { color: colors.textMuted, fontSize: 12, letterSpacing: 0.5 },
  admitName: { color: colors.text, fontSize: 19, fontWeight: "700", marginTop: 2 },
  admitMeta: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  qr: { width: 64, height: 64, borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },

  chips: { flexDirection: "row", gap: 8, marginTop: 16 },
  chip: { height: 35, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 15, fontWeight: "700", color: colors.text },
  chipTextActive: { color: "#FFFFFF" },

  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  preview: { width: 113, height: 54, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  previewText: { color: colors.text, fontSize: 17, fontWeight: "800" },
  send: { flex: 1, height: 54, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  sendText: { color: colors.onAccent, fontSize: 17, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  message: { marginTop: 14, color: colors.textMuted, fontSize: 14, textAlign: "center" },
});
