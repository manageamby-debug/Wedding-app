import axios from "axios";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import api from "../../../src/services/api";
import { colors } from "../../../src/constants/theme";

type EventDetailsData = {
  id: number;
  groom_name: string;
  bride_name: string;
  event_date: string;
  event_time: string;
  venue_name: string;
  venue_address: string;
  status: "draft" | "published" | "completed" | "cancelled";
};

type EventGuest = {
  id: number;
  event_id: number;
  full_name: string;
  guest_code: string;
  check_in_status: string;
  phone: string | null;
  email: string | null;
};

type EventContribution = {
  id: number;
  guest_id: number;
  guest_name: string;
  amount: number | string;
  payment_method: string;
  payment_status: string;
  transaction_reference: string | null;
  paid_at: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
};

type EventRSVP = {
  id: number;
  guest_id: number;
  guest_name: string;
  status: string;
};

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const [event, setEvent] = useState<EventDetailsData | null>(null);
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [contributions, setContributions] = useState<EventContribution[]>([]);
  const [rsvps, setRsvps] = useState<EventRSVP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuestsLoading, setIsGuestsLoading] = useState(true);
  const [isContributionsLoading, setIsContributionsLoading] = useState(true);
  const [isRsvpsLoading, setIsRsvpsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [guestsError, setGuestsError] = useState("");
  const [contributionsError, setContributionsError] = useState("");
  const [rsvpsError, setRsvpsError] = useState("");
  const [eventRetryCount, setEventRetryCount] = useState(0);
  const [guestsRetryCount, setGuestsRetryCount] = useState(0);
  const [contributionsRetryCount, setContributionsRetryCount] = useState(0);
  const [rsvpsRetryCount, setRsvpsRetryCount] = useState(0);

  useFocusEffect(useCallback(() => {
    let isActive = true;
    setIsLoading(true);
    setIsGuestsLoading(true);
    setIsContributionsLoading(true);
    setIsRsvpsLoading(true);
    setErrorMessage("");
    setGuestsError("");
    setContributionsError("");
    setRsvpsError("");

    if (!eventId || !/^\d+$/.test(eventId)) {
      setEvent(null);
      setGuests([]);
      setContributions([]);
      setRsvps([]);
      setErrorMessage("This event link is invalid.");
      setGuestsError("This event link is invalid.");
      setContributionsError("This event link is invalid.");
      setRsvpsError("This event link is invalid.");
      setIsLoading(false);
      setIsGuestsLoading(false);
      setIsContributionsLoading(false);
      setIsRsvpsLoading(false);
      return () => {
        isActive = false;
      };
    }

    async function loadEvent() {
      try {
        const response = await api.get<EventDetailsData>(`/events/${eventId}`);

        if (!isActive) return;

        console.log("Event details:", response.data);
        setEvent(response.data);
      } catch (requestError) {
        if (!isActive) return;

        const message = axios.isAxiosError(requestError)
          ? requestError.response?.status === 404
            ? "Event not found or you do not have access to it."
            : requestError.message
          : requestError instanceof Error
            ? requestError.message
            : "Unknown error";

        console.error("Failed to load event details:", message);
        setEvent(null);
        setErrorMessage("Could not load this event. Check your connection and try again.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    async function loadGuests() {
      try {
        const response = await api.get<EventGuest[]>(`/events/${eventId}/guest`);

        if (!isActive) return;

        console.log("Event guests:", response.data);
        setGuests(response.data);
      } catch (requestError) {
        if (!isActive) return;

        const message = axios.isAxiosError(requestError)
          ? requestError.response?.status === 404
            ? "Event not found or you do not have access to it."
            : requestError.message
          : requestError instanceof Error
            ? requestError.message
            : "Unknown error";

        console.error("Failed to load event guests:", message);
        setGuests([]);
        setGuestsError("Could not load guests. Check your connection and try again.");
      } finally {
        if (isActive) setIsGuestsLoading(false);
      }
    }

    async function loadContributions() {
      try {
        const response = await api.get<EventContribution[]>(`/events/${eventId}/contributions`);

        if (!isActive) return;

        console.log("Event contributions:", response.data);
        setContributions(response.data);
      } catch (requestError) {
        if (!isActive) return;

        const message = axios.isAxiosError(requestError)
          ? requestError.response?.status === 404
            ? "Event not found or you do not have access to it."
            : requestError.message
          : requestError instanceof Error
            ? requestError.message
            : "Unknown error";

        console.error("Failed to load event contributions:", message);
        setContributions([]);
        setContributionsError("Could not load contributions. Check your connection and try again.");
      } finally {
        if (isActive) setIsContributionsLoading(false);
      }
    }

    async function loadRSVPs() {
      try {
        const response = await api.get<EventRSVP[]>(`/events/${eventId}/rsvps`);

        if (!isActive) return;

        console.log("Event RSVPs:", response.data);
        setRsvps(response.data);
      } catch (requestError) {
        if (!isActive) return;

        const message = axios.isAxiosError(requestError)
          ? requestError.response?.status === 404
            ? "RSVP endpoint was not found. Check the backend route in Swagger."
            : requestError.message
          : requestError instanceof Error
            ? requestError.message
            : "Unknown error";

        console.error("Load RSVPs failed:", message);
        setRsvps([]);
        setRsvpsError(
          axios.isAxiosError(requestError) && !requestError.response
            ? "Cannot reach the API. Confirm the backend is running and its address is reachable."
            : axios.isAxiosError(requestError) && requestError.response?.status === 404
              ? "RSVP endpoint was not found. Check the backend route in Swagger."
              : "Could not load RSVPs. Check the endpoint and try again.",
        );
      } finally {
        if (isActive) setIsRsvpsLoading(false);
      }
    }

    void loadEvent();
    void loadGuests();
    void loadContributions();
    void loadRSVPs();

    return () => {
      isActive = false;
    };
  }, [eventId, eventRetryCount, guestsRetryCount, contributionsRetryCount, rsvpsRetryCount]));

  const totalContributions = contributions.reduce((total, contribution) => {
    const amount = Number(contribution.amount);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const acceptedRSVPs = rsvps.filter((rsvp) => rsvp.status === "attending").length;
  const declinedRSVPs = rsvps.filter((rsvp) => rsvp.status === "not_attending").length;
  const pendingRSVPs = Math.max(0, guests.length - acceptedRSVPs - declinedRSVPs);
  const checkedInGuests = guests.filter((guest) => guest.check_in_status === "checked_in").length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/dashboard")}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹  My Events</Text>
          </Pressable>

          <Text style={styles.eyebrow}>EVENT OVERVIEW · #{eventId ?? "—"}</Text>
          <Text style={styles.title}>Event Details</Text>

          {isLoading ? <Text style={styles.message}>Loading event details…</Text> : null}

          {!isLoading && errorMessage ? (
            <View>
              <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setEventRetryCount((count) => count + 1)}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {event ? (
            <>
              <Text style={styles.coupleNames}>{event.groom_name} &amp; {event.bride_name}</Text>
              <View style={styles.statusRow}>
                <Text style={styles.label}>STATUS</Text>
                <Text style={styles.status}>{event.status}</Text>
              </View>

              <View style={styles.details}>
                <DetailRow label="Event ID" value={String(event.id)} />
                <DetailRow label="Date" value={event.event_date} />
                <DetailRow label="Time" value={event.event_time.slice(0, 5)} />
                <DetailRow label="Venue" value={event.venue_name} />
                <DetailRow label="Address" value={event.venue_address} last />
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Contributions</Text>
                  <Text style={styles.summaryValue}>
                    {isContributionsLoading || contributionsError ? "—" : formatTsh(totalContributions)}
                  </Text>
                  <Text style={styles.summaryHint}>Includes pending and received amounts</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Guests</Text>
                  <Text style={styles.summaryValue}>
                    {isGuestsLoading || guestsError ? "—" : guests.length}
                  </Text>
                  <Text style={styles.summaryHint}>On this guest list</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Checked In</Text>
                  <Text style={styles.summaryValue}>
                    {isGuestsLoading || guestsError ? "—" : checkedInGuests}
                  </Text>
                  <Text style={styles.summaryHint}>Guests who have arrived</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Not Checked In</Text>
                  <Text style={styles.summaryValue}>
                    {isGuestsLoading || guestsError ? "—" : guests.length - checkedInGuests}
                  </Text>
                  <Text style={styles.summaryHint}>Still expected</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total RSVPs</Text>
                  <Text style={styles.summaryValue}>
                    {isRsvpsLoading || rsvpsError ? "—" : rsvps.length}
                  </Text>
                  <Text style={styles.summaryHint}>Guest responses received</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Accepted</Text>
                  <Text style={styles.summaryValue}>
                    {isRsvpsLoading || rsvpsError ? "—" : acceptedRSVPs}
                  </Text>
                  <Text style={styles.summaryHint}>Attending</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Declined</Text>
                  <Text style={styles.summaryValue}>
                    {isRsvpsLoading || rsvpsError ? "—" : declinedRSVPs}
                  </Text>
                  <Text style={styles.summaryHint}>Not attending</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Pending</Text>
                  <Text style={styles.summaryValue}>
                    {isGuestsLoading || guestsError || isRsvpsLoading || rsvpsError ? "—" : pendingRSVPs}
                  </Text>
                  <Text style={styles.summaryHint}>Includes Maybe and no response</Text>
                </View>
              </View>

              <View style={styles.guestsSection}>
                <View style={styles.guestsHeading}>
                  <Text style={styles.guestsTitle}>Guests</Text>
                  {!isGuestsLoading && !guestsError ? (
                    <Text style={styles.guestCount}>{guests.length}</Text>
                  ) : null}
                </View>

                {!isRsvpsLoading && rsvpsError ? (
                  <View>
                    <Text accessibilityLiveRegion="polite" style={styles.error}>{rsvpsError}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setRsvpsRetryCount((count) => count + 1)}
                      style={styles.retryButton}
                    >
                      <Text style={styles.retryText}>Retry RSVPs</Text>
                    </Pressable>
                  </View>
                ) : null}

                <Pressable
                  accessibilityHint="Opens the form to add a guest to this event"
                  accessibilityRole="button"
                  onPress={() => router.push(`/event/${event.id}/add-guest`)}
                  style={styles.addGuestButton}
                >
                  <Text style={styles.addGuestButtonText}>+  Add Guest</Text>
                </Pressable>

                <Pressable
                  accessibilityHint="Opens the screen to find a guest by guest code and check them in"
                  accessibilityRole="button"
                  onPress={() => router.push(`/event/check-in-search?id=${event.id}`)}
                  style={styles.guestCheckInButton}
                >
                  <Text style={styles.guestCheckInButtonText}>Guest Check-in</Text>
                </Pressable>

                {isGuestsLoading ? <Text style={styles.message}>Loading guests…</Text> : null}

                {!isGuestsLoading && guestsError ? (
                  <View>
                    <Text accessibilityLiveRegion="polite" style={styles.error}>{guestsError}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setGuestsRetryCount((count) => count + 1)}
                      style={styles.retryButton}
                    >
                      <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                  </View>
                ) : null}

                {!isGuestsLoading && !guestsError && guests.length === 0 ? (
                  <Text style={styles.emptyState}>No guests added yet. Add the first guest to get started.</Text>
                ) : null}

                {guests.map((guest) => {
                  const guestRSVP = rsvps.find((rsvp) => rsvp.guest_id === guest.id);
                  const rsvpStatus = isRsvpsLoading
                    ? "Loading…"
                    : rsvpsError
                      ? "Unavailable"
                      : guestRSVP
                        ? guestRSVP.status.replaceAll("_", " ")
                        : "Not responded";

                  return (
                    <View key={guest.id} style={styles.guestCard}>
                      <View style={styles.guestHeading}>
                        <Text style={styles.guestName}>{guest.full_name}</Text>
                        <Text style={styles.guestStatus}>{guest.check_in_status.replaceAll("_", " ")}</Text>
                      </View>
                      <Text style={styles.guestContact}>{guest.phone || "No phone provided"}</Text>
                      {guest.email ? <Text style={styles.guestContact}>{guest.email}</Text> : null}
                      <Text style={styles.guestContact}>Guest Code: {guest.guest_code}</Text>
                      <Text style={styles.rsvpStatus}>RSVP: {rsvpStatus}</Text>
                      <Text style={styles.rsvpStatus}>
                        Check-in: {guest.check_in_status === "checked_in" ? "Checked in" : "Not checked in"}
                      </Text>
                      <Pressable
                        accessibilityHint={`Opens the contribution form for ${guest.full_name}`}
                        accessibilityRole="button"
                        onPress={() => router.push(`/event/${event.id}/add-contribution?guestId=${guest.id}`)}
                        style={styles.addContributionButton}
                      >
                        <Text style={styles.addContributionButtonText}>+  Add Contribution</Text>
                      </Pressable>
                      <Pressable
                        accessibilityHint={`Opens the RSVP form for ${guest.full_name}`}
                        accessibilityRole="button"
                        onPress={() => router.push(`/event/rsvp?id=${event.id}&guestId=${guest.id}`)}
                        style={styles.addContributionButton}
                      >
                        <Text style={styles.addContributionButtonText}>RSVP</Text>
                      </Pressable>
                      {guest.check_in_status !== "checked_in" ? (
                        <Pressable
                          accessibilityHint={`Opens the check-in screen for ${guest.full_name}`}
                          accessibilityRole="button"
                          onPress={() => router.push({
                            pathname: "/event/check-in",
                            params: {
                              id: String(event.id),
                              guestId: String(guest.id),
                              guestCode: guest.guest_code,
                              guestName: guest.full_name,
                            },
                          })}
                          style={styles.addContributionButton}
                        >
                          <Text style={styles.addContributionButtonText}>Check In</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        accessibilityHint={`Opens the invitation screen for ${guest.full_name}`}
                        accessibilityRole="button"
                        onPress={() => router.push({
                          pathname: "/event/invitation",
                          params: {
                            id: String(event.id),
                            guestId: String(guest.id),
                            guestName: guest.full_name,
                            guestCode: guest.guest_code,
                          },
                        })}
                        style={styles.addContributionButton}
                      >
                        <Text style={styles.addContributionButtonText}>Invitation</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <View style={styles.contributionsSection}>
                <View style={styles.guestsHeading}>
                  <Text style={styles.guestsTitle}>Contributions</Text>
                  {!isContributionsLoading && !contributionsError ? (
                    <Text style={styles.guestCount}>{contributions.length}</Text>
                  ) : null}
                </View>

                {isContributionsLoading ? <Text style={styles.message}>Loading contributions…</Text> : null}

                {!isContributionsLoading && contributionsError ? (
                  <View>
                    <Text accessibilityLiveRegion="polite" style={styles.error}>{contributionsError}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setContributionsRetryCount((count) => count + 1)}
                      style={styles.retryButton}
                    >
                      <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                  </View>
                ) : null}

                {!isContributionsLoading && !contributionsError && contributions.length === 0 ? (
                  <Text style={styles.emptyState}>No contributions recorded yet.</Text>
                ) : null}

                {contributions.map((contribution) => (
                  <View key={contribution.id} style={styles.contributionCard}>
                    <View style={styles.guestHeading}>
                      <Text style={styles.guestName}>{contribution.guest_name}</Text>
                      <Text style={styles.guestStatus}>
                        {contribution.payment_status.replaceAll("_", " ")}
                      </Text>
                    </View>
                    <Text style={styles.contributionAmount}>{formatTsh(contribution.amount)}</Text>
                    <Text style={styles.guestContact}>
                      {contribution.payment_method.replaceAll("_", " ")}
                    </Text>
                    {contribution.transaction_reference ? (
                      <Text style={styles.guestContact}>Ref: {contribution.transaction_reference}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && styles.lastRow]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function formatTsh(amount: number | string): string {
  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount)
    ? `TSh ${numericAmount.toLocaleString("en-TZ", { maximumFractionDigits: 2 })}`
    : `TSh ${amount}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 560, padding: 24, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontSize: 26, fontWeight: "700", marginBottom: 20 },
  coupleNames: { color: colors.text, fontSize: 21, fontWeight: "700", marginBottom: 18 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  status: { color: colors.accent, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  details: { borderTopWidth: 1, borderTopColor: colors.border },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  summaryCard: { flex: 1, flexBasis: "45%", minHeight: 112, justifyContent: "center", padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.card },
  summaryLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  summaryValue: { color: colors.accent, fontSize: 19, fontWeight: "700", marginTop: 8 },
  summaryHint: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  detailRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { flexShrink: 1, color: colors.text, fontSize: 14, textAlign: "right" },
  message: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  retryButton: { alignSelf: "flex-start", marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, backgroundColor: colors.accentSoft },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  addGuestButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 10, marginBottom: 10, borderRadius: 11, backgroundColor: colors.accent },
  addGuestButtonText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  guestCheckInButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginBottom: 10, borderWidth: 1, borderColor: colors.accent, borderRadius: 11, backgroundColor: colors.accentSoft },
  guestCheckInButtonText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  guestsSection: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
  guestsHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  guestsTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  guestCount: { overflow: "hidden", borderRadius: 20, backgroundColor: colors.accentSoft, color: colors.accent, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, fontWeight: "700" },
  emptyState: { color: colors.textMuted, fontSize: 13, lineHeight: 20, paddingVertical: 8 },
  guestCard: { marginTop: 10, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card },
  guestHeading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  guestName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "700" },
  guestStatus: { color: colors.accent, fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  guestContact: { color: colors.textMuted, fontSize: 12, marginTop: 7 },
  rsvpStatus: { color: colors.accent, fontSize: 12, fontWeight: "700", marginTop: 10, textTransform: "capitalize" },
  addContributionButton: { alignSelf: "flex-start", minHeight: 34, justifyContent: "center", marginTop: 12, paddingHorizontal: 11, borderRadius: 9, backgroundColor: colors.accentSoft },
  addContributionButtonText: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  contributionsSection: { marginTop: 26, paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.border },
  contributionCard: { marginTop: 10, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card },
  contributionAmount: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 9 },
});
