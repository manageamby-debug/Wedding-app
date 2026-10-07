import axios from "axios";
import { useCallback, useState, type ReactNode } from "react";
import { Alert, Button, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import LoadingState from "../../../components/LoadingState";
import api from "../../../src/services/api";
import PaymentSummary from "../../../src/components/PaymentSummary";
import { colors } from "../../../src/constants/theme";

type EventDetailsData = {
  id: number;
  name: string;
  couple_names: string;
  groom_name: string;
  bride_name: string;
  event_date: string;
  event_time: string;
  venue: string;
  venue_name: string;
  venue_address: string | null;
  description: string | null;
  target_contribution: number | string;
  status: "draft" | "active" | "published" | "completed" | "cancelled";
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
  payment_status?: string | null;
  status?: string | null;
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

type GuestFilter =
  | "all"
  | "rsvp_accepted"
  | "rsvp_pending"
  | "paid"
  | "payment_pending"
  | "checked_in"
  | "not_checked_in";
type GuestSort = "name_asc" | "not_checked_in";

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const [event, setEvent] = useState<EventDetailsData | null>(null);
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [guestSearch, setGuestSearch] = useState("");
  const [guestFilter, setGuestFilter] = useState<GuestFilter>("all");
  const [guestSort, setGuestSort] = useState<GuestSort>("name_asc");
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState("");

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

  function retryGuestLoading() {
    setGuestsError("");
    setIsGuestsLoading(true);
    setGuestsRetryCount((count) => count + 1);
  }

  async function performDeleteEvent() {
    if (isDeleting || !eventId) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      await api.delete(`/events/${eventId}`);
      console.log("Event deleted");
      router.replace("/dashboard");
    } catch (requestError) {
      const message = axios.isAxiosError(requestError) && !requestError.response
        ? "Cannot reach the server. Check that the backend is running."
        : axios.isAxiosError(requestError) && requestError.response?.status === 404
          ? "Event not found, or you do not have access to it."
          : "Could not delete this event. Please try again.";

      console.error("Delete event failed:", axios.isAxiosError(requestError) ? requestError.response?.status : requestError);
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  }

  function confirmDeleteEvent() {
    const message = "This will permanently delete the event together with all its guests, RSVPs and contributions. This cannot be undone.";

    if (Platform.OS === "web") {
      if (window.confirm(`Delete Event\n\n${message}`)) void performDeleteEvent();
      return;
    }

    Alert.alert("Delete Event", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void performDeleteEvent() },
    ]);
  }

  async function updateEventStatus(newStatus: string) {
    if (isUpdatingStatus || !eventId || !event) return;

    setIsUpdatingStatus(true);
    setStatusUpdateError("");

    try {
      // Backend PUT /events/{id} requires event_date — send current value alongside new status.
      const response = await api.put<EventDetailsData>(`/events/${eventId}`, {
        event_date: event.event_date,
        status: newStatus,
      });
      setEvent(response.data);
      console.log("Event status updated to:", newStatus);
    } catch (requestError) {
      const message = axios.isAxiosError(requestError) && !requestError.response
        ? "Cannot reach the server. Check that the backend is running."
        : axios.isAxiosError(requestError) && requestError.response?.status === 404
          ? "Event not found, or you do not have access to it."
          : axios.isAxiosError(requestError) && requestError.response?.status === 422
            ? `Status "${newStatus}" was rejected by the server. Check backend allowed values.`
            : "Could not update event status. Please try again.";

      console.error("Update status failed:", axios.isAxiosError(requestError) ? requestError.response?.data : requestError);
      setStatusUpdateError(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function confirmStatusUpdate(
    newStatus: string,
    title: string,
    message: string,
    confirmLabel: string,
    isDestructive = false,
  ) {
    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) void updateEventStatus(newStatus);
      return;
    }

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: confirmLabel,
        style: isDestructive ? "destructive" : "default",
        onPress: () => void updateEventStatus(newStatus),
      },
    ]);
  }

  const pendingCount = contributions.filter(
    (contribution) => getContributionStatus(contribution) === "pending",
  ).length;

  // One fetch, grouped locally: contributions are already loaded for the whole event,
  // so each guest card reads from this map instead of calling the API per guest.
  const contributionsByGuest = new Map<number, EventContribution[]>();
  for (const contribution of contributions) {
    const guestId = Number(contribution.guest_id);
    const list = contributionsByGuest.get(guestId);
    if (list) list.push(contribution);
    else contributionsByGuest.set(guestId, [contribution]);
  }

  function getGuestPaymentStatus(guestId: number): GuestPayment {
    const guestContributions = contributionsByGuest.get(Number(guestId)) ?? [];
    let paidAmount = 0;
    let pendingAmount = 0;
    let rejectedAmount = 0;

    for (const contribution of guestContributions) {
      const status = getContributionStatus(contribution);
      const amount = Number(contribution.amount);
      const value = Number.isFinite(amount) ? amount : 0;

      if (status === "paid" || status === "confirmed") paidAmount += value;
      else if (status === "rejected" || status === "failed") rejectedAmount += value;
      else pendingAmount += value;
    }

    // A guest can have several contributions. Paid money with more still waiting is
    // "partially paid"; rejected amounts never count as paid or as waiting.
    let status: GuestPaymentStatus = "none";
    if (paidAmount > 0 && pendingAmount > 0) status = "partially_paid";
    else if (paidAmount > 0) status = "paid";
    else if (pendingAmount > 0) status = "pending";
    else if (rejectedAmount > 0) status = "rejected";

    return {
      amount: paidAmount + pendingAmount + rejectedAmount,
      paidAmount,
      pendingAmount,
      rejectedAmount,
      status,
    };
  }

  const acceptedRSVPs = rsvps.filter((rsvp) => rsvp.status === "attending").length;
  const eventLocked =
    event?.status === "completed" ||
    event?.status === "cancelled";
  const declinedRSVPs = rsvps.filter((rsvp) => rsvp.status === "not_attending").length;
  const maybeRSVPs = rsvps.filter((rsvp) => rsvp.status === "maybe").length;
  const respondedGuestCount = new Set(rsvps.map((rsvp) => rsvp.guest_id)).size;
  const pendingRSVPs = Math.max(0, guests.length - respondedGuestCount);
  const checkedInGuests = guests.filter((guest) => guest.check_in_status === "checked_in").length;
  const checkInRate = guests.length ? Math.round((checkedInGuests / guests.length) * 100) : 0;
  const rsvpResponseRate = guests.length ? Math.round((respondedGuestCount / guests.length) * 100) : 0;
  const guestSearchQuery = guestSearch.trim().toLowerCase();
  const filteredGuests = guests.filter((guest) => {
    if (!guestSearchQuery) return true;

    return (
      guest.full_name.toLowerCase().includes(guestSearchQuery) ||
      guest.guest_code.toLowerCase().includes(guestSearchQuery) ||
      (guest.phone ?? "").toLowerCase().includes(guestSearchQuery)
    );
  });
  const finalGuests = filteredGuests.filter((guest) => {
    if (guestFilter === "all") return true;

    const guestRsvp = rsvps.find(
      (item) => Number(item.guest_id) === Number(guest.id),
    );
    const payment = getGuestPaymentStatus(guest.id);

    if (guestFilter === "rsvp_accepted") {
      return guestRsvp?.status === "attending";
    }
    if (guestFilter === "rsvp_pending") {
      return !guestRsvp || guestRsvp.status === "pending";
    }
    if (guestFilter === "paid") return payment.status === "paid";
    if (guestFilter === "payment_pending") return payment.status === "pending";
    if (guestFilter === "checked_in") return guest.check_in_status === "checked_in";
    if (guestFilter === "not_checked_in") return guest.check_in_status !== "checked_in";

    return true;
  });
  const sortedGuests = [...finalGuests].sort((a, b) => {
    if (guestSort === "not_checked_in") {
      const aChecked = a.check_in_status === "checked_in";
      const bChecked = b.check_in_status === "checked_in";

      if (aChecked !== bChecked) return aChecked ? 1 : -1;
    }

    return a.full_name.localeCompare(b.full_name);
  });

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
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={styles.coupleNames}>{event.couple_names || `${event.groom_name} & ${event.bride_name}`}</Text>
              <View style={styles.statusRow}>
                <Text style={styles.label}>STATUS</Text>
                <View style={[styles.statusBadge, getStatusBadgeStyle(event.status)]}>
                  <Text style={[styles.statusBadgeText, getStatusTextStyle(event.status)]}>
                    {getStatusLabel(event.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.details}>
                <DetailRow label="Event ID" value={String(event.id)} />
                <DetailRow label="Date" value={event.event_date} />
                <DetailRow label="Time" value={event.event_time.slice(0, 5)} />
                <DetailRow label="Venue" value={event.venue || event.venue_name} />
                {event.venue_address && event.venue_address !== (event.venue || event.venue_name) ? (
                  <DetailRow label="Address" value={event.venue_address} />
                ) : null}
                <DetailRow label="Contribution target" value={formatTsh(event.target_contribution)} last={!event.description} />
              </View>

              {event.description ? (
                <View style={styles.eventDescription}>
                  <Text style={styles.label}>DESCRIPTION</Text>
                  <Text style={styles.descriptionText}>{event.description}</Text>
                </View>
              ) : null}

              {!eventLocked && (
                <Pressable
                  accessibilityHint="Opens the form to edit this event's details"
                  accessibilityRole="button"
                  onPress={() => router.push(`/event/edit-event?id=${event.id}`)}
                  style={styles.editEventButton}
                >
                  <Text style={styles.guestCheckInButtonText}>Edit Event</Text>
                </Pressable>
              )}

              <Pressable
                accessibilityHint="Asks for confirmation, then permanently deletes this event"
                accessibilityRole="button"
                accessibilityState={{ disabled: isDeleting }}
                disabled={isDeleting}
                onPress={confirmDeleteEvent}
                style={[styles.deleteEventButton, isDeleting && styles.deleteEventButtonDisabled]}
              >
                <Text style={styles.deleteEventButtonText}>{isDeleting ? "Deleting event…" : "Delete Event"}</Text>
              </Pressable>
              {/* Event Lifecycle Actions */}
              {event.status === "draft" && (
                <Pressable
                  accessibilityHint="Activates this draft event"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isUpdatingStatus }}
                  disabled={isUpdatingStatus}
                  onPress={() =>
                    confirmStatusUpdate(
                      "active",
                      "Activate Event",
                      "Are you sure you want to activate this event?",
                      "Activate"
                    )
                  }
                  style={[styles.activateEventButton, isUpdatingStatus && styles.buttonDisabled]}
                >
                  <Text style={styles.activateEventButtonText}>
                    {isUpdatingStatus ? "Updating Status…" : "🟢 Activate Event"}
                  </Text>
                </Pressable>
              )}

              {event.status === "active" && (
                <Pressable
                  accessibilityHint="Marks this active event as completed"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isUpdatingStatus }}
                  disabled={isUpdatingStatus}
                  onPress={() =>
                    confirmStatusUpdate(
                      "completed",
                      "Complete Event",
                      "Are you sure you want to mark this event as completed?",
                      "Complete"
                    )
                  }
                  style={[styles.completeEventButton, isUpdatingStatus && styles.buttonDisabled]}
                >
                  <Text style={styles.completeEventButtonText}>
                    {isUpdatingStatus ? "Updating Status…" : "✅ Complete Event"}
                  </Text>
                </Pressable>
              )}

              {(event.status === "draft" || event.status === "active") && (
                <Pressable
                  accessibilityHint="Cancels this event"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isUpdatingStatus }}
                  disabled={isUpdatingStatus}
                  onPress={() =>
                    confirmStatusUpdate(
                      "cancelled",
                      "Cancel Event",
                      "Are you sure you want to cancel this event?",
                      "Yes, Cancel",
                      true
                    )
                  }
                  style={[styles.cancelEventButton, isUpdatingStatus && styles.buttonDisabled]}
                >
                  <Text style={styles.cancelEventButtonText}>
                    {isUpdatingStatus ? "Updating Status…" : "❌ Cancel Event"}
                  </Text>
                </Pressable>
              )}

              {statusUpdateError ? (
                <Text accessibilityLiveRegion="polite" style={[styles.error, { marginTop: 10 }]}>
                  {statusUpdateError}
                </Text>
              ) : null}

              {deleteError ? (
                <Text accessibilityLiveRegion="polite" style={[styles.error, { marginTop: 10 }]}>{deleteError}</Text>
              ) : null}

              <View style={styles.summaryPanel}>
                <View style={styles.summaryHeader}>
                  <View style={styles.summaryHeaderCopy}>
                    <Text style={styles.summaryTitle}>Event Summary</Text>
                    <Text style={styles.summarySubtitle}>A clear view of attendance and contributions</Text>
                  </View>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>OVERVIEW</Text>
                  </View>
                </View>

                <SummaryGroup title="GUESTS & ATTENDANCE">
                  <SummaryMetric
                    label="Guests"
                    value={isGuestsLoading || guestsError ? "—" : String(guests.length)}
                    hint="On the guest list"
                    tone="accent"
                  />
                  <SummaryMetric
                    label="Checked in"
                    value={isGuestsLoading || guestsError ? "—" : String(checkedInGuests)}
                    hint="Arrived at the event"
                    tone="success"
                  />
                  <SummaryMetric
                    label="Not checked in"
                    value={isGuestsLoading || guestsError ? "—" : String(Math.max(0, guests.length - checkedInGuests))}
                    hint="Guests still expected"
                    tone="info"
                  />
                  <SummaryMetric
                    label="Arrival rate"
                    value={isGuestsLoading || guestsError ? "—" : `${checkInRate}%`}
                    hint="Of all invited guests"
                    tone="accent"
                  />
                </SummaryGroup>

                <SummaryGroup title="RSVP RESPONSES">
                  <SummaryMetric
                    label="Accepted"
                    value={isRsvpsLoading || rsvpsError ? "—" : String(acceptedRSVPs)}
                    hint="Attending"
                    tone="success"
                  />
                  <SummaryMetric
                    label="Declined"
                    value={isRsvpsLoading || rsvpsError ? "—" : String(declinedRSVPs)}
                    hint="Not attending"
                    tone="danger"
                  />
                  <SummaryMetric
                    label="Maybe"
                    value={isRsvpsLoading || rsvpsError ? "—" : String(maybeRSVPs)}
                    hint="Undecided"
                    tone="info"
                  />
                  <SummaryMetric
                    label="No response"
                    value={isGuestsLoading || guestsError || isRsvpsLoading || rsvpsError ? "—" : String(pendingRSVPs)}
                    hint="Awaiting a reply"
                    tone="accent"
                  />
                  <SummaryMetric
                    label="Responses received"
                    value={isRsvpsLoading || rsvpsError ? "—" : String(respondedGuestCount)}
                    hint="All RSVP statuses"
                    tone="accent"
                  />
                  <SummaryMetric
                    label="Response rate"
                    value={isGuestsLoading || guestsError || isRsvpsLoading || rsvpsError ? "—" : `${rsvpResponseRate}%`}
                    hint="Of all invited guests"
                    tone="info"
                  />
                </SummaryGroup>

                <PaymentSummary
                  contributions={contributions}
                  targetContribution={event?.target_contribution}
                  isLoading={isContributionsLoading}
                  error={contributionsError}
                />
              </View>

              {/* ── Quick Actions ── */}
              <View style={styles.quickActionsSection}>
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                  <Pressable
                    accessibilityHint="Opens the guest check-in search screen"
                    accessibilityRole="button"
                    onPress={() => router.push(`/event/check-in-search?id=${event.id}`)}
                    style={({ pressed }) => [styles.quickActionBtn, pressed && styles.quickActionBtnPressed]}
                  >
                    <Text style={styles.quickActionEmoji}>🔎</Text>
                    <Text style={styles.quickActionLabel}>Check-in Guest</Text>
                  </Pressable>

                  <Pressable
                    accessibilityHint="Opens the pending payments screen"
                    accessibilityRole="button"
                    onPress={() => router.push(`/event/pending-contributions?id=${event.id}`)}
                    style={({ pressed }) => [styles.quickActionBtn, pressed && styles.quickActionBtnPressed]}
                  >
                    <Text style={styles.quickActionEmoji}>💰</Text>
                    <Text style={styles.quickActionLabel}>Manage Payments</Text>
                  </Pressable>

                  {!eventLocked && (
                    <Pressable
                      accessibilityHint="Opens the RSVP management screen"
                      accessibilityRole="button"
                      onPress={() => router.push(`/event/rsvp?id=${event.id}`)}
                      style={({ pressed }) => [styles.quickActionBtn, pressed && styles.quickActionBtnPressed]}
                    >
                      <Text style={styles.quickActionEmoji}>📋</Text>
                      <Text style={styles.quickActionLabel}>Manage RSVP</Text>
                    </Pressable>
                  )}

                  <Pressable
                    accessibilityHint="Opens the invitations screen"
                    accessibilityRole="button"
                    onPress={() => router.push(`/event/invitation?id=${event.id}`)}
                    style={({ pressed }) => [styles.quickActionBtn, pressed && styles.quickActionBtnPressed]}
                  >
                    <Text style={styles.quickActionEmoji}>🎟</Text>
                    <Text style={styles.quickActionLabel}>Invitations</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.guestsSection}>
                <View style={styles.guestsHeading}>
                  <Text style={styles.guestsTitle}>Guests</Text>
                  {!isGuestsLoading && !guestsError ? (
                    <Text style={styles.guestCount}>{guests.length}</Text>
                  ) : null}
                </View>

                <TextInput
                  accessibilityLabel="Search guests"
                  placeholder="Search guest name, code or phone..."
                  placeholderTextColor={colors.textMuted}
                  value={guestSearch}
                  onChangeText={setGuestSearch}
                  style={styles.guestSearchInput}
                />
                {guestSearch.length > 0 ? (
                  <Button title="Clear Search" onPress={() => setGuestSearch("")} />
                ) : null}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 15 }}
                >
                  <Button title="All" onPress={() => setGuestFilter("all")} />
                  <View style={{ width: 8 }} />
                  <Button title="RSVP Accepted" onPress={() => setGuestFilter("rsvp_accepted")} />
                  <View style={{ width: 8 }} />
                  <Button title="Paid" onPress={() => setGuestFilter("paid")} />
                  <View style={{ width: 8 }} />
                  <Button title="Checked In" onPress={() => setGuestFilter("checked_in")} />
                </ScrollView>
                <Text style={styles.sortGuestsLabel}>Sort Guests</Text>
                <View style={styles.guestSortButtons}>
                  <Button title="Name A-Z" onPress={() => setGuestSort("name_asc")} />
                  <Button title="Not Checked In First" onPress={() => setGuestSort("not_checked_in")} />
                </View>
                {!isGuestsLoading && !guestsError ? (
                  <Text style={styles.guestResultCount}>
                    Showing {finalGuests.length} of {guests.length} guests
                  </Text>
                ) : null}

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

                <Pressable
                  accessibilityHint="Opens the camera to scan a guest's QR code and check them in"
                  accessibilityRole="button"
                  onPress={() => router.push(`/event/scan?id=${event.id}`)}
                  style={styles.guestCheckInButton}
                >
                  <Text style={styles.guestCheckInButtonText}>Scan QR Code</Text>
                </Pressable>

                {isGuestsLoading ? (
                  <LoadingState message="Loading guests..." />
                ) : guestsError ? (
                  <ErrorState
                    message="Unable to load guests."
                    onRetry={retryGuestLoading}
                  />
                ) : guests.length === 0 ? (
                  <EmptyState
                    title="No Guests Yet"
                    message="Add your first guest to this event."
                    buttonTitle="Add Guest"
                    onPress={() => router.push(`/event/${event.id}/add-guest`)}
                  />
                ) : finalGuests.length === 0 ? (
                  <EmptyState
                    title="No Matching Guests"
                    message="Try a different search or filter."
                    buttonTitle="Clear Search & Filters"
                    onPress={() => {
                      setGuestSearch("");
                      setGuestFilter("all");
                    }}
                  />
                ) : (
                sortedGuests.map((guest) => {
                  const guestRsvp = rsvps.find(
                    (item) => Number(item.guest_id) === Number(guest.id),
                  );
                  const rsvpStatus = isRsvpsLoading
                    ? "Loading…"
                    : rsvpsError
                      ? "Unavailable"
                      : guestRsvp?.status === "attending"
                        ? "✅ Accepted"
                        : guestRsvp?.status === "not_attending"
                          ? "❌ Declined"
                          : guestRsvp?.status === "maybe"
                            ? "🤔 Maybe"
                            : "⏳ Pending";
                  const rsvpColor = isRsvpsLoading || rsvpsError
                    ? colors.textMuted
                    : guestRsvp?.status === "attending"
                      ? colors.success
                      : guestRsvp?.status === "not_attending"
                        ? colors.danger
                        : guestRsvp?.status === "maybe"
                          ? colors.info
                          : colors.accent;
                  const payment = getGuestPaymentStatus(guest.id);
                  const paymentUnavailable = isContributionsLoading || !!contributionsError;

                  return (
                    <View key={guest.id} style={styles.guestCard}>
                      <View style={styles.guestHeading}>
                        <Text style={styles.guestName}>{guest.full_name}</Text>
                        <Text style={styles.guestStatus}>{guest.check_in_status.replaceAll("_", " ")}</Text>
                      </View>
                      <Text style={styles.guestContact}>{guest.phone || "No phone provided"}</Text>
                      {guest.email ? <Text style={styles.guestContact}>{guest.email}</Text> : null}
                      <Text style={styles.guestContact}>Guest Code: {guest.guest_code}</Text>
                      <Text style={styles.guestContact}>
                        Total Contributions: {paymentUnavailable ? "—" : formatTsh(payment.amount)}
                      </Text>
                      <Text style={styles.guestContact}>
                        Paid: {paymentUnavailable ? "—" : formatTsh(payment.paidAmount)}
                      </Text>
                      {!paymentUnavailable && payment.pendingAmount > 0 ? (
                        <Text style={styles.guestContact}>Pending: {formatTsh(payment.pendingAmount)}</Text>
                      ) : null}
                      {!paymentUnavailable && payment.rejectedAmount > 0 ? (
                        <Text style={styles.guestContact}>Rejected: {formatTsh(payment.rejectedAmount)}</Text>
                      ) : null}
                      <Text style={[styles.guestPayment, { color: getGuestPaymentColor(payment.status, paymentUnavailable) }]}>
                        Payment: {paymentUnavailable ? (isContributionsLoading ? "Loading…" : "Unavailable") : getGuestPaymentLabel(payment.status)}
                      </Text>
                      <Text style={[styles.rsvpStatus, { color: rsvpColor }]}>RSVP: {rsvpStatus}</Text>
                      <Text style={styles.rsvpStatus}>
                        Check-in: {guest.check_in_status === "checked_in" ? "Checked in" : "Not checked in"}
                      </Text>
                      <Pressable
                        accessibilityHint={`Opens the details screen for ${guest.full_name}`}
                        accessibilityRole="button"
                        onPress={() => router.push(`/event/guest/${guest.id}?eventId=${event.id}`)}
                        style={styles.addContributionButton}
                      >
                        <Text style={styles.addContributionButtonText}>View Guest</Text>
                      </Pressable>
                      {!eventLocked && (
                        <>
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
                        </>
                      )}
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
                })
                )}
              </View>

              <View style={styles.contributionsSection}>
                <View style={styles.guestsHeading}>
                  <Text style={styles.guestsTitle}>Contributions</Text>
                  {!isContributionsLoading && !contributionsError ? (
                    <Text style={styles.guestCount}>{contributions.length}</Text>
                  ) : null}
                </View>

                {isContributionsLoading ? <Text style={styles.message}>Loading contributions…</Text> : null}

                <Pressable
                  accessibilityHint="Opens the payment totals for this event: collected, pending and rejected"
                  accessibilityRole="button"
                  onPress={() => router.push(`/event/payment-dashboard?id=${event.id}`)}
                  style={styles.guestCheckInButton}
                >
                  <Text style={styles.guestCheckInButtonText}>Payment Dashboard</Text>
                </Pressable>

                <Pressable
                  accessibilityHint="Opens the list of contributions that are not yet confirmed as paid"
                  accessibilityRole="button"
                  onPress={() => router.push(`/event/pending-contributions?id=${event.id}`)}
                  style={styles.guestCheckInButton}
                >
                  <Text style={styles.guestCheckInButtonText}>
                    {isContributionsLoading || contributionsError ? "Pending Payments" : `Pending Payments (${pendingCount})`}
                  </Text>
                </Pressable>

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

                {contributions.map((contribution) => {
                  const paymentStatus = getContributionStatus(contribution);

                  return (
                    <View key={contribution.id} style={styles.contributionCard}>
                      <View style={styles.guestHeading}>
                        <Text style={styles.guestName}>{contribution.guest_name}</Text>
                        <View style={[styles.paymentStatusBadge, getPaymentStatusStyle(paymentStatus)]}>
                          <Text style={[styles.paymentStatusText, getPaymentStatusTextStyle(paymentStatus)]}>
                            {paymentStatus.replaceAll("_", " ")}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.contributionAmount}>Amount: {formatTsh(contribution.amount)}</Text>
                      <Text style={styles.guestContact}>
                        {contribution.payment_method.replaceAll("_", " ")}
                      </Text>
                      {contribution.transaction_reference ? (
                        <Text style={styles.guestContact}>Ref: {contribution.transaction_reference}</Text>
                      ) : null}
                    </View>
                  );
                })}
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

