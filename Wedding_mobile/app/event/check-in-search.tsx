import axios from "axios";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import api from "../../src/services/api";
import { colors } from "../../src/constants/theme";

type ApiErrorResponse = {
  detail?: string | { msg?: string }[];
  message?: string;
};

type FoundGuest = {
  guest_id: number;
  guest_name: string;
  guest_code: string;
  phone: string | null;
  email: string | null;
  check_in_status: string;
  checked_in_at: string | null;
};

type CheckInResponse = {
  message: string;
  guest_id: number;
  guest_name: string;
  guest_code: string;
  check_in_status: string;
  checked_in_at: string | null;
};

export default function CheckInSearch() {
  const { id, code: scannedParam } = useLocalSearchParams<{ id: string; code?: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const scannedCode = Array.isArray(scannedParam) ? scannedParam[0] : scannedParam;
  const router = useRouter();

  const [guestCode, setGuestCode] = useState("");
  const [guest, setGuest] = useState<FoundGuest | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  async function searchGuest(codeOverride?: string) {
    if (loading) return;

    const code = (typeof codeOverride === "string" ? codeOverride : guestCode).trim();

    if (!eventId || !/^\d+$/.test(eventId) || Number(eventId) < 1) {
      setErrorMessage("The event link is invalid. Return to Event Details and try again.");
      return;
    }

    if (!code) {
      setErrorMessage("Enter a guest code.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setGuest(null);
    setLoading(true);

    try {
      const response = await api.get<FoundGuest>(
        `/events/${eventId}/check-in/${encodeURIComponent(code)}`,
      );

      console.log("Guest search:", response.data);
      setGuest(response.data);
    } catch (requestError) {
      const isApiError = axios.isAxiosError<ApiErrorResponse>(requestError);
      const data = isApiError ? requestError.response?.data : undefined;
      const detail = Array.isArray(data?.detail)
        ? data.detail.find((item) => typeof item?.msg === "string")?.msg
        : data?.detail;
      const message = isApiError && !requestError.response
        ? "Cannot reach the server. Check that the backend is running."
        : isApiError && requestError.response?.status === 404
          ? "No guest with this code in this event."
          : typeof detail === "string"
            ? detail
            : data?.message ?? "Could not search for this guest. Please try again.";

      console.error("Guest search failed:", message);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  // Arriving from the QR scanner: fill in the scanned code and look the guest up.
  useEffect(() => {
    if (!scannedCode) return;

    setGuestCode(scannedCode);
    void searchGuest(scannedCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedCode]);

  async function checkInGuest() {
    if (checkingIn || !guest) return;

    setErrorMessage("");
    setSuccessMessage("");
    setCheckingIn(true);

    try {
      const response = await api.post<CheckInResponse>(
        `/events/${eventId}/check-in/${encodeURIComponent(guest.guest_code)}`,
      );

      console.log("Guest checked in:", response.data);
      setGuest((current) => current
        ? {
          ...current,
          check_in_status: response.data.check_in_status,
          checked_in_at: response.data.checked_in_at,
        }
        : current);
      setSuccessMessage(`${response.data.guest_name} has been checked in.`);
    } catch (requestError) {
      const isApiError = axios.isAxiosError<ApiErrorResponse>(requestError);
      const data = isApiError ? requestError.response?.data : undefined;
      const detail = Array.isArray(data?.detail)
        ? data.detail.find((item) => typeof item?.msg === "string")?.msg
        : data?.detail;
      const alreadyCheckedIn = isApiError && requestError.response?.status === 409;
      const message = isApiError && !requestError.response
        ? "Cannot reach the server. Check that the backend is running."
        : alreadyCheckedIn
          ? "This guest is already checked in."
          : typeof detail === "string"
            ? detail
            : data?.message ?? "Could not check in this guest. Please try again.";

      if (alreadyCheckedIn) {
        setGuest((current) => current ? { ...current, check_in_status: "checked_in" } : current);
      }

      console.error("Check-in failed:", message);
      setErrorMessage(message);
    } finally {
      setCheckingIn(false);
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
        <Text style={styles.subtitle}>Find a guest by guest code or invitation code, or scan their QR code.</Text>
        <Text style={styles.label}>CODE</Text>
        <TextInput
          autoCapitalize="characters"
          autoCorrect={false}
          onChangeText={setGuestCode}
          onSubmitEditing={() => searchGuest()}
          placeholder="Guest or invitation code"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          style={styles.input}
          value={guestCode}
        />
        {errorMessage ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          disabled={loading}
          onPress={() => searchGuest()}
          style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, loading && styles.disabledButton]}
        >
          <Text style={styles.submitText}>{loading ? "Searching…" : "Search Guest"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace(`/event/scan?id=${eventId ?? ""}`)}
          style={styles.scanButton}
        >
          <Text style={styles.scanButtonText}>Scan QR Code</Text>
        </Pressable>

        {guest ? (
          <View style={styles.result}>
            <Text style={styles.resultName}>{guest.guest_name}</Text>
            <Text style={styles.resultLine}>Phone: {guest.phone || "No phone provided"}</Text>
            <Text style={styles.resultLine}>Code: {guest.guest_code}</Text>
            <Text style={styles.resultStatus}>
              {guest.check_in_status === "checked_in" ? "Checked in" : "Not checked in"}
            </Text>
            {successMessage ? (
              <Text accessibilityLiveRegion="polite" style={styles.success}>{successMessage}</Text>
            ) : null}
            {guest.check_in_status !== "checked_in" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: checkingIn }}
                disabled={checkingIn}
                onPress={checkInGuest}
                style={({ pressed }) => [styles.checkInButton, pressed && styles.pressed, checkingIn && styles.disabledButton]}
              >
                <Text style={styles.submitText}>{checkingIn ? "Checking in…" : "Check In Guest"}</Text>
              </Pressable>
            ) : (
              <Text accessibilityLiveRegion="polite" style={styles.alreadyCheckedIn}>Guest Already Checked In ✓</Text>
            )}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: "center", justifyContent: "flex-start", padding: 22, paddingTop: 26, backgroundColor: colors.background },
  card: { width: "100%", maxWidth: 620, padding: 24, borderRadius: 26, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontFamily: "Georgia", fontSize: 38, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 8, marginBottom: 24 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  input: { minHeight: 48, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.card, color: colors.text, fontSize: 15 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  submitButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabledButton: { opacity: 0.55 },
  scanButton: { minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 10, borderWidth: 1, borderColor: colors.accent, borderRadius: 11, backgroundColor: colors.accentSoft },
  scanButtonText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  result: { marginTop: 20, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card },
  resultName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  resultLine: { color: colors.textMuted, fontSize: 12, marginTop: 7 },
  resultStatus: { color: colors.accent, fontSize: 12, fontWeight: "700", marginTop: 10 },
  success: { color: colors.accent, fontSize: 13, lineHeight: 19, marginTop: 10 },
  alreadyCheckedIn: { color: colors.accent, fontSize: 14, fontWeight: "700", marginTop: 14 },
  checkInButton: { minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 16, borderRadius: 11, backgroundColor: colors.accent },
});
