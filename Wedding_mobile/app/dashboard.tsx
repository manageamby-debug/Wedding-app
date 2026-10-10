import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import api from "../src/services/api";
import { colors, fonts } from "../src/constants/theme";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import WeddingNav from "../src/components/WeddingNav";
import ProgressRing from "../src/components/ProgressRing";
import StripedBlock from "../src/components/StripedBlock";
import { useTopPadding } from "../src/hooks/useTopPadding";
import { initials, millions, tzs } from "../src/utils/format";

type WeddingEvent = {
  id: number; name: string; couple_names: string; groom_name: string; bride_name: string;
  event_date: string; event_time: string; venue: string; venue_name: string;
  target_contribution: number | string; status: string;
};
type Summary = {
  event: { id: number }; guests: { total: number };
  rsvp: { attending: number; not_attending: number; maybe: number; no_response: number };
  check_in: { checked_in: number; not_checked_in: number; percentage: number };
  contributions: { contributors: number; total_expected: number; total_paid: number; total_pending: number };
};
type User = { full_name: string };

// The countdown ring fills up over a two-year planning window.
const PLANNING_WINDOW_DAYS = 730;
const dateLabel = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function Dashboard() {
  const topPadding = useTopPadding();
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useFocusEffect(useCallback(() => {
    let live = true;
    setLoading(true); setError(false);
    Promise.all([api.get<User>("/users/me"), api.get<WeddingEvent[]>("/events")])
      .then(async ([userResult, eventResult]) => {
        if (!live) return;
        setUser(userResult.data); setEvents(eventResult.data);
        const results = await Promise.allSettled(eventResult.data.map((event) => api.get<Summary>(`/events/${event.id}/dashboard`).then((r) => r.data)));
        if (live) setSummaries(results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []));
      })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [retry]));

  const event = events.find((item) => item.status === "active" || item.status === "published") ?? events[0];
  const summary = summaries.find((item) => item.event.id === event?.id);
  const daysLeft = event ? Math.max(0, Math.ceil((new Date(`${event.event_date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000)) : 0;
  const ringProgress = Math.min(1, Math.max(0.04, 1 - daysLeft / PLANNING_WINDOW_DAYS));
  const paid = Number(summary?.contributions.total_paid ?? 0);
  const pending = Number(summary?.contributions.total_pending ?? 0);
  const target = Number(event?.target_contribution ?? summary?.contributions.total_expected ?? 0);
  const budgetPercent = target ? Math.min(100, Math.round((paid / target) * 100)) : 0;
  const firstName = useMemo(() => user?.full_name.trim().split(/\s+/)[0] ?? "there", [user]);

  if (loading) return <LoadingState message="Loading your wedding…" />;
  if (error) return <ErrorState message="Unable to load your wedding details." onRetry={() => setRetry((value) => value + 1)} />;
  if (!event) return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.emptyContent}>
        <Text style={styles.eyebrow}>CHEREKO · EVENT PLANNER</Text>
        <Text style={styles.emptyTitle}>Karibu tena, {firstName}</Text>
        <Text style={styles.muted}>Your wedding plans start here.</Text>
        <Pressable style={styles.primary} onPress={() => router.push("/create-event")}><Text style={styles.primaryText}>＋ Create your wedding</Text></Pressable>
      </ScrollView>
      <WeddingNav active="home" />
    </View>
  );

  const coupleName = event.couple_names || event.name;
  const place = event.venue_name || event.venue || "Venue to be confirmed";

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPadding }]} showsVerticalScrollIndicator={false}>
        <View style={styles.greeting}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials(coupleName || "EA")}</Text></View>
          <View style={styles.greetingCopy}>
            <Text style={styles.muted}>Karibu tena</Text>
            <Text numberOfLines={1} style={styles.couple}>{coupleName}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={styles.notification} onPress={() => router.push(`/event/${event.id}`)}>
            <Text style={styles.notificationText}>3</Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push(`/event/${event.id}`)} style={styles.hero}>
          <StripedBlock />
          <View style={styles.photoTag}><Text style={styles.photoTagText}>COUPLE PHOTO</Text></View>
          <View style={styles.ringWrap}>
            <ProgressRing size={162} stroke={9} progress={ringProgress} color={colors.accent} track={colors.ringTrack}>
              <Text style={styles.days}>{daysLeft}</Text>
              <Text style={styles.daysCaption}>DAYS TO GO</Text>
            </ProgressRing>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.eventDate}>{dateLabel(event.event_date)} · {place}</Text>
        </Pressable>

        <View style={styles.statsCard}>
          <Stat value={String(summary?.guests.total ?? 0)} label="Guests" />
          <Stat value={`${millions(paid)}M`} label="Pledged TZS" />
          <Stat value={`${budgetPercent}%`} label="Budget used" last />
        </View>

        <Text style={styles.sectionTitle}>Up next</Text>
        <Task title="Send invitations" date={`${summary?.guests.total ?? 0} guests`} onPress={() => router.push(`/event/invitations?id=${event.id}`)} />
        <Task title="Review contributions" date={summary ? tzs(pending) : "Budget"} onPress={() => router.push(`/event/payment-dashboard?id=${event.id}`)} />
        <Task title="Check-in guests" date={`${summary?.check_in.checked_in ?? 0} checked in`} onPress={() => router.push(`/event/check-in-search?id=${event.id}`)} />

        {events.length > 1 ? (
          <>
            <Text style={styles.sectionTitle}>Your weddings</Text>
            {events.map((item) => (
              <Pressable key={item.id} style={styles.eventCard} onPress={() => router.push(`/event/${item.id}`)}>
                <Text style={styles.eventName}>{item.couple_names || item.name}</Text>
                <Text style={styles.muted}>{dateLabel(item.event_date)} · {item.status}</Text>
              </Pressable>
            ))}
          </>
        ) : null}
        <View style={{ height: 22 }} />
      </ScrollView>
      <WeddingNav active="home" eventId={event.id} />
    </View>
  );
}

function Stat({ value, label, last }: { value: string; label: string; last?: boolean }) {
  return (
    <View style={styles.statWrap}>
      <View style={styles.stat}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      {last ? null : <View style={styles.statDivider} />}
    </View>
  );
}

function Task({ title, date, onPress }: { title: string; date: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.task}>
      <View style={styles.taskDot} />
      <Text style={styles.taskTitle}>{title}</Text>
      <Text style={styles.taskDate}>{date}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 22, paddingBottom: 20, maxWidth: 620, width: "100%", alignSelf: "center" },
  emptyContent: { flexGrow: 1, justifyContent: "center", padding: 28, maxWidth: 620, width: "100%", alignSelf: "center" },

  greeting: { flexDirection: "row", alignItems: "center", gap: 12, height: 46 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  greetingCopy: { flex: 1 },
  muted: { color: colors.textMuted, fontSize: 14 },
  couple: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 1 },
  notification: { width: 46, height: 46, borderRadius: 23, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  notificationText: { color: colors.text, fontSize: 17, fontWeight: "700" },

  hero: { marginTop: 22, height: 268, borderRadius: 28, overflow: "hidden", backgroundColor: colors.heroBase },
  photoTag: { position: "absolute", top: 14, left: 14, borderRadius: 14, backgroundColor: colors.tagBg, paddingVertical: 4, paddingHorizontal: 12 },
  photoTagText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  ringWrap: { position: "absolute", top: 33, left: 0, right: 0, alignItems: "center" },
  days: { color: "#FFFFFF", fontSize: 58, fontFamily: fonts.serif, fontWeight: "700", lineHeight: 66 },
  daysCaption: { color: "#E3E0F2", fontSize: 12, letterSpacing: 2.5, fontWeight: "500", marginTop: -2 },
  eventDate: { position: "absolute", bottom: 22, left: 16, right: 16, color: "#FFFFFF", fontSize: 21, fontFamily: fonts.serif, fontWeight: "700", textAlign: "center" },

  statsCard: { flexDirection: "row", marginTop: 14, height: 80, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  statWrap: { flex: 1, flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
  statDivider: { width: 1, height: 46, backgroundColor: colors.border },
  statValue: { color: colors.text, fontFamily: fonts.serif, fontSize: 26, fontWeight: "700" },
  statLabel: { color: colors.textMuted, fontSize: 13, marginTop: 2, textAlign: "center" },

  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "800", marginTop: 22, marginBottom: 6 },
  task: { height: 45, flexDirection: "row", alignItems: "center", gap: 14 },
  taskDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  taskTitle: { color: colors.text, fontSize: 17, flex: 1 },
  taskDate: { color: colors.textMuted, fontSize: 14 },
  eventCard: { padding: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 20, marginTop: 8 },
  eventName: { color: colors.text, fontSize: 17, fontWeight: "700", marginBottom: 5 },

  eyebrow: { color: colors.accent, fontWeight: "800", letterSpacing: 2, marginBottom: 15 },
  emptyTitle: { color: colors.text, fontFamily: fonts.serif, fontSize: 34, marginBottom: 10 },
  primary: { alignSelf: "stretch", backgroundColor: colors.accent, borderRadius: 27, height: 54, alignItems: "center", justifyContent: "center", marginTop: 28 },
  primaryText: { color: colors.onAccent, fontSize: 17, fontWeight: "800" },
});
