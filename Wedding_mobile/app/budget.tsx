import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import api from "../src/services/api";
import { colors, fonts } from "../src/constants/theme";
import WeddingNav from "../src/components/WeddingNav";
import ProgressRing from "../src/components/ProgressRing";
import Icon from "../src/components/Icon";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import { useTopPadding } from "../src/hooks/useTopPadding";
import { millions, tzs } from "../src/utils/format";

type Event = { id: number; target_contribution: number | string };
type Contribution = { id: number; amount: number | string; payment_status?: string | null };

// The backend has no budget categories yet, so these are an indicative split of the
// total budget (share of total) with a typical spend level per category.
const categories = [
  { label: "Venue", share: 4 / 18, spent: 0.875 },
  { label: "Catering", share: 6 / 18, spent: 0.7 },
  { label: "Decor", share: 2.5 / 18, spent: 0.44 },
  { label: "Photography", share: 1.5 / 18, spent: 0.467 },
];

export default function BudgetScreen() {
  const topPadding = useTopPadding();
  const [event, setEvent] = useState<Event | null>(null); const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let live = true; setLoading(true); setError(false);
    api.get<Event[]>("/events").then(async (response) => {
      const selected = response.data[0];
      if (!selected) { if (live) setEvent(null); return; }
      const data = await api.get<Contribution[]>(`/events/${selected.id}/contributions`);
      if (live) { setEvent(selected); setContributions(data.data); }
    }).catch(() => { if (live) setError(true); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [retry]));

  if (loading) return <LoadingState message="Loading your budget…" />;
  if (error) return <ErrorState message="Could not load your budget." onRetry={() => setRetry((value) => value + 1)} />;

  const paid = contributions.filter((item) => ["paid", "confirmed"].includes((item.payment_status ?? "").toLowerCase())).reduce((sum, item) => sum + Number(item.amount), 0);
  const target = Number(event?.target_contribution ?? 0);
  const percent = target ? Math.min(100, Math.round((paid / target) * 100)) : 0;

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPadding }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Budget</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Add contribution" style={styles.add} onPress={() => event && router.push(`/event/${event.id}/add-contribution`)}>
            <Icon name="plus" color={colors.onAccent} size={22} strokeWidth={2.6} />
          </Pressable>
        </View>

        {!event ? (
          <Pressable style={styles.empty} onPress={() => router.push("/create-event")}><Text style={styles.heading}>Create your wedding first</Text></Pressable>
        ) : (
          <>
            <View style={styles.segment}>
              <View style={[styles.segmentButton, styles.segmentActive]}><Text style={[styles.segmentText, styles.segmentTextActive]}>Categories</Text></View>
              <Pressable style={styles.segmentButton} onPress={() => router.push(`/event/payment-dashboard?id=${event.id}`)}><Text style={styles.segmentText}>Analytics</Text></Pressable>
            </View>

            <View style={styles.overview}>
              <ProgressRing size={132} stroke={16} progress={percent / 100} color={colors.chart[0]} track={colors.border}>
                <Text style={styles.percent}>{percent}%</Text>
                <Text style={styles.spentLabel}>spent</Text>
              </ProgressRing>
              <View style={styles.totals}>
                <Text style={styles.muted}>Total budget</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.total}>{tzs(target)}</Text>
                <Text style={[styles.muted, { marginTop: 10 }]}>Remaining</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.remaining}>{tzs(Math.max(0, target - paid))}</Text>
              </View>
            </View>

            <Pressable onPress={() => router.push(`/event/payment-dashboard?id=${event.id}`)} style={styles.card}>
              {categories.map((item, index) => {
                const color = colors.chart[index];
                const allocated = target * item.share;
                return (
                  <View key={item.label} style={[styles.category, index === categories.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <View style={styles.catContent}>
                      <View style={styles.catRow}>
                        <Text style={styles.catName}>{item.label}</Text>
                        <Text style={styles.catAmount}>{millions(allocated * item.spent)}M / {millions(allocated)}M</Text>
                      </View>
                      <View style={styles.track}><View style={{ height: "100%", width: `${Math.round(item.spent * 100)}%`, backgroundColor: color, borderRadius: 3 }} /></View>
                    </View>
                  </View>
                );
              })}
            </Pressable>
          </>
        )}
      </ScrollView>
      <WeddingNav active="budget" eventId={event?.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 22, paddingBottom: 20, maxWidth: 620, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 46 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.text, fontWeight: "700" },
  add: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },

  segment: { backgroundColor: colors.segmentBg, borderRadius: 24, padding: 4, flexDirection: "row", height: 46, marginTop: 20 },
  segmentButton: { flex: 1, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: colors.segmentActive },
  segmentText: { fontSize: 15, color: colors.textMuted, fontWeight: "600" },
  segmentTextActive: { color: colors.text, fontWeight: "700" },

  overview: { flexDirection: "row", alignItems: "center", gap: 28, marginVertical: 26 },
  percent: { fontFamily: fonts.serif, fontSize: 30, color: colors.text, fontWeight: "700", lineHeight: 34 },
  spentLabel: { color: colors.textMuted, fontSize: 13 },
  muted: { color: colors.textMuted, fontSize: 14 },
  totals: { flex: 1 },
  total: { fontFamily: fonts.serif, fontSize: 27, color: colors.text, fontWeight: "700" },
  remaining: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 2 },

  card: { borderRadius: 24, overflow: "hidden", borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface },
  category: { height: 60, borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { height: 12, width: 12, borderRadius: 6 },
  catContent: { flex: 1 },
  catRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  catName: { fontSize: 17, color: colors.text, fontWeight: "700" },
  catAmount: { fontSize: 14, color: colors.textMuted },
  track: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" },

  empty: { padding: 24, backgroundColor: colors.surface, borderRadius: 24, marginTop: 20 },
  heading: { color: colors.text, fontSize: 20, fontWeight: "700" },
});
