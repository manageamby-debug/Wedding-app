import axios from "axios";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import api from "../../src/services/api";
import { colors } from "../../src/constants/theme";

type EventContribution = {
  id: number;
  guest_id: number;
  amount: number | string;
  payment_status: string | null;
};

type EventTarget = {
  target_contribution: number | string;
};

type Tone = "accent" | "success" | "danger" | "info";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isPositiveId(value: string | undefined): value is string {
  return !!value && /^\d+$/.test(value) && Number(value) >= 1;
}

function formatTsh(amount: number): string {
  return `TSh ${amount.toLocaleString("en-TZ", { maximumFractionDigits: 2 })}`;
}

function toAmount(value: number | string): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function getStatus(contribution: EventContribution): "paid" | "pending" | "rejected" {
  const status = (contribution.payment_status ?? "").trim().toLowerCase() || "pending";

  if (status === "paid" || status === "confirmed") return "paid";
  if (status === "rejected" || status === "failed") return "rejected";
  return "pending";
}

function toneColor(tone: Tone): string {
  if (tone === "success") return colors.success;
  if (tone === "danger") return colors.danger;
  if (tone === "info") return colors.info;
  return colors.accent;
}

export default function PaymentDashboardScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = firstParam(params.id);

  const [contributions, setContributions] = useState<EventContribution[]>([]);
  const [target, setTarget] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useFocusEffect(useCallback(() => {
    let isActive = true;

    if (!isPositiveId(eventId)) {
      setContributions([]);
      setErrorMessage("This event link is invalid. Return to Event Details and try again.");
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [contributionsResponse, eventResponse] = await Promise.all([
          api.get<EventContribution[]>(`/events/${eventId}/contributions`),
          api.get<EventTarget>(`/events/${eventId}`),
        ]);
        if (!isActive) return;

        setContributions(contributionsResponse.data);
        setTarget(toAmount(eventResponse.data.target_contribution));
      } catch (requestError) {
        if (!isActive) return;

        setContributions([]);
        setErrorMessage(
          axios.isAxiosError(requestError) && !requestError.response
            ? "Cannot reach the server. Check that the backend is running."
            : axios.isAxiosError(requestError) && requestError.response?.status === 404
              ? "Event not found, or you do not have access to it."
              : "Could not load the payment dashboard. Check your connection and try again.",
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [eventId, retryCount]));

  const totals = { paid: 0, pending: 0, rejected: 0 };
  const counts = { paid: 0, pending: 0, rejected: 0 };
  const contributorIds = new Set<number>();
  const paidContributorIds = new Set<number>();

  for (const contribution of contributions) {
    const status = getStatus(contribution);

    totals[status] += toAmount(contribution.amount);
    counts[status] += 1;
    contributorIds.add(contribution.guest_id);
    if (status === "paid") paidContributorIds.add(contribution.guest_id);
  }

  // "Total collected" is money confirmed as received. Rejected payments are
  // shown separately and never counted as collected.
  const totalRecorded = totals.paid + totals.pending + totals.rejected;
  const progress = target > 0 ? Math.min(100, Math.round((totals.paid / target) * 100)) : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹  Event Details</Text>
          </Pressable>

          <Text style={styles.eyebrow}>PAYMENTS · EVENT #{eventId ?? "—"}</Text>
          <Text style={styles.title}>Payment Dashboard</Text>
          <Text style={styles.subtitle}>Money collected, waiting for confirmation, and rejected for this event.</Text>

          {isLoading ? <Text style={styles.message}>Loading payment dashboard…</Text> : null}

          {!isLoading && errorMessage ? (
            <View>
              <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text>
              {isPositiveId(eventId) ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRetryCount((count) => count + 1)}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <View style={styles.heroCard}>
                <Text style={styles.metricLabel}>TOTAL COLLECTED</Text>
                <Text style={styles.heroValue}>{formatTsh(totals.paid)}</Text>
                {target > 0 ? (
                  <>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.metricHint}>
                      {progress}% of the {formatTsh(target)} target · {formatTsh(Math.max(target - totals.paid, 0))} remaining
                    </Text>
                  </>
                ) : (
                  <Text style={styles.metricHint}>No contribution target set for this event</Text>
                )}
              </View>

              <View style={styles.grid}>
                <Metric label="Paid" value={formatTsh(totals.paid)} hint={`${counts.paid} confirmed`} tone="success" />
                <Metric label="Pending" value={formatTsh(totals.pending)} hint={`${counts.pending} awaiting`} tone="accent" />
                <Metric label="Rejected" value={formatTsh(totals.rejected)} hint={`${counts.rejected} rejected`} tone="danger" />
                <Metric label="Total recorded" value={formatTsh(totalRecorded)} hint={`${contributions.length} contributions`} tone="info" />
                <Metric
                  label="Contributors"
                  value={String(contributorIds.size)}
                  hint={`${paidContributorIds.size} with a paid contribution`}
                  tone="accent"
                />
              </View>

              {contributions.length === 0 ? (
                <Text style={styles.emptyState}>No contributions recorded yet.</Text>
              ) : null}

              {counts.pending > 0 && isPositiveId(eventId) ? (
                <Pressable
                  accessibilityHint="Opens the contributions that still need to be confirmed or rejected"
                  accessibilityRole="button"
                  onPress={() => router.push(`/event/pending-contributions?id=${eventId}`)}
                  style={styles.pendingButton}
                >
                  <Text style={styles.pendingButtonText}>Review {counts.pending} Pending Contribution{counts.pending === 1 ? "" : "s"}</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: Tone }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricAccent, { backgroundColor: toneColor(tone) }]} />
      <Text style={styles.metricLabelSmall}>{label}</Text>
      <Text style={[styles.metricValue, { color: toneColor(tone) }]}>{value}</Text>
      <Text style={styles.metricHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "flex-start", padding: 24 },
  card: { width: "100%", maxWidth: 620, padding: 24, borderRadius: 26, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontFamily: "Georgia", fontSize: 36, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 20 },
  message: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  retryButton: { alignSelf: "flex-start", marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, backgroundColor: colors.accentSoft },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  heroCard: { padding: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card },
  metricLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  heroValue: { color: colors.success, fontSize: 28, fontWeight: "700", marginTop: 8 },
  track: { height: 8, marginTop: 14, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.success },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  metric: { position: "relative", flexGrow: 1, flexBasis: "45%", minHeight: 100, justifyContent: "center", overflow: "hidden", paddingVertical: 13, paddingLeft: 16, paddingRight: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.card },
  metricAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  metricLabelSmall: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  metricValue: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  metricHint: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 6 },
  emptyState: { color: colors.textMuted, fontSize: 13, lineHeight: 20, paddingVertical: 16 },
  pendingButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 16, borderWidth: 1, borderColor: colors.accent, borderRadius: 11, backgroundColor: colors.accentSoft },
  pendingButtonText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
});
