import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import api from "../src/services/api";
import { colors, fonts } from "../src/constants/theme";
import WeddingNav from "../src/components/WeddingNav";
import Icon from "../src/components/Icon";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import { useTopPadding } from "../src/hooks/useTopPadding";
import { initials } from "../src/utils/format";

type Event = { id: number; status: string };
type Guest = {
  id: number; full_name: string; guest_code: string; phone?: string | null; check_in_status?: string | null;
  category?: string | null; table_number?: number | string | null; table_name?: string | null;
};
type RSVP = { guest_id: number; status: string };
type Status = "Going" | "Pending" | "Declined";

const statusOf = (rsvp: string): Status => rsvp === "attending" ? "Going" : rsvp === "not_attending" ? "Declined" : "Pending";
const tableOf = (guest: Guest) => guest.table_name || (guest.table_number != null && guest.table_number !== "" ? `Table ${guest.table_number}` : null);
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function GuestsScreen() {
  const topPadding = useTopPadding();
  const [event, setEvent] = useState<Event | null>(null); const [guests, setGuests] = useState<Guest[]>([]); const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true); const [failed, setFailed] = useState(false); const [retry, setRetry] = useState(0);
  const [byTable, setByTable] = useState(false); const [searching, setSearching] = useState(false); const [query, setQuery] = useState("");

  useFocusEffect(useCallback(() => {
    let live = true; setLoading(true); setFailed(false);
    api.get<Event[]>("/events").then(async (res) => {
      const selected = res.data.find((item) => item.status === "active" || item.status === "published") ?? res.data[0];
      if (!selected) { if (live) { setEvent(null); setGuests([]); } return; }
      const [guestRes, rsvpRes] = await Promise.all([
        api.get<Guest[]>(`/events/${selected.id}/guest`),
        api.get<RSVP[]>(`/events/${selected.id}/rsvps`).catch(() => ({ data: [] as RSVP[] })),
      ]);
      if (live) { setEvent(selected); setGuests(guestRes.data); setRsvps(rsvpRes.data); }
    }).catch(() => { if (live) setFailed(true); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [retry]));

  const rows = useMemo(() => guests.map((guest) => {
    const rsvp = rsvps.find((item) => item.guest_id === guest.id)?.status ?? "pending";
    return { guest, status: statusOf(rsvp) };
  }), [guests, rsvps]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term ? rows.filter(({ guest }) => guest.full_name.toLowerCase().includes(term) || guest.guest_code.toLowerCase().includes(term)) : rows;
    const order: Record<Status, number> = { Going: 0, Pending: 1, Declined: 2 };
    return [...filtered].sort((a, b) => order[a.status] - order[b.status]);
  }, [rows, query]);

  const groups = useMemo(() => {
    if (!byTable) return [{ title: "Confirmed", count: rows.filter((row) => row.status === "Going").length, items: visible }];
    const map = new Map<string, typeof visible>();
    visible.forEach((row) => { const key = tableOf(row.guest) ?? "No table"; map.set(key, [...(map.get(key) ?? []), row]); });
    return [...map.entries()].map(([title, items]) => ({ title, count: items.length, items }));
  }, [byTable, rows, visible]);

  if (loading) return <LoadingState message="Loading your guest list…" />;
  if (failed) return <ErrorState message="Could not load the guest list." onRetry={() => setRetry((value) => value + 1)} />;

  const total = guests.length;
  const going = rows.filter((row) => row.status === "Going").length;
  const declined = rows.filter((row) => row.status === "Declined").length;
  const pending = total - going - declined;

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPadding }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Guests</Text>
          <View style={styles.headerButtons}>
            <Pressable accessibilityRole="button" accessibilityLabel="Search guests" style={styles.round} onPress={() => { setSearching((value) => !value); setQuery(""); }}>
              <Icon name="search" color={colors.text} size={20} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Add guest" style={styles.add} onPress={() => event && router.push(`/event/${event.id}/add-guest`)}>
              <Icon name="plus" color={colors.onAccent} size={22} strokeWidth={2.6} />
            </Pressable>
          </View>
        </View>

        {!event ? (
          <Pressable style={styles.empty} onPress={() => router.push("/create-event")}>
            <Text style={styles.emptyTitle}>Start your guest list</Text>
            <Text style={styles.muted}>Create a wedding event to add guests.</Text>
          </Pressable>
        ) : (
          <>
            <View style={styles.summary}>
              <View style={styles.summaryLine}><Text style={styles.count}>{going}</Text><Text style={styles.summaryText}> of {total} confirmed</Text></View>
              <View style={styles.progress}>
                {going > 0 ? <View style={{ flex: going, backgroundColor: colors.primary }} /> : null}
                {pending > 0 ? <View style={{ flex: pending, backgroundColor: colors.accent }} /> : null}
                {declined > 0 ? <View style={{ flex: declined, backgroundColor: colors.chart[3] }} /> : null}
              </View>
            </View>

            <View style={styles.segment}>
              <Pressable onPress={() => setByTable(false)} style={[styles.segmentButton, !byTable && styles.segmentActive]}><Text style={[styles.segmentText, !byTable && styles.segmentTextActive]}>By status</Text></Pressable>
              <Pressable onPress={() => setByTable(true)} style={[styles.segmentButton, byTable && styles.segmentActive]}><Text style={[styles.segmentText, byTable && styles.segmentTextActive]}>By table</Text></Pressable>
            </View>

            {searching ? (
              <TextInput value={query} onChangeText={setQuery} autoFocus placeholder="Search by name or code" placeholderTextColor={colors.textMuted} style={styles.search} />
            ) : null}

            {groups.map((group) => (
              <View key={group.title}>
                <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{group.title}</Text><Text style={styles.sectionCount}>{group.count}</Text></View>
                <View style={styles.list}>
                  {group.items.map(({ guest, status }, index) => {
                    const detail = [guest.category ? capitalize(guest.category) : null, tableOf(guest)].filter(Boolean).join(" · ");
                    const tone = status === "Going" ? styles.going : status === "Declined" ? styles.declined : styles.pending;
                    return (
                      <Pressable key={guest.id} onPress={() => router.push(`/event/guest/${guest.id}?eventId=${event.id}`)} style={[styles.row, index === group.items.length - 1 && styles.lastRow]}>
                        <View style={styles.initials}><Text style={styles.initialText}>{initials(guest.full_name)}</Text></View>
                        <View style={styles.guestInfo}>
                          <Text numberOfLines={1} style={styles.guestName}>{guest.full_name}</Text>
                          <Text numberOfLines={1} style={styles.muted}>{detail || guest.phone || `Code ${guest.guest_code}`}</Text>
                        </View>
                        <Text style={[styles.badge, tone]}>{status}</Text>
                      </Pressable>
                    );
                  })}
                  {group.items.length === 0 ? (
                    <Pressable onPress={() => router.push(`/event/${event.id}/add-guest`)} style={styles.emptyInside}>
                      <Text style={styles.emptyTitle}>{query ? "No matching guests" : "No guests yet"}</Text>
                      {query ? null : <Text style={styles.muted}>Tap + to add the first guest.</Text>}
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
      <WeddingNav active="guests" eventId={event?.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 22, paddingBottom: 15, maxWidth: 620, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 46 },
  title: { color: colors.text, fontFamily: fonts.serif, fontSize: 34, fontWeight: "700" },
  headerButtons: { flexDirection: "row", gap: 10 },
  round: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  add: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },

  summary: { marginTop: 20, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, paddingHorizontal: 19, paddingTop: 22, paddingBottom: 20 },
  summaryLine: { flexDirection: "row", alignItems: "baseline" },
  count: { fontFamily: fonts.serif, fontSize: 40, color: colors.text, fontWeight: "700" },
  summaryText: { fontSize: 15, color: colors.textMuted },
  progress: { height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: "hidden", marginTop: 14, flexDirection: "row" },

  segment: { flexDirection: "row", backgroundColor: colors.segmentBg, borderRadius: 24, padding: 4, marginTop: 16, height: 46 },
  segmentButton: { flex: 1, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: colors.segmentActive },
  segmentText: { fontSize: 15, color: colors.textMuted, fontWeight: "600" },
  segmentTextActive: { color: colors.text, fontWeight: "700" },
  search: { marginTop: 12, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 18, color: colors.text, fontSize: 15 },

  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 11, paddingHorizontal: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  sectionCount: { color: colors.textMuted, fontSize: 15 },
  list: { borderWidth: 1, borderColor: colors.border, borderRadius: 24, backgroundColor: colors.surface, overflow: "hidden" },
  row: { height: 65, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12, borderBottomWidth: 1, borderColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  initials: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  initialText: { color: colors.link, fontSize: 14, fontWeight: "800" },
  guestInfo: { flex: 1 },
  guestName: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 1 },
  muted: { fontSize: 14, color: colors.textMuted },
  badge: { overflow: "hidden", paddingHorizontal: 12, paddingVertical: 4, lineHeight: 18, borderRadius: 13, fontSize: 14, fontWeight: "700" },
  going: { backgroundColor: colors.successSoft, color: colors.success },
  pending: { backgroundColor: colors.warningSoft, color: colors.warning },
  declined: { backgroundColor: colors.dangerSoft, color: colors.onDangerSoft },
  empty: { padding: 22, alignItems: "center", backgroundColor: colors.surface, borderRadius: 24, borderColor: colors.border, borderWidth: 1, marginTop: 20 },
  emptyInside: { padding: 22, alignItems: "center" },
  emptyTitle: { fontSize: 17, color: colors.text, fontWeight: "800", marginBottom: 6 },
});