type SummaryTone = "accent" | "success" | "danger" | "info";

type GuestPaymentStatus = "paid" | "partially_paid" | "pending" | "rejected" | "none";

type GuestPayment = {
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  status: GuestPaymentStatus;
};

function getGuestPaymentLabel(status: GuestPaymentStatus): string {
  if (status === "paid") return "✅ Paid";
  if (status === "partially_paid") return "🟡 Partially Paid";
  if (status === "pending") return "⏳ Pending";
  if (status === "rejected") return "❌ Rejected";
  return "— No Payment";
}

function getGuestPaymentColor(status: GuestPaymentStatus, unavailable: boolean): string {
  if (unavailable || status === "none") return colors.textMuted;
  if (status === "paid") return colors.success;
  if (status === "partially_paid") return colors.info;
  if (status === "rejected") return colors.danger;
  return colors.accent;
}

function SummaryGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.summaryGroup}>
      <Text style={styles.summaryGroupTitle}>{title}</Text>
      <View style={styles.summaryGrid}>{children}</View>
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: SummaryTone;
}) {
  return (
    <View style={styles.summaryMetric}>
      <View style={[styles.summaryMetricAccent, { backgroundColor: getSummaryToneColor(tone) }]} />
      <Text style={styles.summaryMetricLabel}>{label}</Text>
      <Text style={[styles.summaryMetricValue, { color: getSummaryToneColor(tone) }]}>{value}</Text>
      <Text style={styles.summaryMetricHint}>{hint}</Text>
    </View>
  );
}

