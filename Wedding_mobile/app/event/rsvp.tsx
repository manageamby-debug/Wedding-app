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

type RSVPStatus = "attending" | "not_attending" | "maybe";

type InvitationResponse = {
  short_code: string;
};

export default function RSVP() {
  const { id, guestId } = useLocalSearchParams<{ id: string; guestId: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const currentGuestId = Array.isArray(guestId) ? guestId[0] : guestId;
  const router = useRouter();
  const [status, setStatus] = useState<RSVPStatus | "">("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitRSVP() {
    if (loading) return;

    if (!eventId || !/^\d+$/.test(eventId) || Number(eventId) < 1
      || !currentGuestId || !/^\d+$/.test(currentGuestId) || Number(currentGuestId) < 1) {
      setErrorMessage("The event or guest link is invalid. Return to Event Details and try again.");
      return;
    }

    if (!status) {
      setErrorMessage("Choose an RSVP response.");
      return;
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const invitation = await api.post<InvitationResponse>("/invitations", {
        guest_id: Number(currentGuestId),
      });
      const shortCode = encodeURIComponent(invitation.data.short_code);
      let isUpdate = false;

      try {
        await api.get(`/rsvp/${shortCode}`);
        isUpdate = true;
      } catch (lookupError) {
        const rsvpDoesNotExist =
          axios.isAxiosError(lookupError) && lookupError.response?.status === 404;
        if (!rsvpDoesNotExist) throw lookupError;
      }

      const response = await api.post(
        `/rsvp/${shortCode}`,
        { status },
      );

      console.log(isUpdate ? "RSVP updated:" : "RSVP created:", response.data);
      router.replace(`/event/${eventId}`);
    } catch (requestError) {
      const isApiError = axios.isAxiosError<ApiErrorResponse>(requestError);
      const data = isApiError ? requestError.response?.data : undefined;
      const detail = Array.isArray(data?.detail)
        ? data.detail.find((item) => typeof item?.msg === "string")?.msg
        : data?.detail;
      const message = isApiError && !requestError.response
        ? "Cannot reach the server. Check that the backend is running."
        : typeof detail === "string"
          ? detail
          : data?.message ?? "Could not save this RSVP. Please try again.";

      console.error("RSVP failed:", message);
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
        <Text style={styles.title}>Update RSVP</Text>
        <Text style={styles.subtitle}>Guest ID: {currentGuestId ?? "—"}</Text>
        <Text style={styles.label}>RESPONSE</Text>
        <View style={styles.statusOptions}>
          {([
            { value: "attending", label: "Attending" },
            { value: "not_attending", label: "Not attending" },
            { value: "maybe", label: "Maybe" },
          ] as const).map((option) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: status === option.value, disabled: loading }}
              disabled={loading}
              key={option.value}
              onPress={() => setStatus(option.value)}
              style={[styles.statusOption, status === option.value && styles.selectedOption]}
            >
              <Text style={[styles.statusOptionText, status === option.value && styles.selectedOptionText]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.helper}>This updates the guest’s existing response, or creates one if they have not responded yet.</Text>
        {errorMessage ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          disabled={loading}
          onPress={submitRSVP}
          style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, loading && styles.disabledButton]}
        >
          <Text style={styles.submitText}>{loading ? "Saving RSVP…" : "Save RSVP"}</Text>
        </Pressable>
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
  statusOptions: { gap: 9 },
  statusOption: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.card },
  selectedOption: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  statusOptionText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  selectedOptionText: { color: colors.accent },
  helper: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 18 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  submitButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabledButton: { opacity: 0.55 },
});
