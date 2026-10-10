import axios from "axios";
import { useState } from "react";
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
  name: string;
  couple_names: string;
  groom_name: string;
  bride_name: string;
  event_date: string;
  event_time: string;
  venue: string;
  venue_name: string;
  venue_address: string;
  description: string | null;
  target_contribution: number | string;
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
  const [name, setName] = useState("");
  const [coupleNames, setCoupleNames] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [targetContribution, setTargetContribution] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createEvent() {
    if (isSubmitting) return;

    const eventName = name.trim();
    const couple = coupleNames.trim();
    const date = eventDate.trim();
    const time = eventTime.trim();
    const eventVenue = venue.trim();
    const rawTarget = targetContribution.trim();
    const targetAmount = rawTarget ? Number(rawTarget) : 0;
    const coupleParts = couple.split("&", 2).map((part) => part.trim());

    const issue = !eventName || eventName.length < 2 || eventName.length > 255
      ? "Enter an event name between 2 and 255 characters."
      : coupleParts.length !== 2 || coupleParts.some((part) => part.length < 2 || part.length > 100)
        ? "Enter both couple names separated by '&', for example John & Mary."
        : !isValidIsoDate(date)
          ? "Enter a valid date in YYYY-MM-DD format."
          : date < getTodayIsoDate()
            ? "The event date cannot be in the past."
            : !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
              ? "Enter a valid time in 24-hour HH:MM format."
              : eventVenue.length < 2 || eventVenue.length > 255
                ? "Enter a venue between 2 and 255 characters."
                : description.trim().length > 5000
                  ? "Description must be 5,000 characters or fewer."
                  : !Number.isFinite(targetAmount) || targetAmount < 0 || !/^\d{1,12}(\.\d{1,2})?$/.test(rawTarget || "0")
                    ? "Enter a target contribution amount with up to 2 decimal places."
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
        name: eventName,
        couple_names: couple,
        event_date: date,
        event_time: time,
        venue: eventVenue,
        description: description.trim() || null,
        target_contribution: targetAmount,
        status: "draft",
      });

      console.log("Event created:", response.data);
      router.replace("/dashboard");
    } catch (error) {
      const isApiError = axios.isAxiosError<ApiErrorResponse>(error);
      const responseData = isApiError ? error.response?.data : undefined;
      const serverMessage = responseData?.message ?? responseData?.detail;
      const validationMessage = responseData?.errors?.find(
        (item) => typeof item.msg === "string",
      )?.msg ?? (Array.isArray(responseData?.detail)
        ? responseData.detail.find((item) => typeof item?.msg === "string")?.msg
        : undefined);
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
            Add the celebration details, then invite guests and start planning.
          </Text>

          <Text style={styles.label}>EVENT NAME</Text>
          <TextInput
            accessibilityLabel="Event name"
            autoCapitalize="words"
            editable={!isSubmitting}
            maxLength={255}
            onChangeText={setName}
            placeholder="Wedding Ceremony"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            style={styles.input}
            value={name}
          />

          <Text style={styles.label}>COUPLE NAMES</Text>
          <TextInput
            accessibilityLabel="Couple names"
            autoCapitalize="words"
            editable={!isSubmitting}
            maxLength={203}
            onChangeText={setCoupleNames}
            placeholder="John & Mary"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            style={styles.input}
            value={coupleNames}
          />

          <View style={styles.splitFields}>
            <View style={styles.splitField}>
              <Text style={styles.label}>EVENT DATE</Text>
              <TextInput
                accessibilityLabel="Event date"
                autoCapitalize="none"
                editable={!isSubmitting}
                maxLength={10}
                onChangeText={setEventDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
                style={styles.input}
                value={eventDate}
              />
            </View>
            <View style={styles.splitField}>
              <Text style={styles.label}>TIME · 24-HOUR</Text>
              <TextInput
                accessibilityLabel="Event time"
                autoCapitalize="none"
                editable={!isSubmitting}
                maxLength={5}
                onChangeText={setEventTime}
                placeholder="HH:MM"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
                style={styles.input}
                value={eventTime}
              />
            </View>
          </View>

          <Text style={styles.label}>VENUE</Text>
          <TextInput
            accessibilityLabel="Venue"
            autoCapitalize="words"
            editable={!isSubmitting}
            maxLength={255}
            onChangeText={setVenue}
            placeholder="Shinyanga Hotel"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            style={styles.input}
            value={venue}
          />

          <Text style={styles.label}>DESCRIPTION · OPTIONAL</Text>
          <TextInput
            accessibilityLabel="Event description, optional"
            autoCapitalize="sentences"
            editable={!isSubmitting}
            maxLength={5000}
            multiline
            onChangeText={setDescription}
            placeholder="Tell guests about the celebration"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            style={[styles.input, styles.descriptionInput]}
            textAlignVertical="top"
            value={description}
          />

          <Text style={styles.label}>TARGET CONTRIBUTION · TSH</Text>
          <TextInput
            accessibilityLabel="Target contribution in Tanzanian shillings"
            editable={!isSubmitting}
            keyboardType="decimal-pad"
            maxLength={15}
            onChangeText={setTargetContribution}
            placeholder="5000000"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={styles.input}
            value={targetContribution}
          />
          <Text style={styles.helper}>Leave blank if there is no contribution target. New events are saved as drafts.</Text>

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
  content: { flexGrow: 1, alignItems: "center", justifyContent: "flex-start", padding: 22, paddingTop: 26 },
  card: { width: "100%", maxWidth: 620, padding: 24, borderRadius: 26, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontFamily: "Georgia", fontSize: 38, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 23, marginTop: 8, marginBottom: 24 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.card, color: colors.text, paddingHorizontal: 14, fontSize: 14, marginBottom: 16 },
  splitFields: { flexDirection: "row", gap: 12 },
  splitField: { flex: 1 },
  descriptionInput: { minHeight: 92, paddingTop: 13 },
  helper: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: -7 },
  message: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  error: { color: colors.danger },
  success: { color: colors.success },
  submitButton: { minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.accent, marginTop: 20, paddingHorizontal: 18 },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  disabledButton: { opacity: 0.65 },
});
