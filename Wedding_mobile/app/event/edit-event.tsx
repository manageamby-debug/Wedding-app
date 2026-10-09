import axios from "axios";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import api from "../../src/services/api";
import { colors } from "../../src/constants/theme";

type EventStatus = "draft" | "published" | "completed" | "cancelled";

type EventResponse = {
  id: number;
  name: string;
  description: string | null;
  target_contribution: number | string;
  groom_name: string;
  bride_name: string;
  event_date: string;
  event_time: string;
  venue_name: string;
  venue_address: string;
  status: EventStatus;
};

type ApiErrorResponse = {
  detail?: unknown;
  message?: unknown;
};

const STATUSES: EventStatus[] = ["draft", "published", "completed", "cancelled"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isPositiveId(value: string | undefined): value is string {
  return !!value && /^\d+$/.test(value) && Number(value) >= 1;
}

export default function EditEventScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = firstParam(params.id);

  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [targetContribution, setTargetContribution] = useState("0");
  const [groomName, setGroomName] = useState("");
  const [brideName, setBrideName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [status, setStatus] = useState<EventStatus>("draft");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    if (!isPositiveId(eventId)) {
      setErrorMessage("This event link is invalid. Go back and try again.");
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    async function loadEvent() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await api.get<EventResponse>(`/events/${eventId}`);
        if (!isActive) return;

        const event = response.data;
        setEventName(event.name);
        setDescription(event.description ?? "");
        setTargetContribution(String(event.target_contribution));
        setGroomName(event.groom_name);
        setBrideName(event.bride_name);
        setEventDate(event.event_date);
        setEventTime(event.event_time.slice(0, 5));
        setVenueName(event.venue_name);
        setVenueAddress(event.venue_address);
        setStatus(event.status);
        setIsLoaded(true);
      } catch (requestError) {
        if (!isActive) return;

        setErrorMessage(
          axios.isAxiosError(requestError) && !requestError.response
            ? "Cannot reach the server. Check that the backend is running."
            : axios.isAxiosError(requestError) && requestError.response?.status === 404
              ? "Event not found, or you do not have access to it."
              : "Could not load this event. Check your connection and try again.",
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadEvent();

    return () => {
      isActive = false;
    };
  }, [eventId, retryCount]);

  async function updateEvent() {
    if (isSaving) return;

    if (!isPositiveId(eventId)) {
      setErrorMessage("This event link is invalid. Go back and try again.");
      return;
    }

    const name = eventName.trim();
    const groom = groomName.trim();
    const bride = brideName.trim();
    const target = Number(targetContribution.trim());
    const date = eventDate.trim();
    const time = eventTime.trim();
    const venue = venueName.trim();
    const address = venueAddress.trim();

    if (name.length < 2 || name.length > 255) {
      setErrorMessage("Enter an event name between 2 and 255 characters.");
      return;
    }
    if (groom.length < 2 || groom.length > 100) {
      setErrorMessage("The groom's name must be between 2 and 100 characters.");
      return;
    }
    if (bride.length < 2 || bride.length > 100) {
      setErrorMessage("The bride's name must be between 2 and 100 characters.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setErrorMessage("Enter the date as YYYY-MM-DD, for example 2026-12-20.");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) {
      setErrorMessage("Enter the time as HH:MM in 24-hour format, for example 16:30.");
      return;
    }
    if (venue.length < 2 || venue.length > 150) {
      setErrorMessage("The venue name must be between 2 and 150 characters.");
      return;
    }
    if (address.length < 2 || address.length > 255) {
      setErrorMessage("The venue address must be between 2 and 255 characters.");
      return;
    }
    if (!Number.isFinite(target) || target < 0 || !/^\d{1,12}(\.\d{1,2})?$/.test(targetContribution.trim())) {
      setErrorMessage("Enter a valid contribution target with up to 2 decimal places.");
      return;
    }
    if (description.trim().length > 5000) {
      setErrorMessage("Description must be 5,000 characters or fewer.");
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      const response = await api.put<EventResponse>(`/events/${eventId}`, {
        name,
        description: description.trim() || null,
        target_contribution: target,
        groom_name: groom,
        bride_name: bride,
        event_date: date,
        event_time: time,
        venue_name: venue,
        venue_address: address,
        status,
      });

      console.log("Event updated:", response.data);
      router.back();
    } catch (requestError) {
      const isApiError = axios.isAxiosError<ApiErrorResponse>(requestError);
      const detail = isApiError ? requestError.response?.data?.detail : undefined;
      const validationMessage = Array.isArray(detail)
        ? detail.find((item) => typeof item?.msg === "string")?.msg
        : undefined;
      const message =
        isApiError && !requestError.response
          ? "Cannot reach the server. Check that the backend is running."
          : typeof detail === "string"
            ? detail
            : typeof validationMessage === "string"
              ? validationMessage
              : "Could not update this event. Please try again.";

      console.error("Update event failed:", {
        status: isApiError ? requestError.response?.status : undefined,
        message,
      });
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹  Event Details</Text>
          </Pressable>

          <Text style={styles.eyebrow}>EVENT · #{eventId ?? "—"}</Text>
          <Text style={styles.title}>Edit event</Text>
          <Text style={styles.subtitle}>Update the details of this event.</Text>

          {isLoading ? <Text style={styles.message}>Loading event details…</Text> : null}

          {errorMessage && !isLoading && !isLoaded ? (
            <View style={styles.errorBlock}>
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

          {!isLoading && isLoaded ? (
            <>
              <Text style={styles.label}>EVENT NAME</Text>
              <TextInput
                accessibilityLabel="Event name"
                editable={!isSaving}
                maxLength={255}
                onChangeText={setEventName}
                placeholder="Wedding celebration"
                placeholderTextColor="#827C76"
                style={styles.input}
                value={eventName}
              />

              <Text style={styles.label}>GROOM NAME</Text>
              <TextInput
                accessibilityLabel="Groom name"
                autoCapitalize="words"
                editable={!isSaving}
                maxLength={100}
                onChangeText={setGroomName}
                placeholder="Groom's name"
                placeholderTextColor="#827C76"
                style={styles.input}
                value={groomName}
              />

              <Text style={styles.label}>BRIDE NAME</Text>
              <TextInput
                accessibilityLabel="Bride name"
                autoCapitalize="words"
                editable={!isSaving}
                maxLength={100}
                onChangeText={setBrideName}
                placeholder="Bride's name"
                placeholderTextColor="#827C76"
                style={styles.input}
                value={brideName}
              />

              <Text style={styles.label}>DATE · YYYY-MM-DD</Text>
              <TextInput
                accessibilityLabel="Event date"
                autoCapitalize="none"
                editable={!isSaving}
                maxLength={10}
                onChangeText={setEventDate}
                placeholder="2026-12-20"
                placeholderTextColor="#827C76"
                style={styles.input}
                value={eventDate}
              />

              <Text style={styles.label}>TIME · HH:MM (24-HOUR)</Text>
              <TextInput
                accessibilityLabel="Event time"
                autoCapitalize="none"
                editable={!isSaving}
                maxLength={8}
                onChangeText={setEventTime}
                placeholder="16:30"
                placeholderTextColor="#827C76"
                style={styles.input}
                value={eventTime}
              />

              <Text style={styles.label}>VENUE NAME</Text>
              <TextInput
                accessibilityLabel="Venue name"
                editable={!isSaving}
                maxLength={150}
                onChangeText={setVenueName}
                placeholder="Venue name"
                placeholderTextColor="#827C76"
                style={styles.input}
                value={venueName}
              />

              <Text style={styles.label}>VENUE ADDRESS</Text>
              <TextInput
                accessibilityLabel="Venue address"
                editable={!isSaving}
                maxLength={255}
                onChangeText={setVenueAddress}
                placeholder="Venue address"
                placeholderTextColor="#827C76"
                style={styles.input}
                value={venueAddress}
              />

              <Text style={styles.label}>CONTRIBUTION TARGET · TSh</Text>
              <TextInput
                accessibilityLabel="Contribution target"
                editable={!isSaving}
                keyboardType="decimal-pad"
                onChangeText={setTargetContribution}
                placeholder="0"
                placeholderTextColor="#827C76"
                style={styles.input}
                value={targetContribution}
              />

              <Text style={styles.label}>DESCRIPTION · OPTIONAL</Text>
              <TextInput
                accessibilityLabel="Event description"
                editable={!isSaving}
                maxLength={5000}
                multiline
                onChangeText={setDescription}
                placeholder="Share details about the celebration"
                placeholderTextColor="#827C76"
                style={[styles.input, styles.multilineInput]}
                textAlignVertical="top"
                value={description}
              />

              <Text style={styles.label}>STATUS</Text>
              <View style={styles.statusRow}>
                {STATUSES.map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: status === option, disabled: isSaving }}
                    disabled={isSaving}
                    onPress={() => setStatus(option)}
                    style={[styles.statusChip, status === option && styles.statusChipActive]}
                  >
                    <Text style={[styles.statusChipText, status === option && styles.statusChipTextActive]}>
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {errorMessage ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isSaving }}
                disabled={isSaving}
                onPress={updateEvent}
                style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, isSaving && styles.disabledButton]}
              >
                <Text style={styles.submitText}>{isSaving ? "Saving event…" : "Save changes"}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 560, padding: 24, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontSize: 27, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 24 },
  message: { color: colors.textMuted, fontSize: 14 },
  errorBlock: { marginBottom: 16 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  retryButton: { alignSelf: "flex-start", marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, backgroundColor: colors.accentSoft },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  label: { color: "#D3C8B9", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: "#3B3531", borderRadius: 11, backgroundColor: "rgba(255,255,255,0.035)", color: colors.text, paddingHorizontal: 14, fontSize: 14, marginBottom: 16 },
  multilineInput: { minHeight: 110, paddingTop: 12 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#3B3531", borderRadius: 20 },
  statusChipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  statusChipText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  statusChipTextActive: { color: colors.accent },
  submitButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabledButton: { opacity: 0.55 },
});