function getSummaryToneColor(tone: SummaryTone): string {
  if (tone === "success") return colors.success;
  if (tone === "danger") return colors.danger;
  if (tone === "info") return colors.info;
  return colors.accent;
}

function getStatusLabel(status: string): string {
  if (status === "draft") return "📝 Draft";
  if (status === "active") return "🟢 Active";
  if (status === "published") return "🟢 Published";
  if (status === "completed") return "✅ Completed";
  if (status === "cancelled") return "❌ Cancelled";
  return status || "Unknown";
}

function getStatusBadgeStyle(status: string) {
  if (status === "active" || status === "published") return styles.statusBadgeSuccess;
  if (status === "completed") return styles.statusBadgeMuted;
  if (status === "cancelled") return styles.statusBadgeDanger;
  return styles.statusBadgeDraft; // draft or unknown
}

function getStatusTextStyle(status: string) {
  if (status === "active" || status === "published") return styles.statusTextSuccess;
  if (status === "completed") return styles.statusTextMuted;
  if (status === "cancelled") return styles.statusTextDanger;
  return styles.statusTextDraft;
}

function getContributionStatus(contribution: EventContribution): string {
  const status = (contribution.payment_status ?? contribution.status ?? "").trim().toLowerCase() || "pending";
  if (status === "paid" || status === "confirmed") return "paid";
  if (status === "failed" || status === "rejected") return "rejected";
  return status;
}

