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

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isPositiveId(value: string | undefined): value is string {
  return !!value && /^\d+$/.test(value) && Number(value) >= 1;
}

export default function EditGuestScreen() {
  const params = useLocalSearchParams<{ guestId: string; eventId: string }>();
  const guestId = firstParam(params.guestId);
  const eventId = firstParam(params.eventId);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    if (!isPositiveId(guestId) || !isPositiveId(eventId)) {
      setErrorMessage("This guest link is invalid. Return to Guest Details and try again.");
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    async function loadGuest() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await api.get<GuestResponse[]>(`/events/${eventId}/guest`);
        if (!isActive) return;

        const guest = response.data.find((item) => item.id === Number(guestId));
        if (!guest) {
          setErrorMessage("Guest not found in this event.");
          return;
        }

        setFullName(guest.full_name);
        setPhone(guest.phone ?? "");
        setEmail(guest.email ?? "");
      } catch (requestError) {
        if (!isActive) return;

        const message = axios.isAxiosError(requestError) && !requestError.response
          ? "Cannot reach the server. Check that the backend is running."
          : axios.isAxiosError(requestError) && requestError.response?.status === 404
            ? "Event or guest not found, or you do not have access to it."
            : "Could not load this guest. Check your connection and try again.";
        setErrorMessage(message);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadGuest();

    return () => {
      isActive = false;
    };
  }, [guestId, eventId, retryCount]);

  async function updateGuest() {
    if (isSaving) return;

    if (!isPositiveId(guestId) || !isPositiveId(eventId)) {
      setErrorMessage("This guest link is invalid. Return to Guest Details and try again.");
      return;
    }

    const name = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (name.length < 2 || name.length > 100) {
      setErrorMessage("The guest's name must be between 2 and 100 characters.");
      return;
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage("Enter a valid email address, or leave it blank.");
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      const response = await api.put<GuestResponse>(`/guests/${guestId}`, {
        full_name: name,
        phone: cleanPhone || null,
        email: cleanEmail || null,
      });

      console.log("Guest updated:", response.data);
      router.back();
    } catch (requestError) {
      const isApiError = axios.isAxiosError<ApiErrorResponse>(requestError);
      const responseData = isApiError ? requestError.response?.data : undefined;
      const serverMessage = responseData?.detail ?? responseData?.message;
      const validationMessage = responseData?.errors?.find(
        (item) => typeof item.msg === "string",
      )?.msg ?? (Array.isArray(responseData?.detail)
        ? responseData.detail.find((item) => typeof item?.msg === "string")?.msg
        : undefined);
      const message =
        isApiError && !requestError.response
          ? "Cannot reach the server. Check that the backend is running."
          : typeof serverMessage === "string"
            ? serverMessage
            : typeof validationMessage === "string"
              ? validationMessage
              : "Could not update this guest. Please try again.";

      console.error("Update guest failed:", {
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
            <Text style={styles.backText}>‹  Guest Details</Text>
          </Pressable>

          <Text style={styles.eyebrow}>GUEST · #{guestId ?? "—"}</Text>
          <Text style={styles.title}>Edit guest</Text>
          <Text style={styles.subtitle}>Update this guest's contact details. Guest code and event stay unchanged.</Text>

          {isLoading ? <Text style={styles.message}>Loading guest details…</Text> : null}

          {errorMessage && !isLoading ? (
            <View style={styles.errorBlock}>
              <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text>
              {!fullName ? (
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
              ) : null}
            </View>
          ) : null}

          {!isLoading && fullName ? (
            <>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                accessibilityLabel="Guest full name"
                autoCapitalize="words"
                editable={!isSaving}
                maxLength={100}
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
                editable={!isSaving}
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
                editable={!isSaving}
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
                accessibilityState={{ disabled: isSaving }}
                disabled={isSaving}
                onPress={updateGuest}
                style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, isSaving && styles.disabledButton]}
              >
                <Text style={styles.submitText}>{isSaving ? "Updating guest…" : "Save changes"}</Text>
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
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: "flex-start", marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, backgroundColor: colors.accentSoft },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  label: { color: "#D3C8B9", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: "#3B3531", borderRadius: 11, backgroundColor: "rgba(255,255,255,0.035)", color: colors.text, paddingHorizontal: 14, fontSize: 14, marginBottom: 16 },
  submitButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabledButton: { opacity: 0.55 },
});
