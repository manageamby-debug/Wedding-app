import axios from "axios";
import { useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import api from "../../src/services/api";
import InvitationCode from "../../src/components/InvitationCode";
import { colors } from "../../src/constants/theme";

type ApiErrorResponse = {
  detail?: string | { msg?: string }[];
  message?: string;
};

type InvitationData = {
  id: number;
  guest_id: number;
  guest_name: string;
  groom_name: string;
  bride_name: string;
  event_date: string;
  event_time: string;
  venue_name: string;
  venue_address: string;
  invitation_code: string;
  short_code: string;
  status: string;
  created_at: string;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function Invitation() {
  const params = useLocalSearchParams<{ id: string; guestId: string; guestName: string; guestCode: string }>();
  const eventId = firstParam(params.id);
  const guestId = firstParam(params.guestId);
  const guestName = firstParam(params.guestName);
  const guestCode = firstParam(params.guestCode);
  const router = useRouter();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareError, setShareError] = useState("");

  async function createInvitation() {
    if (loading) return;

    if (!guestId || !/^\d+$/.test(guestId) || Number(guestId) < 1) {
      setErrorMessage("The guest link is invalid. Return to Event Details and try again.");
      return;
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const response = await api.post<InvitationData>("/invitations", {
        guest_id: Number(guestId),
      });

      console.log("Invitation created:", response.data);
      setInvitation(response.data);
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
          : data?.message ?? "Could not create this invitation. Please try again.";

      console.error("Create invitation failed:", message);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  const inviteLink = invitation ? `${api.defaults.baseURL}/invite/${invitation.short_code}` : "";

  async function shareInvitation() {
    if (!invitation) return;

    setShareError("");

    try {
      await Share.share({
        message: `${invitation.guest_name}, you are invited to the wedding of ${invitation.groom_name} & ${invitation.bride_name}! ${inviteLink}`,
      });
    } catch (shareFailure) {
      const reason = shareFailure instanceof Error ? shareFailure.message : "Unknown error";

      console.error("Share invitation failed:", reason);
      setShareError("Sharing is not available here. Copy the link above and send it manually.");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Pressable accessibilityRole="button" onPress={() => router.replace(`/event/${eventId ?? ""}`)} style={styles.backButton}>
          <Text style={styles.backText}>‹  Event Details</Text>
        </Pressable>
        <Text style={styles.eyebrow}>EVENT · #{eventId ?? "—"}</Text>
        <Text style={styles.title}>Guest Invitation</Text>
        <Text style={styles.subtitle}>
          {guestName ? `${guestName} · ` : ""}Guest ID: {guestId ?? "—"}
        </Text>
        <Text style={styles.helper}>
          Creates this guest’s invitation. If they already have one, the same invitation is shown again.
        </Text>
        {errorMessage ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          disabled={loading}
          onPress={createInvitation}
          style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, loading && styles.disabledButton]}
        >
          <Text style={styles.submitText}>{loading ? "Creating…" : "Create Invitation"}</Text>
        </Pressable>

        {invitation ? (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>Invitation Created ✓</Text>
            <Text style={styles.label}>INVITATION ID</Text>
            <Text style={styles.resultValue}>{invitation.id}</Text>
            <Text style={styles.label}>GUEST CODE</Text>
            <Text style={styles.resultValue}>{guestCode ?? "—"}</Text>
            <Text style={styles.label}>INVITATION PASS</Text>
            <InvitationCode code={invitation.invitation_code} />
            <Text style={styles.label}>INVITATION LINK</Text>
            <Text selectable style={styles.link}>{inviteLink}</Text>
            {shareError ? <Text accessibilityLiveRegion="polite" style={styles.shareError}>{shareError}</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={shareInvitation}
              style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
            >
              <Text style={styles.submitText}>Share Invitation</Text>
            </Pressable>
          </View>
        ) : null}
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
  label: { color: "#D3C8B9", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginTop: 14, marginBottom: 6 },
  helper: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 18 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  submitButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabledButton: { opacity: 0.55 },
  result: { marginTop: 20, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card },
  resultTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  resultLine: { color: colors.textMuted, fontSize: 12, marginTop: 7 },
  resultValue: { color: colors.text, fontSize: 14, fontWeight: "600" },
  shareError: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 10 },
  shareButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 16, borderRadius: 11, backgroundColor: colors.accent },
  link: { color: colors.accent, fontSize: 12, lineHeight: 18 },
});