function getPaymentStatusStyle(status: string) {
  if (status === "paid" || status === "confirmed") return styles.paymentPaidBadge;
  if (status === "failed" || status === "rejected") return styles.paymentFailedBadge;
  return styles.paymentPendingBadge;
}

function getPaymentStatusTextStyle(status: string) {
  if (status === "paid" || status === "confirmed") return styles.paymentPaidText;
  if (status === "failed" || status === "rejected") return styles.paymentFailedText;
  return styles.paymentPendingText;
}

function formatTsh(amount: number | string): string {
  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount)
    ? `TSh ${numericAmount.toLocaleString("en-TZ", { maximumFractionDigits: 2 })}`
    : `TSh ${amount}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "flex-start", padding: 24 },
  card: { width: "100%", maxWidth: 560, padding: 24, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontSize: 26, fontWeight: "700", marginBottom: 20 },
  eventName: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 5 },
  coupleNames: { color: colors.text, fontSize: 21, fontWeight: "700", marginBottom: 18 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  status: { color: colors.accent, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  details: { borderTopWidth: 1, borderTopColor: colors.border },
  eventDescription: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  descriptionText: { color: colors.text, fontSize: 14, lineHeight: 21, marginTop: 8 },
  editEventButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 16, borderWidth: 1, borderColor: colors.accent, borderRadius: 11, backgroundColor: colors.accentSoft },
  deleteEventButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 10, borderWidth: 1, borderColor: colors.danger, borderRadius: 11, backgroundColor: "#351F1D" },
  deleteEventButtonDisabled: { opacity: 0.55 },
  deleteEventButtonText: { color: colors.danger, fontSize: 14, fontWeight: "700" },
  activateEventButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 10, borderWidth: 1, borderColor: colors.success, borderRadius: 11, backgroundColor: "#153126" },
  activateEventButtonText: { color: colors.success, fontSize: 14, fontWeight: "700" },
  completeEventButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 10, borderWidth: 1, borderColor: colors.accent, borderRadius: 11, backgroundColor: colors.accentSoft },
  completeEventButtonText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  cancelEventButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 10, borderWidth: 1, borderColor: colors.danger, borderRadius: 11, backgroundColor: "#351F1D" },
  cancelEventButtonText: { color: colors.danger, fontSize: 14, fontWeight: "700" },
  buttonDisabled: { opacity: 0.55 },
  summaryPanel: { marginTop: 24, padding: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surface },
  summaryHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  summaryHeaderCopy: { flex: 1 },
  summaryTitle: { color: colors.text, fontSize: 20, fontWeight: "700", letterSpacing: 0.1 },
  summarySubtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.accentSoft },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  liveBadgeText: { color: colors.accent, fontSize: 9, fontWeight: "700", letterSpacing: 0.7 },
  summaryGroup: { marginTop: 18 },
  summaryGroupTitle: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.1, marginBottom: 9 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryMetric: { position: "relative", flexGrow: 1, flexBasis: "45%", minHeight: 108, justifyContent: "center", overflow: "hidden", paddingVertical: 13, paddingLeft: 16, paddingRight: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.card },
  summaryMetricAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  summaryMetricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  summaryMetricValue: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  summaryMetricHint: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 4 },
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
  guestSearchInput: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 12, marginBottom: 10, color: colors.text, backgroundColor: colors.surface },
  sortGuestsLabel: { color: colors.text, fontSize: 13, fontWeight: "700", marginBottom: 5 },
  guestSortButtons: { gap: 4, marginBottom: 10 },
  guestResultCount: { color: colors.text, fontSize: 13, fontWeight: "700", marginBottom: 10 },
  guestCount: { overflow: "hidden", borderRadius: 20, backgroundColor: colors.accentSoft, color: colors.accent, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, fontWeight: "700" },
  emptyState: { color: colors.textMuted, fontSize: 13, lineHeight: 20, paddingVertical: 8 },
  guestCard: { marginTop: 10, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card },
  guestHeading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  guestName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "700" },
  guestStatus: { color: colors.accent, fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  guestContact: { color: colors.textMuted, fontSize: 12, marginTop: 7 },
  rsvpStatus: { color: colors.accent, fontSize: 12, fontWeight: "700", marginTop: 10, textTransform: "capitalize" },
  guestPayment: { fontSize: 12, fontWeight: "700", marginTop: 7 },
  addContributionButton: { alignSelf: "flex-start", minHeight: 34, justifyContent: "center", marginTop: 12, paddingHorizontal: 11, borderRadius: 9, backgroundColor: colors.accentSoft },
  addContributionButtonText: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  contributionsSection: { marginTop: 26, paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.border },
  contributionCard: { marginTop: 10, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card },
  contributionAmount: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 9 },
  paymentStatusBadge: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  paymentPendingBadge: { backgroundColor: colors.accentSoft },
  paymentPaidBadge: { backgroundColor: "#153126" },
  paymentFailedBadge: { backgroundColor: "#351F1D" },
  paymentStatusText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  paymentPendingText: { color: colors.accent },
  paymentPaidText: { color: colors.success },
  paymentFailedText: { color: colors.danger },
  // ── Status Badge ──
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  statusBadgeDraft: { backgroundColor: "#332B12" },
  statusBadgeSuccess: { backgroundColor: "#153126" },
  statusBadgeMuted: { backgroundColor: "#1E1E1E" },
  statusBadgeDanger: { backgroundColor: "#351F1D" },
  statusTextDraft: { color: "#C9A227" },
  statusTextSuccess: { color: colors.success },
  statusTextMuted: { color: colors.textMuted },
  statusTextDanger: { color: colors.danger },
  // ── Quick Actions ──
  quickActionsSection: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
  quickActionsTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 14 },
  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickActionBtn: {
    flexGrow: 1,
    flexBasis: "45%",
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
  },
  quickActionBtnPressed: { opacity: 0.65 },
  quickActionEmoji: { fontSize: 26 },
  quickActionLabel: { color: colors.accent, fontSize: 12, fontWeight: "700", textAlign: "center" },
});
