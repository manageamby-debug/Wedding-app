import axios from "axios";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import api from "../../src/services/api";
import { colors } from "../../src/constants/theme";

type ApiErrorResponse = {
  detail?: string | { msg?: string }[];
  message?: string;
};

type CheckInResponse = {
  message: string;
  guest_id: number;
  guest_name: string;
  guest_code: string;
  check_in_status: string;
  checked_in_at: string | null;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function CheckIn() {
  const params = useLocalSearchParams<{
    id: string;
    guestId: string;
    guestCode: string;
    guestName: string;
  }>();
  const eventId = firstParam(params.id);
  const guestId = firstParam(params.guestId);
  const guestCode = firstParam(params.guestCode);
  const guestName = firstParam(params.guestName);
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkInGuest() {
    if (loading) return;

    if (!eventId || !/^\d+$/.test(eventId) || Number(eventId) < 1 || !guestCode) {
      setErrorMessage("The event or guest link is invalid. Return to Event Details and try again.");
      return;
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const response = await api.post<CheckInResponse>(
        `/events/${eventId}/check-in/${encodeURIComponent(guestCode)}`,
      );

      console.log("Guest checked in:", response.data);
      router.replace(`/event/${eventId}`);
    } catch (requestError) {
      const isApiError = axios.isAxiosError<ApiErrorResponse>(requestError);
      const data = isApiError ? requestError.response?.data : undefined;
      const detail = Array.isArray(data?.detail)
        ? data.detail.find((item) => typeof item?.msg === "string")?.msg
        : data?.detail;
      const message = isApiError && !requestError.response
        ? "Cannot reach the server. Check that the backend is running."
        : isApiError && requestError.response?.status === 409
          ? "This guest is already checked in."
          : typeof detail === "string"
            ? detail
            : data?.message ?? "Could not check in this guest. Please try again.";

      console.error("Check-in failed:", message);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Pressable accessibilityRole="button" onPress={() => router.replace(`/event/${eventId ?? ""}`)} style={styles.backButton}>
          <Text style={styles.backText}>‹  Event Details</Text>
        </Pressable>
        <Text style={styles.eyebrow}>EVENT · #{eventId ?? "—"}</Text>
        <Text style={styles.title}>Guest Check-in</Text>
        <Text style={styles.subtitle}>
          {guestName ? `${guestName} · ` : ""}Guest ID: {guestId ?? "—"}
        </Text>
        <Text style={styles.label}>GUEST CODE</Text>
        <Text style={styles.code}>{guestCode ?? "—"}</Text>
        <Text style={styles.helper}>Confirm this guest has arrived at the event.</Text>
        {errorMessage ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          disabled={loading}
          onPress={checkInGuest}
          style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, loading && styles.disabledButton]}
        >
          <Text style={styles.submitText}>{loading ? "Checking in…" : "Check In Guest"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: colors.background },
  card: { width: "100%", maxWidth: 560, padding: 24, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontSize: 27, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 8, marginBottom: 24 },
  label: { color: "#D3C8B9", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  code: { color: colors.text, fontSize: 18, fontWeight: "700", letterSpacing: 1 },
  helper: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 18 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  submitButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabledButton: { opacity: 0.55 },
});
