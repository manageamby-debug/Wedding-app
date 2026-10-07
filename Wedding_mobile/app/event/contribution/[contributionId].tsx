import axios from "axios";
import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import api from "../../../src/services/api";
import { colors } from "../../../src/constants/theme";

type EventContribution = {
  id: number;
  guest_id: number;
  guest_name: string;
  amount: number | string;
  payment_method: string;
  payment_status: string | null;
  transaction_reference: string | null;
  paid_at: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  has_payment_proof?: boolean;
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

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB");
}

function formatPaymentMethod(method: string | null): string {
  if (!method) return "Not provided";

  const labels: Record<string, string> = {
    mpesa: "M-Pesa",
    tigopesa: "Tigo Pesa",
    airtel_money: "Airtel Money",
    bank: "Bank",
    cash: "Cash",
  };
  const key = method.trim().toLowerCase();

  return labels[key] ?? method.replaceAll("_", " ");
}

export default function ContributionDetailsScreen() {
  const params = useLocalSearchParams<{ contributionId: string; eventId: string }>();
  const contributionId = firstParam(params.contributionId);
  const eventId = firstParam(params.eventId);

  const [contribution, setContribution] = useState<EventContribution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [reference, setReference] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  useFocusEffect(useCallback(() => {
    let isActive = true;

    if (!isPositiveId(contributionId) || !isPositiveId(eventId)) {
      setContribution(null);
      setErrorMessage("This contribution link is invalid. Return to Pending Contributions and try again.");
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    async function loadContribution() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        // The backend has no "get one contribution" endpoint, so we read the event's
        // contribution list and pick the one we need.
        const response = await api.get<EventContribution[]>(`/events/${eventId}/contributions`);
        if (!isActive) return;

        const found = response.data.find((item) => item.id === Number(contributionId)) ?? null;
        console.log("Contribution details:", found);
        setContribution(found);
        setReference(found?.transaction_reference ?? "");
        setErrorMessage(found ? "" : "Contribution not found in this event.");
      } catch (requestError) {
        if (!isActive) return;

        setContribution(null);
        setErrorMessage(
          axios.isAxiosError(requestError) && !requestError.response
            ? "Cannot reach the server. Check that the backend is running."
            : axios.isAxiosError(requestError) && requestError.response?.status === 404
              ? "Event not found, or you do not have access to it."
              : "Could not load this contribution. Check your connection and try again.",
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadContribution();

    return () => {
      isActive = false;
    };
  }, [contributionId, eventId, retryCount]));

  async function performMarkAsPaid() {
    if (isSaving || !isPositiveId(contributionId)) return;

    setIsSaving(true);
    setActionError("");

    try {
      // The backend replaces the stored reference with whatever we send, so the
      // field is pre-filled with the existing reference to avoid wiping it.
      const response = await api.post<EventContribution>(`/contributions/${contributionId}/confirm`, {
        transaction_reference: reference.trim() || null,
      });

      console.log("Contribution marked as paid:", response.data);
      setContribution((current) => (current ? { ...current, ...response.data } : current));
    } catch (requestError) {
      const isApiError = axios.isAxiosError<{ detail?: unknown }>(requestError);
      const detail = isApiError ? requestError.response?.data?.detail : undefined;

      console.error("Mark as paid failed:", isApiError ? requestError.response?.status : requestError);
      setActionError(
        isApiError && !requestError.response
          ? "Cannot reach the server. Check that the backend is running."
          : isApiError && requestError.response?.status === 409
            ? "This contribution is already marked as paid. Go back and reopen it to refresh."
            : typeof detail === "string"
              ? detail
              : "Could not mark this contribution as paid. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function confirmMarkAsPaid() {
    if (isSaving || !contribution) return;

    const message = `Confirm that you have received ${formatTsh(contribution.amount)} from ${contribution.guest_name}. It will be counted as paid in the event totals.`;

    if (Platform.OS === "web") {
      if (window.confirm(`Mark as Paid\n\n${message}`)) void performMarkAsPaid();
      return;
    }

    Alert.alert("Mark as Paid", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm payment", onPress: () => void performMarkAsPaid() },
    ]);
  }

  const status = (contribution?.payment_status ?? "").trim().toLowerCase() || "pending";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹  Back</Text>
          </Pressable>

          <Text style={styles.eyebrow}>CONTRIBUTION · #{contributionId ?? "—"}</Text>
          <Text style={styles.title}>Contribution Details</Text>

          {isLoading ? <Text style={styles.message}>Loading contribution…</Text> : null}

          {!isLoading && errorMessage ? (
            <View>
              <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text>
              {isPositiveId(contributionId) && isPositiveId(eventId) ? (
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

          {contribution ? (
            <>
              <Text style={styles.amount}>{formatTsh(contribution.amount)}</Text>
              <View style={[styles.badge, getBadgeStyle(status)]}>
                <Text style={[styles.badgeText, getBadgeTextStyle(status)]}>{status.replaceAll("_", " ")}</Text>
              </View>

              <View style={styles.details}>
                <DetailRow label="Contribution ID" value={String(contribution.id)} />
                <DetailRow label="Event ID" value={String(eventId)} />
                <DetailRow label="Guest" value={contribution.guest_name} />
                <DetailRow label="Payment method" value={formatPaymentMethod(contribution.payment_method)} />
                <DetailRow label="Reference" value={contribution.transaction_reference || "Not provided"} />
                <DetailRow label="Payment proof" value={contribution.has_payment_proof ? "Uploaded" : "Not uploaded"} />
                <DetailRow label="Paid at" value={formatDateTime(contribution.paid_at)} />
                {contribution.rejection_reason ? (
                  <>
                    <DetailRow label="Rejection reason" value={contribution.rejection_reason} />
                    <DetailRow label="Rejected at" value={formatDateTime(contribution.rejected_at)} last />
                  </>
                ) : (
                  <DetailRow label="Status" value={status.replaceAll("_", " ")} capitalize last />
                )}
              </View>

              {status !== "paid" && status !== "confirmed" && isPositiveId(eventId) ? (
                <Pressable
                  accessibilityHint="Opens the form to enter or update the payment method and transaction reference"
                  accessibilityRole="button"
                  onPress={() => router.push({
                    pathname: "/event/contribution/payment",
                    params: { contributionId: String(contribution.id), eventId },
                  })}
                  style={({ pressed }) => [styles.paymentButton, pressed && styles.pressed]}
                >
                  <Text style={styles.paymentButtonText}>
                    {contribution.transaction_reference ? "Update Payment Details" : "Submit Payment"}
                  </Text>
                </Pressable>
              ) : null}

              {status === "pending" ? (
                <View style={styles.verifyBlock}>
                  <Text style={styles.inputLabel}>TRANSACTION REFERENCE · OPTIONAL</Text>
                  <TextInput
                    accessibilityLabel="Transaction reference, optional"
                    autoCapitalize="characters"
                    editable={!isSaving}
                    onChangeText={setReference}
                    placeholder="e.g. M-Pesa or bank reference"
                    placeholderTextColor="#827C76"
                    style={styles.input}
                    value={reference}
                  />
                  {actionError ? (
                    <Text accessibilityLiveRegion="polite" style={styles.actionError}>{actionError}</Text>
                  ) : null}
                  <Pressable
                    accessibilityHint="Asks for confirmation, then records this contribution as paid"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isSaving }}
                    disabled={isSaving}
                    onPress={confirmMarkAsPaid}
                    style={({ pressed }) => [styles.markPaidButton, pressed && styles.pressed, isSaving && styles.disabledButton]}
                  >
                    <Text style={styles.markPaidText}>{isSaving ? "Marking as paid…" : "Mark as Paid"}</Text>
                  </Pressable>
                </View>
              ) : null}

              <Pressable
                accessibilityHint={`Opens the details screen for ${contribution.guest_name}`}
                accessibilityRole="button"
                onPress={() => router.push(`/event/guest/${contribution.guest_id}?eventId=${eventId}`)}
                style={styles.guestButton}
              >
                <Text style={styles.guestButtonText}>View Guest</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({
  label,
  value,
  last = false,
  capitalize = false,
}: {
  label: string;
  value: string;
  last?: boolean;
  capitalize?: boolean;
}) {
  return (
    <View style={[styles.detailRow, last && styles.lastRow]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, capitalize && styles.capitalize]}>{value}</Text>
    </View>
  );
}

function getBadgeStyle(status: string) {
  if (status === "paid" || status === "confirmed") return styles.paidBadge;
  if (status === "failed" || status === "rejected") return styles.failedBadge;
  return styles.pendingBadge;
}

function getBadgeTextStyle(status: string) {
  if (status === "paid" || status === "confirmed") return styles.paidText;
  if (status === "failed" || status === "rejected") return styles.failedText;
  return styles.pendingText;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "flex-start", padding: 24 },
  card: { width: "100%", maxWidth: 560, padding: 24, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontSize: 26, fontWeight: "700", marginBottom: 20 },
  message: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  retryButton: { alignSelf: "flex-start", marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, backgroundColor: colors.accentSoft },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  amount: { color: colors.text, fontSize: 28, fontWeight: "700" },
  badge: { alignSelf: "flex-start", marginTop: 12, marginBottom: 20, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  pendingBadge: { backgroundColor: colors.accentSoft },
  paidBadge: { backgroundColor: "#153126" },
  failedBadge: { backgroundColor: "#351F1D" },
  pendingText: { color: colors.accent },
  paidText: { color: colors.success },
  failedText: { color: colors.danger },
  details: { borderTopWidth: 1, borderTopColor: colors.border },
  detailRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { flexShrink: 1, color: colors.text, fontSize: 14, textAlign: "right" },
  capitalize: { textTransform: "capitalize" },
  verifyBlock: { marginTop: 20 },
  inputLabel: { color: "#D3C8B9", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: "#3B3531", borderRadius: 11, backgroundColor: "rgba(255,255,255,0.035)", color: colors.text, paddingHorizontal: 14, fontSize: 14, marginBottom: 14 },
  actionError: { color: colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  markPaidButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  markPaidText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabledButton: { opacity: 0.55 },
  guestButton: { alignSelf: "flex-start", minHeight: 40, justifyContent: "center", marginTop: 20, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.accentSoft },
  guestButtonText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  paymentButton: { minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 18, borderRadius: 11, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentSoft },
  paymentButtonText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
});
