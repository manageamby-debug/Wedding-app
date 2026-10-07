import axios from "axios";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
  rejection_reason?: string | null;
};

type EventGuest = {
  id: number;
  full_name: string;
  phone: string | null;
};

type PaymentStatus = "pending" | "paid" | "rejected";
type PaymentFilter = PaymentStatus | "all";

const FILTERS: { key: PaymentFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Paid" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const SUBTITLES: Record<PaymentFilter, string> = {
  pending: "Payments that have been recorded but not yet confirmed as paid.",
  paid: "Payments you have confirmed as received.",
  rejected: "Payments that were rejected, with the reason given.",
  all: "Every payment recorded for this event, whatever its status.",
};

const EMPTY_MESSAGES: Record<PaymentFilter, string> = {
  pending: "No pending payments. Everything recorded has been resolved.",
  paid: "No paid payments yet.",
  rejected: "No rejected payments.",
  all: "No payments recorded yet.",
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

function getPaymentStatus(contribution: EventContribution): PaymentStatus {
  const status = (contribution.payment_status ?? "").trim().toLowerCase() || "pending";

  if (status === "paid" || status === "confirmed") return "paid";
  if (status === "rejected" || status === "failed") return "rejected";
  return "pending";
}

// Tanzanian numbers appear as 0712…, 255712… or +255712…; compare them without the prefix.
function nationalDigits(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("255")) return digits.slice(3);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function toAmount(value: number | string): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function statusColor(status: PaymentStatus): string {
  if (status === "paid") return colors.success;
  if (status === "rejected") return colors.danger;
  return colors.accent;
}

function formatPaymentMethod(method: string | null | undefined): string {
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

function formatPaymentStatus(status: PaymentStatus): string {
  if (status === "paid") return "✅ Paid";
  if (status === "rejected") return "❌ Rejected";
  return "⏳ Pending";
}

export default function PendingContributionsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = firstParam(params.id);

  const [contributions, setContributions] = useState<EventContribution[]>([]);
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [filter, setFilter] = useState<PaymentFilter>("pending");
  const [search, setSearch] = useState("");
  const [guestPhones, setGuestPhones] = useState<Record<number, string>>({});
  const [phoneSearchUnavailable, setPhoneSearchUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useFocusEffect(useCallback(() => {
    let isActive = true;

    if (!isPositiveId(eventId)) {
      setContributions([]);
      setGuests([]);
      setErrorMessage("This event link is invalid. Return to Event Details and try again.");
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    async function loadContributions() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        // Load payments and guests once for the event; use the guest list for local name
        // and phone lookup rather than requesting a guest for each payment.
        const [contributionsResult, guestsResult] = await Promise.allSettled([
          api.get<EventContribution[]>(`/events/${eventId}/contributions`),
          api.get<EventGuest[]>(`/events/${eventId}/guest`),
        ]);
        if (!isActive) return;

        if (contributionsResult.status === "rejected") throw contributionsResult.reason;

        setContributions(contributionsResult.value.data);

        if (guestsResult.status === "fulfilled") {
          setGuests(guestsResult.value.data);
          const phones: Record<number, string> = {};
          for (const guest of guestsResult.value.data) {
            if (guest.phone) phones[guest.id] = guest.phone;
          }
          setGuestPhones(phones);
          setPhoneSearchUnavailable(false);
        } else {
          setGuests([]);
          setGuestPhones({});
          setPhoneSearchUnavailable(true);
        }
      } catch (requestError) {
        if (!isActive) return;

        setContributions([]);
        setGuests([]);
        setErrorMessage(
          axios.isAxiosError(requestError) && !requestError.response
            ? "Cannot reach the server. Check that the backend is running."
            : axios.isAxiosError(requestError) && requestError.response?.status === 404
              ? "Event not found, or you do not have access to it."
              : "Could not load payments. Check your connection and try again.",
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadContributions();

    return () => {
      isActive = false;
    };
  }, [eventId, retryCount]));

  function getGuestName(guestId: number): string {
    const guest = guests.find((item) => Number(item.id) === Number(guestId));
    return guest?.full_name || `Guest #${guestId}`;
  }

  // Search first, so the counts on the filter chips show how many matches each status has.
  const query = search.trim().toLowerCase();
  const queryNational = nationalDigits(query);
  const searchedContributions = query
    ? contributions.filter((contribution) => {
      const phone = guestPhones[contribution.guest_id] ?? "";

      return (
        getGuestName(contribution.guest_id).toLowerCase().includes(query)
        || (contribution.guest_name ?? "").toLowerCase().includes(query)
        || (contribution.transaction_reference ?? "").toLowerCase().includes(query)
        || phone.toLowerCase().includes(query)
        || (queryNational.length >= 3 && nationalDigits(phone).includes(queryNational))
      );
    })
    : contributions;

  const counts: Record<PaymentFilter, number> = { pending: 0, paid: 0, rejected: 0, all: searchedContributions.length };
  for (const contribution of searchedContributions) counts[getPaymentStatus(contribution)] += 1;

  const filteredContributions = searchedContributions.filter(
    (contribution) => filter === "all" || getPaymentStatus(contribution) === filter,
  );
  const filteredTotal = filteredContributions.reduce((total, contribution) => total + toAmount(contribution.amount), 0);

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
          <Text style={styles.title}>Payments</Text>
          <Text style={styles.subtitle}>{SUBTITLES[filter]}</Text>

          {isLoading ? <Text style={styles.message}>Loading payments…</Text> : null}

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
              <View style={styles.searchRow}>
                <TextInput
                  accessibilityLabel="Search payments by guest name, phone or payment reference"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setSearch}
                  placeholder="Search name, phone or reference…"
                  placeholderTextColor="#827C76"
                  returnKeyType="search"
                  style={styles.searchInput}
                  value={search}
                />
                {search ? (
                  <Pressable accessibilityLabel="Clear search" accessibilityRole="button" onPress={() => setSearch("")} style={styles.clearButton}>
                    <Text style={styles.clearText}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>
              {phoneSearchUnavailable ? (
                <Text style={styles.searchNote}>Phone search is unavailable right now. Name and reference still work.</Text>
              ) : null}

              <View accessibilityRole="tablist" style={styles.filters}>
                {FILTERS.map((item) => {
                  const selected = filter === item.key;

                  return (
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      key={item.key}
                      onPress={() => setFilter(item.key)}
                      style={[styles.filterChip, selected && styles.filterChipSelected]}
                    >
                      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                        {item.label} ({counts[item.key]})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.summary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Payments</Text>
                  <Text style={styles.summaryValue}>{filteredContributions.length}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Amount</Text>
                  <Text style={styles.summaryValue}>{formatTsh(filteredTotal)}</Text>
                </View>
              </View>

              {filteredContributions.length === 0 ? (
                <Text style={styles.emptyState}>
                  {query ? `No ${filter === "all" ? "" : `${filter} `}payments match "${search.trim()}".` : EMPTY_MESSAGES[filter]}
                </Text>
              ) : null}

              {filteredContributions.map((contribution) => {
                const status = getPaymentStatus(contribution);
                const guestName = getGuestName(contribution.guest_id);

                return (
                  <Pressable
                    accessibilityHint={`Opens the payment details, proof and status for ${guestName}`}
                    accessibilityRole="button"
                    key={contribution.id}
                    onPress={() => router.push(`/event/contribution/${contribution.id}?eventId=${eventId}`)}
                    style={({ pressed }) => [styles.contributionCard, pressed && styles.pressed]}
                  >
                    <View style={styles.row}>
                      <Text style={styles.guestName}>{guestName}</Text>
                      <Text style={[styles.status, { color: statusColor(status) }]}>{formatPaymentStatus(status)}</Text>
                    </View>
                    <Text style={styles.amount}>
                      Amount: {toAmount(contribution.amount).toLocaleString("en-TZ", { maximumFractionDigits: 2 })} TSh
                    </Text>
                    <Text style={styles.meta}>Payment Method: {formatPaymentMethod(contribution.payment_method)}</Text>
                    <Text style={styles.metaPlain}>Reference: {contribution.transaction_reference || "Not provided"}</Text>
                    {status === "rejected" && contribution.rejection_reason ? (
                      <Text style={styles.metaPlain}>Reason: {contribution.rejection_reason}</Text>
                    ) : null}
                    <View style={styles.cardFooter}>
                      <Text style={styles.viewDetails}>View details  ›</Text>
                      <Pressable
                        accessibilityHint={`Opens the details screen for ${guestName}`}
                        accessibilityRole="button"
                        onPress={() => router.push(`/event/guest/${contribution.guest_id}?eventId=${eventId}`)}
                        style={styles.viewButton}
                      >
                        <Text style={styles.viewButtonText}>View Guest</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
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
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: "#3B3531", borderRadius: 11, backgroundColor: "rgba(255,255,255,0.035)", color: colors.text, paddingHorizontal: 14, fontSize: 14 },
  clearButton: { minHeight: 46, justifyContent: "center", paddingHorizontal: 12, borderRadius: 11, backgroundColor: colors.accentSoft },
  clearText: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  searchNote: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginBottom: 12 },
  filterChip: { minHeight: 38, justifyContent: "center", paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 19, backgroundColor: colors.card },
  filterChipSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  filterTextSelected: { color: colors.accent },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryItem: { flexGrow: 1, flexBasis: "40%", minWidth: 130, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.card },
  summaryLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  summaryValue: { color: colors.accent, fontSize: 18, fontWeight: "700", marginTop: 6 },
  emptyState: { color: colors.textMuted, fontSize: 13, lineHeight: 20, paddingVertical: 16 },
  contributionCard: { marginTop: 10, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  guestName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "700" },
  status: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  amount: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 9 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 7, textTransform: "capitalize" },
  metaPlain: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  viewButton: { alignSelf: "flex-start", minHeight: 34, justifyContent: "center", paddingHorizontal: 11, borderRadius: 9, backgroundColor: colors.accentSoft },
  viewButtonText: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 },
  viewDetails: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.78 },
});
