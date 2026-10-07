import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import LoadingState from "../../../components/LoadingState";
import api from "../../../src/services/api";
import { getToken } from "../../../src/services/auth";
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
  const [hasLoadError, setHasLoadError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [reference, setReference] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [proofFailed, setProofFailed] = useState(false);
  const [proofVersion, setProofVersion] = useState(0);

  const hasProof = !!contribution?.has_payment_proof;

  // The proof endpoint is private (needs the organizer's login token), so the image
  // request must carry the Authorization header.
  useEffect(() => {
    if (!hasProof) return;

    let isActive = true;
    setProofFailed(false);
    void getToken().then((token) => {
      if (isActive) setAuthToken(token);
    });

    return () => {
      isActive = false;
    };
  }, [hasProof]);

  useFocusEffect(useCallback(() => {
    let isActive = true;

    if (!isPositiveId(contributionId) || !isPositiveId(eventId)) {
      setContribution(null);
      setHasLoadError(true);
      setErrorMessage("This contribution link is invalid. Return to Pending Contributions and try again.");
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    async function loadContribution() {
      setIsLoading(true);
      setHasLoadError(false);
      setErrorMessage("");

      try {
        // The backend has no "get one contribution" endpoint, so we read the event's
        // contribution list and pick the one we need.
        const response = await api.get<EventContribution[]>(`/events/${eventId}/contributions`);
        if (!isActive) return;

        const found = response.data.find((item) => item.id === Number(contributionId)) ?? null;
        console.log("Contribution details:", found);
        setContribution(found);
        setHasLoadError(false);
        setProofVersion((version) => version + 1);
        setReference(found?.transaction_reference ?? "");
        setErrorMessage(found ? "" : "Contribution not found in this event.");
      } catch (requestError) {
        if (!isActive) return;

        setContribution(null);
        setHasLoadError(true);
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

  function retryLoadContribution() {
    setIsLoading(true);
    setHasLoadError(false);
    setErrorMessage("");
    setRetryCount((count) => count + 1);
  }

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
      if (Platform.OS === "web") {
        window.alert("Success\n\nPayment has been marked as paid.");
      } else {
        Alert.alert("Success", "Payment has been marked as paid.");
      }
    } catch (requestError) {
      const isApiError = axios.isAxiosError<{ detail?: unknown }>(requestError);
      const detail = isApiError ? requestError.response?.data?.detail : undefined;

      console.error("Mark as paid failed:", isApiError ? requestError.response?.status : requestError);
      const message =
        isApiError && !requestError.response
          ? "Cannot reach the server. Check that the backend is running."
          : isApiError && requestError.response?.status === 409
            ? "This contribution is already marked as paid. Go back and reopen it to refresh."
            : typeof detail === "string"
              ? detail
              : "Failed to mark payment as paid. Please try again.";
      setActionError(message);
      if (Platform.OS !== "web") Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  }

  function confirmMarkAsPaid() {
    if (isSaving || !contribution) return;

    const message = `Are you sure this payment has been verified?\n\n${formatTsh(contribution.amount)} from ${contribution.guest_name}.`;

    if (Platform.OS === "web") {
      if (window.confirm(`Confirm Payment\n\n${message}`)) void performMarkAsPaid();
      return;
    }

    Alert.alert("Confirm Payment", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Yes, Mark as Paid", onPress: () => void performMarkAsPaid() },
    ]);
  }

  async function performReject(reason: string) {
    if (isSaving || !isPositiveId(contributionId)) return;

    setIsSaving(true);
    setRejectError("");

    try {
      // The backend has a dedicated reject endpoint that requires a reason and
      // sets the status to "rejected" itself.
      const response = await api.post<EventContribution>(`/contributions/${contributionId}/reject`, {
        rejection_reason: reason,
      });

      console.log("Contribution rejected:", response.data);
      setContribution((current) => (current ? { ...current, ...response.data } : current));
      setRejectReason("");
      setShowRejectModal(false);
    } catch (requestError) {
      const isApiError = axios.isAxiosError<{ detail?: unknown }>(requestError);
      const detail = isApiError ? requestError.response?.data?.detail : undefined;

      console.error("Reject payment failed:", isApiError ? requestError.response?.status : requestError);
      setRejectError(
        isApiError && !requestError.response
          ? "Cannot reach the server. Check that the backend is running."
          : typeof detail === "string"
            ? detail
            : "Could not reject this payment. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function openRejectModal() {
    if (isSaving) return;

    setRejectReason("");
    setRejectError("");
    setShowRejectModal(true);
  }

  function closeRejectModal() {
    if (isSaving) return;

    setShowRejectModal(false);
    setRejectReason("");
    setRejectError("");
  }

  function submitReject() {
    if (isSaving || !contribution) return;

    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError("Please enter a reason for rejecting this payment.");
      return;
    }

    void performReject(reason);
  }

  const status = (contribution?.payment_status ?? "").trim().toLowerCase() || "pending";

  if (isLoading) {
    return <LoadingState message="Loading payment..." />;
  }

  if (hasLoadError) {
    return (
      <ErrorState
        message={errorMessage || "Unable to load payment details."}
        onRetry={isPositiveId(contributionId) && isPositiveId(eventId) ? retryLoadContribution : undefined}
      />
    );
  }

  if (!contribution) {
    return (
      <EmptyState
        title="Payment Not Found"
        message="This contribution could not be found."
        buttonTitle="Go Back"
        onPress={() => router.back()}
      />
    );
  }

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

          {contribution ? (
            <>
              <Text style={styles.amount}>{formatTsh(contribution.amount)}</Text>
              <View style={[styles.badge, getBadgeStyle(status)]}>
                <Text style={[styles.badgeText, getBadgeTextStyle(status)]}>{getStatusLabel(status)}</Text>
              </View>

              <View style={styles.details}>
                <DetailRow label="Contribution ID" value={String(contribution.id)} />
                <DetailRow label="Event ID" value={String(eventId)} />
                <DetailRow label="Guest" value={contribution.guest_name} />
                <DetailRow label="Payment method" value={formatPaymentMethod(contribution.payment_method)} />
                <DetailRow label="Reference" value={contribution.transaction_reference || "Not provided"} />
                <DetailRow label="Payment proof" value={contribution.has_payment_proof ? "Uploaded" : "Not uploaded"} />
                <DetailRow label="Paid at" value={formatDateTime(contribution.paid_at)} />
                <DetailRow label="Status" value={getStatusLabel(status)} last />
              </View>

              {isRejectedStatus(status) ? (
                <View style={styles.rejectionBlock}>
                  <Text style={styles.rejectionLabel}>REJECTION REASON</Text>
                  <Text style={styles.rejectionText}>
                    {contribution.rejection_reason || "No reason was recorded for this payment."}
                  </Text>
                  {contribution.rejected_at ? (
                    <Text style={styles.rejectionMeta}>Rejected on {formatDateTime(contribution.rejected_at)}</Text>
                  ) : null}
                </View>
              ) : null}

              {contribution.has_payment_proof ? (
                <View style={styles.proofBlock}>
                  <Text style={styles.inputLabel}>PAYMENT PROOF</Text>
                  {proofFailed ? (
                    <Text accessibilityLiveRegion="polite" style={styles.error}>
                      Could not load the payment proof image.
                    </Text>
                  ) : authToken ? (
                    <Image
                      accessibilityLabel={`Payment proof from ${contribution.guest_name}`}
                      onError={() => setProofFailed(true)}
                      resizeMode="contain"
                      source={{
                        uri: `${api.defaults.baseURL}/contributions/${contribution.id}/payment-proof?v=${proofVersion}`,
                        headers: { Authorization: `Bearer ${authToken}` },
                      }}
                      style={styles.proofImage}
                    />
                  ) : (
                    <Text style={styles.message}>Loading proof…</Text>
                  )}
                </View>
              ) : null}

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
                    <Text style={styles.markPaidText}>{isSaving ? "Working…" : "Mark as Paid"}</Text>
                  </Pressable>

                  <Pressable
                    accessibilityHint="Opens a form to enter the reason for rejecting this payment"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isSaving }}
                    disabled={isSaving}
                    onPress={openRejectModal}
                    style={({ pressed }) => [styles.rejectButton, styles.rejectButtonSpaced, pressed && styles.pressed, isSaving && styles.disabledButton]}
                  >
                    <Text style={styles.rejectButtonText}>Reject Payment</Text>
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

      <Modal
        animationType="fade"
        onRequestClose={closeRejectModal}
        transparent
        visible={showRejectModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Payment</Text>
            <Text style={styles.modalSubtitle}>
              {contribution
                ? `${formatTsh(contribution.amount)} from ${contribution.guest_name} will not be counted as paid.`
                : "This payment will not be counted as paid."}
            </Text>

            <Text style={styles.inputLabel}>REASON FOR REJECTING</Text>
            <TextInput
              accessibilityLabel="Reason for rejecting this payment"
              autoFocus
              editable={!isSaving}
              multiline
              onChangeText={(text) => {
                setRejectReason(text);
                if (rejectError) setRejectError("");
              }}
              placeholder="e.g. Payment reference was not found on the statement"
              placeholderTextColor="#827C76"
              style={[styles.input, styles.reasonInput]}
              value={rejectReason}
            />

            {rejectError ? (
              <Text accessibilityLiveRegion="polite" style={styles.actionError}>{rejectError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={closeRejectModal}
                style={({ pressed }) => [styles.modalCancel, pressed && styles.pressed, isSaving && styles.disabledButton]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isSaving }}
                disabled={isSaving}
                onPress={submitReject}
                style={({ pressed }) => [styles.modalReject, pressed && styles.pressed, isSaving && styles.disabledButton]}
              >
                <Text style={styles.rejectButtonText}>{isSaving ? "Rejecting…" : "Reject"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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

function isRejectedStatus(status: string): boolean {
  return status === "rejected" || status === "failed";
}

function getStatusLabel(status: string): string {
  if (status === "paid" || status === "confirmed") return "Paid";
  if (status === "pending") return "Pending Verification";
  if (status === "rejected") return "Rejected";
  if (status === "failed") return "Failed";

  const readable = status.replaceAll("_", " ");
  return readable.charAt(0).toUpperCase() + readable.slice(1);
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
  proofBlock: { marginTop: 20 },
  rejectionBlock: { marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.danger, backgroundColor: "#351F1D" },
  rejectionLabel: { color: colors.danger, fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  rejectionText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  rejectionMeta: { color: colors.textMuted, fontSize: 11, marginTop: 10 },
  proofImage: { width: "100%", height: 400, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.035)" },
  inputLabel: { color: "#D3C8B9", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: "#3B3531", borderRadius: 11, backgroundColor: "rgba(255,255,255,0.035)", color: colors.text, paddingHorizontal: 14, fontSize: 14, marginBottom: 14 },
  actionError: { color: colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  markPaidButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  markPaidText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  rejectButtonSpaced: { marginTop: 12 },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.6)" },
  modalCard: { width: "100%", maxWidth: 440, padding: 22, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
  modalSubtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 16 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancel: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accentSoft },
  modalCancelText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  modalReject: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 11, borderWidth: 1, borderColor: colors.danger, backgroundColor: "#351F1D" },
  rejectLabel: { marginTop: 22 },
  reasonInput: { minHeight: 76, paddingVertical: 12, textAlignVertical: "top" },
  rejectButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, borderWidth: 1, borderColor: colors.danger, backgroundColor: "#351F1D" },
  rejectButtonText: { color: colors.danger, fontSize: 14, fontWeight: "700" },
  disabledButton: { opacity: 0.55 },
  guestButton: { alignSelf: "flex-start", minHeight: 40, justifyContent: "center", marginTop: 20, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.accentSoft },
  guestButtonText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  paymentButton: { minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 18, borderRadius: 11, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentSoft },
  paymentButtonText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
});
