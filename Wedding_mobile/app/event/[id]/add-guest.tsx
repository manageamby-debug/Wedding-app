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
import { router, useLocalSearchParams } from "expo-router";
import api from "../../../src/services/api";
import { colors } from "../../../src/constants/theme";

type GuestResponse = {
  id: number;
  event_id: number;
  full_name: string;
  guest_code: string;
  check_in_status: string;
  phone: string | null;
  email: string | null;
};

type ApiErrorResponse = {
  detail?: unknown;
  message?: unknown;
  errors?: Array<{ msg?: unknown }>;
};

export default function AddGuestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function addGuest() {
    if (isSubmitting) return;

    if (!eventId || !/^\d+$/.test(eventId) || Number(eventId) < 1) {
      setErrorMessage("This event link is invalid. Return to My Events and try again.");
      return;
    }

    const name = fullName.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();

    if (name.length < 2) {
      setErrorMessage("Enter the guest's full name (at least 2 characters).");
      return;
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage("Enter a valid email address, or leave it blank.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post<GuestResponse>(`/events/${eventId}/guest`, {
        full_name: name,
        phone: cleanPhone || null,
        email: cleanEmail ? cleanEmail.toLowerCase() : null,
      });

      console.log("Guest created:", response.data);
      router.replace(`/event/${eventId}`);
    } catch (requestError) {
      const isApiError = axios.isAxiosError<ApiErrorResponse>(requestError);
      const responseData = isApiError ? requestError.response?.data : undefined;
      const serverMessage = responseData?.detail ?? responseData?.message;
      const validationMessage = responseData?.errors?.find(
        (item) => typeof item.msg === "string",
      )?.msg;

      const message =
        isApiError && !requestError.response
          ? "Cannot reach the server. Check that the backend is running."
          : typeof serverMessage === "string"
            ? serverMessage
            : typeof validationMessage === "string"
              ? validationMessage
              : "Could not add this guest. Please try again.";

      console.error("Create guest failed:", {
        status: isApiError ? requestError.response?.status : undefined,
        message,
      });
      setErrorMessage(message);
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
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(`/event/${eventId}`)}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹  Event Details</Text>
          </Pressable>

          <Text style={styles.eyebrow}>EVENT · #{eventId ?? "—"}</Text>
          <Text style={styles.title}>Add a guest</Text>
          <Text style={styles.subtitle}>
            Add someone to the guest list. Phone and email are optional.
          </Text>

          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            accessibilityLabel="Guest full name"
            autoCapitalize="words"
            editable={!isSubmitting}
            onChangeText={setFullName}
            placeholder="Guest's full name"
            placeholderTextColor="#827C76"
            returnKeyType="next"
            style={styles.input}
            value={fullName}
          />

          <Text style={styles.label}>PHONE · OPTIONAL</Text>
          <TextInput
            accessibilityLabel="Guest phone number, optional"
            autoCapitalize="none"
            editable={!isSubmitting}
            keyboardType="phone-pad"
            onChangeText={setPhone}
            placeholder="e.g. +255 712 345 678"
            placeholderTextColor="#827C76"
            returnKeyType="next"
            style={styles.input}
            value={phone}
          />

          <Text style={styles.label}>EMAIL · OPTIONAL</Text>
          <TextInput
            accessibilityLabel="Guest email address, optional"
            autoCapitalize="none"
            autoComplete="email"
            editable={!isSubmitting}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="guest@example.com"
            placeholderTextColor="#827C76"
            returnKeyType="done"
            style={styles.input}
            value={email}
          />

          {errorMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting }}
            disabled={isSubmitting}
            onPress={addGuest}
            style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, isSubmitting && styles.disabledButton]}
          >
            <Text style={styles.submitText}>{isSubmitting ? "Adding guest…" : "Add Guest"}</Text>
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
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  submitButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabledButton: { opacity: 0.55 },
});
