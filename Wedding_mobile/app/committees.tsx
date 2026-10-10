import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import api from "../src/services/api";
import { colors } from "../src/constants/theme";
import WeddingNav from "../src/components/WeddingNav";
import LoadingState from "../components/LoadingState";

type EventItem = { id: number; couple_names: string; name: string };
type CurrentUser = { id: number };
type Member = { id: number; user_id: number; full_name: string; email: string; position: string };
const positions = ["vice_chair", "secretary", "treasurer", "member"];
const positionLabels: Record<string, string> = {
  chair: "Mwenyekiti", vice_chair: "Makamu", secretary: "Katibu", treasurer: "Mweka hazina", member: "Mjumbe",
};

export default function CommitteesScreen() {
  const params = useLocalSearchParams<{ eventId?: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("member");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true);
    Promise.all([api.get<CurrentUser>("/users/me"), api.get<EventItem[]>("/events")])
      .then(async ([userResult, eventResult]) => {
        const selected = eventResult.data.find((item) => String(item.id) === params.eventId) ?? eventResult.data[0] ?? null;
        if (!live) return;
        setUserId(userResult.data.id);
        setEvent(selected);
        if (selected) {
          const result = await api.get<Member[]>(`/events/${selected.id}/members`);
          if (live) setMembers(result.data);
        } else setMembers([]);
      })
      .catch(() => { if (live) setError("Imeshindikana kupakia orodha ya kamati."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [params.eventId, reload]));

  const isManager = members.some((member) => member.position === "chair" && member.user_id === userId);
  const addMember = async () => {
    if (!event || !email.trim() || saving) return;
    setSaving(true); setError("");
    try {
      await api.post(`/events/${event.id}/members`, { email: email.trim(), position });
      setEmail("");
      setReload((value) => value + 1);
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(message ?? "Imeshindikana kuongeza mjumbe.");
    } finally { setSaving(false); }
  };

  const removeMember = (member: Member) => {
    if (!event || member.id === 0) return;
    const remove = async () => {
      try { await api.delete(`/events/${event.id}/members/${member.id}`); setMembers((items) => items.filter((item) => item.id !== member.id)); }
      catch { setError("Imeshindikana kumwondoa mjumbe."); }
    };
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (window.confirm(`Unataka kumwondoa ${member.full_name} kwenye kamati?`)) void remove();
      return;
    }
    Alert.alert("Ondoa mjumbe", `Unataka kumwondoa ${member.full_name} kwenye kamati?`, [
      { text: "Ghairi", style: "cancel" }, { text: "Ondoa", style: "destructive", onPress: () => void remove() },
    ]);
  };

  if (loading) return <LoadingState message="Inapakia kamati…" />;
  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>‹  More</Text></Pressable>
      <Text style={styles.title}>Kamati</Text>
      <Text style={styles.subtitle}>{event?.couple_names || event?.name || "Tukio"} · taarifa za tukio hushirikishwa na timu yote.</Text>
      {isManager && <View style={styles.addCard}>
        <Text style={styles.section}>Ongeza mjumbe</Text>
        <Text style={styles.helper}>Tumia barua pepe aliyosajili nayo kwenye app.</Text>
        <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="mfano@email.com" placeholderTextColor={colors.textMuted} style={styles.input} />
        <Text style={styles.helper}>Nafasi ya kamati</Text>
        <View style={styles.positions}>{positions.map((item) => <Pressable key={item} onPress={() => setPosition(item)} style={[styles.position, position === item && styles.positionActive]}><Text style={[styles.positionText, position === item && styles.positionTextActive]}>{positionLabels[item]}</Text></Pressable>)}</View>
        <Pressable disabled={!email.trim() || saving} onPress={() => void addMember()} style={[styles.addButton, (!email.trim() || saving) && styles.disabled]}><Text style={styles.addText}>{saving ? "Inaongeza…" : "+  Ongeza kwenye kamati"}</Text></Pressable>
      </View>}
      <Text style={styles.section}>Uongozi na wajumbe ({members.length})</Text>
      {members.map((member) => <View key={member.id === 0 ? `chair-${member.user_id}` : member.id} style={styles.member}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{member.full_name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()}</Text></View>
        <View style={styles.memberCopy}><Text style={styles.memberName}>{member.full_name}</Text><Text style={styles.memberEmail}>{member.email}</Text></View>
        <View style={styles.role}><Text style={styles.roleText}>{positionLabels[member.position] ?? member.position}</Text></View>
        {isManager && member.id !== 0 && <Pressable accessibilityRole="button" accessibilityLabel={`Ondoa ${member.full_name}`} onPress={() => removeMember(member)} style={styles.remove}><Text style={styles.removeText}>×</Text></Pressable>}
      </View>)}
      {!members.length && <Text style={styles.empty}>Bado hakuna wanakamati walioongezwa.</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!isManager && !!members.length && <Text style={styles.helper}>Mwenyekiti pekee ndiye anayeweza kuongeza au kuondoa wanakamati.</Text>}
      <View style={{ height: 28 }} />
    </ScrollView>
    <WeddingNav active="more" eventId={event?.id} />
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 22, paddingTop: 18, paddingBottom: 24, maxWidth: 620, width: "100%", alignSelf: "center" },
  back: { alignSelf: "flex-start", paddingVertical: 8, paddingRight: 16 }, backText: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  title: { fontFamily: "Georgia", color: colors.text, fontSize: 38, fontWeight: "700", marginTop: 10 }, subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 5, marginBottom: 22 },
  addCard: { borderRadius: 24, padding: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 24 }, section: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: 10 }, helper: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  input: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.background, paddingHorizontal: 15, fontSize: 16, marginVertical: 8 },
  positions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 }, position: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, positionActive: { borderColor: colors.primary, backgroundColor: colors.primary }, positionText: { color: colors.text, fontSize: 13, fontWeight: "700" }, positionTextActive: { color: "#FFFFFF" },
  addButton: { minHeight: 54, borderRadius: 17, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginTop: 10 }, addText: { color: colors.onAccent, fontSize: 16, fontWeight: "800" }, disabled: { opacity: 0.55 },
  member: { minHeight: 78, borderRadius: 19, paddingHorizontal: 12, marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.primary, fontSize: 14, fontWeight: "800" }, memberCopy: { flex: 1 }, memberName: { color: colors.text, fontSize: 15, fontWeight: "800" }, memberEmail: { color: colors.textMuted, fontSize: 12, marginTop: 3 }, role: { borderRadius: 15, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.primarySoft }, roleText: { color: colors.primary, fontSize: 11, fontWeight: "800" }, remove: { width: 28, height: 34, alignItems: "center", justifyContent: "center" }, removeText: { color: colors.danger, fontSize: 24 },
  empty: { color: colors.textMuted, textAlign: "center", padding: 24 }, error: { color: colors.danger, marginTop: 12, fontSize: 14 },
});
