import { useState } from "react";
import axios from "axios";
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
import { router } from "expo-router";
import api from "../src/services/api";
import { colors } from "../src/constants/theme";

type EventResponse = {
  id: number;
  groom_name: string;
  bride_name: string;
  event_date: string;
  event_time: string;
  venue_name: string;
  venue_address: string;
  status: "draft" | "published" | "completed" | "cancelled";
};

type ApiErrorResponse = {
  message?: unknown;
  detail?: unknown;
  errors?: Array<{ msg?: unknown }>;
};

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function getTodayIsoDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${today.getFullYear()}-${month}-${day}`;
}

export default function CreateEventScreen() {
  const [groomName, setGroomName] = useState("");
  const [brideName, setBrideName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createEvent() {
    if (isSubmitting) return;

    const issue = !groomName.trim()
      ? "Please enter the groom's name."
      : groomName.trim().length < 2
        ? "The groom's name must be at least 2 characters."
        : !brideName.trim()
          ? "Please enter the bride's name."
          : brideName.trim().length < 2
            ? "The bride's name must be at least 2 characters."
            : !isValidIsoDate(eventDate.trim())
              ? "Enter a valid date in YYYY-MM-DD format."
              : eventDate.trim() < getTodayIsoDate()
                ? "The event date cannot be in the past."
                : !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(eventTime.trim())
                  ? "Enter a valid time in 24-hour HH:MM format."
                  : !venueName.trim() || venueName.trim().length < 2
                    ? "Enter a venue name with at least 2 characters."
                    : !venueAddress.trim() || venueAddress.trim().length < 2
                      ? "Enter a venue address with at least 2 characters."
                      : "";

    if (issue) {
      setIsError(true);
      setMessage(issue);
      return;
    }

    setIsError(false);
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post<EventResponse>("/events", {
        groom_name: groomName.trim(),
        bride_name: brideName.trim(),
        event_date: eventDate.trim(),
        event_time: eventTime.trim(),
        venue_name: venueName.trim(),
        venue_address: venueAddress.trim(),
        status: "draft",
      });

      console.log("Event created:", response.data);
      setMessage("Event created successfully.");
      setGroomName("");
      setBrideName("");
      setEventDate("");
      setEventTime("");
      setVenueName("");
      setVenueAddress("");
    } catch (error) {
      const isApiError = axios.isAxiosError<ApiErrorResponse>(error);
      const responseData = isApiError ? error.response?.data : undefined;
      const serverMessage = responseData?.message ?? responseData?.detail;
      const validationMessage = responseData?.errors?.find(
        (item) => typeof item.msg === "string",
      )?.msg;
      const errorMessage =
        isApiError && !error.response
          ? "Unable to reach the server. Check that the backend is running."
          : typeof serverMessage === "string" && serverMessage !== "Validation error"
            ? serverMessage
            : typeof validationMessage === "string"
              ? validationMessage
              : "Could not create the event. Please try again.";

      console.error("Create event failed:", {
        status: isApiError ? error.response?.status : undefined,
        message: errorMessage,
      });
      setIsError(true);
      setMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
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
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹  Dashboard</Text>
          </Pressable>

          <Text style={styles.eyebrow}>A NEW CHAPTER</Text>
          <Text style={styles.title}>Create an event</Text>
          <Text style={styles.subtitle}>
            Add the couple, date and venue to start planning their celebration.
          </Text>

          <Text style={styles.label}>GROOM&apos;S NAME</Text>
          <TextInput
            accessibilityLabel="Groom's name"
            autoCapitalize="words"
            onChangeText={setGroomName}
            placeholder="Groom's full name"
            placeholderTextColor="#827C76"
            returnKeyType="next"
            style={styles.input}
            value={groomName}
          />

          <Text style={styles.label}>BRIDE&apos;S NAME</Text>
          <TextInput
            accessibilityLabel="Bride's name"
            autoCapitalize="words"
            onChangeText={setBrideName}
            placeholder="Bride's full name"
            placeholderTextColor="#827C76"
            returnKeyType="next"
            style={styles.input}
            value={brideName}
          />

          <View style={styles.splitFields}>
            <View style={styles.splitField}>
              <Text style={styles.label}>EVENT DATE</Text>
              <TextInput
                accessibilityLabel="Event date"
                autoCapitalize="none"
                onChangeText={setEventDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#827C76"
                returnKeyType="next"
                style={styles.input}
                value={eventDate}
              />
            </View>
            <View style={styles.splitField}>
              <Text style={styles.label}>TIME</Text>
              <TextInput
                accessibilityLabel="Event time"
                autoCapitalize="none"
                onChangeText={setEventTime}
                placeholder="HH:MM"
                placeholderTextColor="#827C76"
                returnKeyType="next"
                style={styles.input}
                value={eventTime}
              />
            </View>
          </View>

          <Text style={styles.label}>VENUE NAME</Text>
          <TextInput
            accessibilityLabel="Venue name"
            autoCapitalize="words"
            onChangeText={setVenueName}
            placeholder="e.g. Garden Estate"
            placeholderTextColor="#827C76"
            returnKeyType="next"
            style={styles.input}
            value={venueName}
          />

          <Text style={styles.label}>VENUE ADDRESS</Text>
          <TextInput
            accessibilityLabel="Venue address"
            autoCapitalize="sentences"
            multiline
            onChangeText={setVenueAddress}
            placeholder="Street, town or area"
            placeholderTextColor="#827C76"
            returnKeyType="done"
            style={[styles.input, styles.addressInput]}
            textAlignVertical="top"
            value={venueAddress}
          />
          <Text style={styles.helper}>New events are saved as drafts.</Text>

          {message ? (
            <Text accessibilityLiveRegion="polite" style={[styles.message, isError ? styles.error : styles.success]}>
              {message}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting }}
            disabled={isSubmitting}
            onPress={createEvent}
            style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, isSubmitting && styles.disabledButton]}
          >
            <Text style={styles.submitText}>{isSubmitting ? "Creating event…" : "Create event"}</Text>
          </Pressable>
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
  label: { color: "#D3C8B9", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: "#3B3531", borderRadius: 11, backgroundColor: "rgba(255,255,255,0.035)", color: colors.text, paddingHorizontal: 14, fontSize: 14, marginBottom: 16 },
  splitFields: { flexDirection: "row", gap: 12 },
  splitField: { flex: 1 },
  addressInput: { minHeight: 78, paddingTop: 13 },
  helper: { color: colors.textMuted, fontSize: 11, marginTop: -7 },
  message: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  error: { color: "#F0A095" },
  success: { color: colors.success },
  submitButton: { minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.accent, marginTop: 20, paddingHorizontal: 18 },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  disabledButton: { opacity: 0.65 },
});
