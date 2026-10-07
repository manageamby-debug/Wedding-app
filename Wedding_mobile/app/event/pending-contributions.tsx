import axios from "axios";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import api from "../../src/services/api";
import { colors } from "../../src/constants/theme";

type EventContribution = {
  id: number;
  guest_id: number;
  guest_name: string;
  amount: number | string;
  payment_method: string;
  payment_status: string | null;
  transaction_reference: string | null;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isPositiveId(value: string | undefined): value is string {
  return !!value && /^\d+$/.test(value) && Number(value) >= 1;
}

function formatTsh(amount: number | string): string {
  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount)
    ? `TSh ${numericAmount.toLocaleString("en-TZ", { maximumFractionDigits: 2 })}`
    : `TSh ${amount}`;
}

export default function PendingContributionsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = firstParam(params.id);

  const [pending, setPending] = useState<EventContribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useFocusEffect(useCallback(() => {
    let isActive = true;

    if (!isPositiveId(eventId)) {
      setPending([]);
      setErrorMessage("This event link is invalid. Return to Event Details and try again.");
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    async function loadPending() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await api.get<EventContribution[]>(`/events/${eventId}/contributions`);
        if (!isActive) return;

        setPending(
          response.data.filter(
            (contribution) => (contribution.payment_status ?? "pending").trim().toLowerCase() === "pending",
          ),
        );
      } catch (requestError) {
        if (!isActive) return;

        setPending([]);
        setErrorMessage(
          axios.isAxiosError(requestError) && !requestError.response
            ? "Cannot reach the server. Check that the backend is running."
            : axios.isAxiosError(requestError) && requestError.response?.status === 404
              ? "Event not found, or you do not have access to it."
              : "Could not load pending contributions. Check your connection and try again.",
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadPending();

    return () => {
      isActive = false;
    };
  }, [eventId, retryCount]));

  const totalPending = pending.reduce((total, contribution) => {
    const amount = Number(contribution.amount);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹  Event Details</Text>
          </Pressable>

          <Text style={styles.eyebrow}>PAYMENT VERIFICATION · EVENT #{eventId ?? "—"}</Text>
          <Text style={styles.title}>Pending Contributions</Text>
          <Text style={styles.subtitle}>Contributions that have been recorded but not yet confirmed as paid.</Text>

          {isLoading ? <Text style={styles.message}>Loading pending contributions…</Text> : null}

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
              <View style={styles.summary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Pending</Text>
                  <Text style={styles.summaryValue}>{pending.length}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Amount awaiting confirmation</Text>
                  <Text style={styles.summaryValue}>{formatTsh(totalPending)}</Text>
                </View>
              </View>

              {pending.length === 0 ? (
                <Text style={styles.emptyState}>No pending contributions. Everything recorded has been resolved.</Text>
              ) : null}

              {pending.map((contribution) => (
                <View key={contribution.id} style={styles.contributionCard}>
                  <View style={styles.row}>
                    <Text style={styles.guestName}>{contribution.guest_name}</Text>
                    <Text style={styles.status}>pending</Text>
                  </View>
                  <Text style={styles.amount}>{formatTsh(contribution.amount)}</Text>
                  <Text style={styles.meta}>{contribution.payment_method.replaceAll("_", " ")}</Text>
                  {contribution.transaction_reference ? (
                    <Text style={styles.metaPlain}>Ref: {contribution.transaction_reference}</Text>
                  ) : null}
                  <Pressable
                    accessibilityHint={`Opens the details screen for ${contribution.guest_name}`}
                    accessibilityRole="button"
                    onPress={() => router.push(`/event/guest/${contribution.guest_id}?eventId=${eventId}`)}
                    style={styles.viewButton}
                  >
                    <Text style={styles.viewButtonText}>View Guest</Text>
                  </Pressable>
                </View>
              ))}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "flex-start", padding: 24 },
  card: { width: "100%", maxWidth: 560, padding: 24, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontSize: 26, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 20 },
  message: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  retryButton: { alignSelf: "flex-start", marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, backgroundColor: colors.accentSoft },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryItem: { flexGrow: 1, flexBasis: "40%", minWidth: 130, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.card },
  summaryLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  summaryValue: { color: colors.accent, fontSize: 18, fontWeight: "700", marginTop: 6 },
  emptyState: { color: colors.textMuted, fontSize: 13, lineHeight: 20, paddingVertical: 16 },
  contributionCard: { marginTop: 10, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  guestName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "700" },
  status: { color: colors.accent, fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  amount: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 9 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 7, textTransform: "capitalize" },
  metaPlain: { color: colors.textMuted, fontSize: 12, marginTop: 7 },
  viewButton: { alignSelf: "flex-start", minHeight: 34, justifyContent: "center", marginTop: 12, paddingHorizontal: 11, borderRadius: 9, backgroundColor: colors.accentSoft },
  viewButtonText: { color: colors.accent, fontSize: 12, fontWeight: "700" },
});
