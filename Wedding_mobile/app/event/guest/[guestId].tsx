import axios from "axios";
import { useCallback, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import api from "../../../src/services/api";
import { colors } from "../../../src/constants/theme";

type GuestData = {
  id: number;
  event_id: number;
  full_name: string;
  guest_code: string;
  check_in_status: string;
  phone: string | null;
  email: string | null;
};

type GuestRSVP = {
  id: number;
  guest_id: number;
  guest_name: string;
  status: string;
};

type GuestContribution = {
  id: number;
  guest_id: number;
  amount: number | string;
  payment_method: string;
  payment_status: string;
  transaction_reference: string | null;
  rejection_reason: string | null;
};

type GuestContributionSummary = {
  guest_id: number;
  guest_name: string;
  total_contributions: number;
  total_paid: number | string;
  total_pending: number | string;
  contributions: GuestContribution[];
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isPositiveId(value: string | undefined): value is string {
  return !!value && /^\d+$/.test(value) && Number(value) >= 1;
}

function describeError(requestError: unknown, notFound: string, fallback: string): string {
  if (axios.isAxiosError(requestError)) {
    if (!requestError.response) return "Cannot reach the server. Check that the backend is running.";
    if (requestError.response.status === 404) return notFound;
  }

  return fallback;
}

function formatTsh(amount: number | string): string {
  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount)
    ? `TSh ${numericAmount.toLocaleString("en-TZ", { maximumFractionDigits: 2 })}`
    : `TSh ${amount}`;
}

type PaymentKey = "paid" | "pending" | "rejected" | "failed";

function getPaymentKey(status: string | null): PaymentKey {
  const key = (status ?? "").trim().toLowerCase();

  if (key === "paid" || key === "confirmed") return "paid";
  if (key === "rejected") return "rejected";
  if (key === "failed") return "failed";
  return "pending";
}

function getPaymentLabel(key: PaymentKey): string {
  if (key === "paid") return "✅ Paid";
  if (key === "rejected") return "❌ Rejected";
  if (key === "failed") return "❌ Failed";
  return "⏳ Pending";
}

function getPaymentColor(key: PaymentKey): string {
  if (key === "paid") return colors.success;
  if (key === "rejected" || key === "failed") return colors.danger;
  return colors.accent;
}

export default function GuestDetailsScreen() {
  const params = useLocalSearchParams<{ guestId: string; eventId: string }>();
  const guestId = firstParam(params.guestId);
  const eventId = firstParam(params.eventId);

  const [guest, setGuest] = useState<GuestData | null>(null);
  const [rsvp, setRsvp] = useState<GuestRSVP | null>(null);
  const [contributionSummary, setContributionSummary] = useState<GuestContributionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guestError, setGuestError] = useState("");
  const [rsvpError, setRsvpError] = useState("");
  const [contributionsError, setContributionsError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(useCallback(() => {
    let isActive = true;

    if (!isPositiveId(guestId) || !isPositiveId(eventId)) {
      setGuestError("This guest link is invalid. Return to Event Details and try again.");
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    async function loadGuestDetails() {
      const [guestsResult, rsvpsResult, contributionsResult] = await Promise.allSettled([
        api.get<GuestData[]>(`/events/${eventId}/guest`),
        api.get<GuestRSVP[]>(`/events/${eventId}/rsvps`),
        api.get<GuestContributionSummary>(`/guests/${guestId}/contributions`),
      ]);

      if (!isActive) return;

      if (guestsResult.status === "fulfilled") {
        const found = guestsResult.value.data.find((item) => item.id === Number(guestId)) ?? null;

        console.log("Guest details:", found);
        setGuest(found);
        setGuestError(found ? "" : "Guest not found in this event.");
      } else {
        console.error("Load guest failed:", guestsResult.reason);
        setGuestError(describeError(
          guestsResult.reason,
          "Event not found or you do not have access to it.",
          "Could not load this guest. Check your connection and try again.",
        ));
      }

      if (rsvpsResult.status === "fulfilled") {
        setRsvp(rsvpsResult.value.data.find((item) => item.guest_id === Number(guestId)) ?? null);
        setRsvpError("");
      } else {
        console.error("Load guest RSVP failed:", rsvpsResult.reason);
        setRsvp(null);
        setRsvpError(describeError(
          rsvpsResult.reason,
          "RSVP endpoint was not found.",
          "Could not load the RSVP.",
        ));
      }

      if (contributionsResult.status === "fulfilled") {
        console.log("Guest contributions:", contributionsResult.value.data);
        setContributionSummary(contributionsResult.value.data);
        setContributionsError("");
      } else {
        console.error("Load guest contributions failed:", contributionsResult.reason);
        setContributionSummary(null);
        setContributionsError(describeError(
          contributionsResult.reason,
          "Contributions for this guest were not found.",
          "Could not load contributions.",
        ));
      }

      setIsLoading(false);
    }

    void loadGuestDetails();

    return () => {
      isActive = false;
    };
  }, [guestId, eventId, retryCount]));

  async function performDeleteGuest() {
    if (!isPositiveId(guestId) || isDeleting) return;

    setIsDeleting(true);
    setGuestError("");

    try {
      await api.delete(`/guests/${guestId}`);
      console.log("Guest deleted");
      router.replace(`/event/${eventId}`);
    } catch (requestError) {
      console.error("Delete guest failed:", requestError);
      setGuestError(describeError(
        requestError,
        "Guest not found or you do not have access to it.",
        "Could not delete this guest. Check your connection and try again.",
      ));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  }

  function deleteGuest() {
    if (isDeleting) return;

    const warning = "Deleting this guest also removes their RSVP and contribution history. This cannot be undone.";
    if (Platform.OS === "web") {
      setShowDeleteConfirmation(true);
      return;
    }

    Alert.alert("Delete Guest", warning, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => { void performDeleteGuest(); },
      },
    ]);
  }

  const rsvpLabel = rsvpError
    ? "Unavailable"
    : rsvp
      ? rsvp.status.replaceAll("_", " ")
      : "Not responded";
  const isCheckedIn = guest?.check_in_status === "checked_in";
  // Totals come from the contribution list itself. The backend's "pending" total is
  // expected minus paid, which would wrongly include rejected amounts.
  const guestAmounts = { paid: 0, pending: 0, rejected: 0 };
  for (const contribution of contributionSummary?.contributions ?? []) {
    const amount = Number(contribution.amount);
    const value = Number.isFinite(amount) ? amount : 0;
    const key = getPaymentKey(contribution.payment_status);

    if (key === "paid") guestAmounts.paid += value;
    else if (key === "rejected" || key === "failed") guestAmounts.rejected += value;
    else guestAmounts.pending += value;
  }
  const totalRecorded = guestAmounts.paid + guestAmounts.pending + guestAmounts.rejected;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(`/event/${eventId ?? ""}`)}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹  Event Details</Text>
          </Pressable>

          <Text style={styles.eyebrow}>GUEST · #{guestId ?? "—"}</Text>
          <Text style={styles.title}>Guest Details</Text>

          {isLoading ? <Text style={styles.message}>Loading guest…</Text> : null}

          {!isLoading && guestError ? (
            <View>
              <Text accessibilityLiveRegion="polite" style={styles.error}>{guestError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setIsLoading(true);
                  setRetryCount((count) => count + 1);
                }}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {guest ? (
            <>
              <Text style={styles.guestName}>{guest.full_name}</Text>

              <View style={styles.details}>
                <DetailRow label="Phone" value={guest.phone || "No phone provided"} />
                <DetailRow label="Email" value={guest.email || "N/A"} />
                <DetailRow label="Guest Code" value={guest.guest_code} />
                <DetailRow label="RSVP" value={rsvpLabel} capitalize />
                <DetailRow
                  label="Check-in"
                  value={isCheckedIn ? "Checked in" : "Not checked in"}
                  last
                />
              </View>

              {rsvpError ? <Text style={styles.sectionError}>{rsvpError}</Text> : null}

              <View style={styles.guestManagementActions}>
                <Pressable
                  accessibilityHint={`Opens the edit form for ${guest.full_name}`}
                  accessibilityRole="button"
                  onPress={() => router.push({
                    pathname: "/event/edit-guest",
                    params: {
                      guestId: String(guest.id),
                      eventId: String(guest.event_id),
                    },
                  })}
                  style={styles.editGuestButton}
                >
                  <Text style={styles.editGuestText}>Edit Guest</Text>
                </Pressable>
                <Pressable
                  accessibilityHint="Permanently deletes this guest and their RSVP and contribution history"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isDeleting }}
                  disabled={isDeleting}
                  onPress={deleteGuest}
                  style={[styles.deleteActionButton, isDeleting && styles.disabledButton]}
                >
                  <Text style={styles.deleteActionText}>{isDeleting ? "Deleting…" : "Delete Guest"}</Text>
                </Pressable>
              </View>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/event/rsvp?id=${guest.event_id}&guestId=${guest.id}`)}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionText}>RSVP</Text>
                </Pressable>
                {!isCheckedIn ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({
                      pathname: "/event/check-in",
                      params: {
                        id: String(guest.event_id),
                        guestId: String(guest.id),
                        guestCode: guest.guest_code,
                        guestName: guest.full_name,
                      },
                    })}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionText}>Check In</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({
                    pathname: "/event/invitation",
                    params: {
                      id: String(guest.event_id),
                      guestId: String(guest.id),
                      guestName: guest.full_name,
                      guestCode: guest.guest_code,
                    },
                  })}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionText}>Invitation</Text>
                </Pressable>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>Contributions</Text>
                  {contributionSummary ? (
                    <Text style={styles.count}>{contributionSummary.total_contributions}</Text>
                  ) : null}
                </View>

                {contributionsError ? (
                  <Text accessibilityLiveRegion="polite" style={styles.error}>{contributionsError}</Text>
                ) : null}

                {contributionSummary ? (
                  <>
                    <View style={styles.totals}>
                      <View style={styles.totalCard}>
                        <Text style={styles.totalLabel}>Total recorded</Text>
                        <Text style={styles.totalValue}>{formatTsh(totalRecorded)}</Text>
                      </View>
                      <View style={styles.totalCard}>
                        <Text style={styles.totalLabel}>Paid</Text>
                        <Text style={styles.totalValue}>{formatTsh(guestAmounts.paid)}</Text>
                      </View>
                      <View style={styles.totalCard}>
                        <Text style={styles.totalLabel}>Pending</Text>
                        <Text style={styles.totalValue}>{formatTsh(guestAmounts.pending)}</Text>
                      </View>
                      {guestAmounts.rejected > 0 ? (
                        <View style={styles.totalCard}>
                          <Text style={styles.totalLabel}>Rejected</Text>
                          <Text style={[styles.totalValue, { color: colors.danger }]}>{formatTsh(guestAmounts.rejected)}</Text>
                        </View>
                      ) : null}
                    </View>

                    {contributionSummary.contributions.length === 0 ? (
                      <Text style={styles.emptyState}>No contributions recorded for this guest yet.</Text>
                    ) : null}

                    {contributionSummary.contributions.length > 0 ? (
                      <Text style={styles.historyTitle}>CONTRIBUTION HISTORY</Text>
                    ) : null}

                    {contributionSummary.contributions.map((contribution) => {
                      const paymentKey = getPaymentKey(contribution.payment_status);

                      return (
                        <Pressable
                          accessibilityHint="Opens the payment details, proof and status for this contribution"
                          accessibilityRole="button"
                          key={contribution.id}
                          onPress={() => router.push(`/event/contribution/${contribution.id}?eventId=${guest.event_id}`)}
                          style={({ pressed }) => [styles.contributionCard, pressed && styles.pressed]}
                        >
                          <View style={styles.row}>
                            <Text style={styles.contributionAmount}>{formatTsh(contribution.amount)}</Text>
                            <Text style={[styles.contributionStatus, { color: getPaymentColor(paymentKey) }]}>
                              {getPaymentLabel(paymentKey)}
                            </Text>
                          </View>
                          <Text style={styles.contributionMeta}>
                            {contribution.payment_method.replaceAll("_", " ")}
                          </Text>
                          {contribution.transaction_reference ? (
                            <Text style={styles.contributionNote}>Ref: {contribution.transaction_reference}</Text>
                          ) : null}
                          {(paymentKey === "rejected" || paymentKey === "failed") && contribution.rejection_reason ? (
                            <Text style={styles.contributionNote}>Reason: {contribution.rejection_reason}</Text>
                          ) : null}
                          <Text style={styles.viewDetails}>View details  ›</Text>
                        </Pressable>
                      );
                    })}
                  </>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/event/${guest.event_id}/add-contribution?guestId=${guest.id}`)}
                  style={styles.addButton}
                >
                  <Text style={styles.addButtonText}>+  Add Contribution</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
      <Modal
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmation(false)}
        transparent
        visible={showDeleteConfirmation}
      >
        <View style={styles.modalOverlay}>
          <View accessibilityViewIsModal style={styles.confirmationCard}>
            <Text accessibilityRole="header" style={styles.confirmationTitle}>Delete this guest?</Text>
            <Text style={styles.confirmationMessage}>
              This also removes {guest?.full_name ?? "the guest"}'s RSVP and contribution history. This action cannot be undone.
            </Text>
            <View style={styles.confirmationActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isDeleting}
                onPress={() => setShowDeleteConfirmation(false)}
                style={styles.cancelDeleteButton}
              >
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isDeleting }}
                disabled={isDeleting}
                onPress={() => { void performDeleteGuest(); }}
                style={[styles.confirmDeleteButton, isDeleting && styles.disabledButton]}
              >
                <Text style={styles.confirmDeleteText}>{isDeleting ? "Deleting…" : "Delete guest"}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 560, padding: 24, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontSize: 26, fontWeight: "700", marginBottom: 20 },
  guestName: { color: colors.text, fontSize: 21, fontWeight: "700", marginBottom: 18 },
  message: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  sectionError: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 8 },
  retryButton: { alignSelf: "flex-start", marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, backgroundColor: colors.accentSoft },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  details: { borderTopWidth: 1, borderTopColor: colors.border },
  detailRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { flexShrink: 1, color: colors.text, fontSize: 14, textAlign: "right" },
  capitalize: { textTransform: "capitalize" },
  guestManagementActions: { gap: 10, marginTop: 18 },
  editGuestButton: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.accent },
  editGuestText: { color: colors.onAccent, fontSize: 13, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  actionButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.accentSoft },
  actionText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  deleteActionButton: { minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.danger, borderRadius: 10, backgroundColor: "#351F1D" },
  deleteActionText: { color: colors.danger, fontSize: 13, fontWeight: "700" },
  disabledButton: { opacity: 0.55 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.72)" },
  confirmationCard: { width: "100%", maxWidth: 420, padding: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface },
  confirmationTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
  confirmationMessage: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 10 },
  confirmationActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 22 },
  cancelDeleteButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.card },
  cancelDeleteText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  confirmDeleteButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.danger },
  confirmDeleteText: { color: colors.background, fontSize: 13, fontWeight: "700" },
  section: { marginTop: 26, paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.border },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  count: { overflow: "hidden", borderRadius: 20, backgroundColor: colors.accentSoft, color: colors.accent, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, fontWeight: "700" },
  totals: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  totalCard: { flexGrow: 1, flexBasis: "30%", minWidth: 120, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.card },
  totalLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  totalValue: { color: colors.accent, fontSize: 16, fontWeight: "700", marginTop: 6 },
  emptyState: { color: colors.textMuted, fontSize: 13, lineHeight: 20, paddingVertical: 12 },
  contributionCard: { marginTop: 10, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  contributionAmount: { color: colors.text, fontSize: 16, fontWeight: "700" },
  contributionStatus: { color: colors.accent, fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  contributionMeta: { color: colors.textMuted, fontSize: 12, marginTop: 7, textTransform: "capitalize" },
  contributionNote: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  historyTitle: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.1, marginTop: 18 },
  viewDetails: { color: colors.accent, fontSize: 12, fontWeight: "700", marginTop: 12 },
  pressed: { opacity: 0.78 },
  addButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 16, borderRadius: 11, backgroundColor: colors.accent },
  addButtonText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
});
