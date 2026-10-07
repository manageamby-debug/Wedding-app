import axios from "axios";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import api from "../../src/services/api";
import InvitationCode from "../../src/components/InvitationCode";
import { colors } from "../../src/constants/theme";

type ApiErrorResponse = {
  detail?: string | { msg?: string }[];
  message?: string;
};

type RSVPStatus = "attending" | "not_attending" | "maybe";

type PublicInvitation = {
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
};

type PublicRSVP = {
  id: number;
  guest_id: number;
  status: RSVPStatus;
};

const OPTIONS: { value: RSVPStatus; label: string }[] = [
  { value: "attending", label: "Accept" },
  { value: "not_attending", label: "Decline" },
  { value: "maybe", label: "Maybe" },
];

function publicRSVPStatus(status: RSVPStatus): string {
  if (status === "attending") return "accepted";
  if (status === "not_attending") return "declined";
  return "maybe";
}

function readError(requestError: unknown, fallback: string): string {
  const isApiError = axios.isAxiosError<ApiErrorResponse>(requestError);
  const data = isApiError ? requestError.response?.data : undefined;
  const detail = Array.isArray(data?.detail)
    ? data.detail.find((item) => typeof item?.msg === "string")?.msg
    : data?.detail;

  if (isApiError && !requestError.response) {
    return "Cannot reach the server. Check your connection and try again.";
  }

  return typeof detail === "string" ? detail : data?.message ?? fallback;
}

export default function PublicInvitation() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const shortCode = Array.isArray(code) ? code[0] : code;

  const [invitation, setInvitation] = useState<PublicInvitation | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus | "">("");
  const [submittedStatus, setSubmittedStatus] = useState<RSVPStatus | "">("");
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpError, setRsvpError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadInvitation() {
      if (!shortCode) {
        setLoadError("This invitation link is invalid.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<PublicInvitation>(`/invite/${encodeURIComponent(shortCode)}`);

        if (!isActive) return;

        console.log("Public invitation:", response.data);
        setInvitation(response.data);
      } catch (requestError) {
        if (!isActive) return;

        const message = axios.isAxiosError(requestError) && requestError.response?.status === 404
          ? "This invitation link is invalid or is no longer active."
          : readError(requestError, "Could not load this invitation. Please try again.");

        console.error("Load public invitation failed:", message);
        setLoadError(message);
        setIsLoading(false);
        return;
      }

      // The guest may have answered before, so show their saved response.
      try {
        const response = await api.get<PublicRSVP>(`/rsvp/${encodeURIComponent(shortCode)}`);

        if (!isActive) return;

        setRsvpStatus(response.data.status);
        setSubmittedStatus(response.data.status);
      } catch (requestError) {
        // 404 only means "no response yet"; anything else is not worth blocking the page.
        if (!(axios.isAxiosError(requestError) && requestError.response?.status === 404)) {
          console.error("Load saved RSVP failed:", readError(requestError, "Unknown error"));
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadInvitation();

    return () => {
      isActive = false;
    };
  }, [shortCode]);

  async function submitRSVP() {
    if (rsvpLoading || !shortCode) return;

    if (!rsvpStatus) {
      setRsvpError("Please choose a response first.");
      return;
    }

    setRsvpError("");
    setRsvpLoading(true);

    try {
      const response = await api.post<PublicRSVP>(`/rsvp/${encodeURIComponent(shortCode)}`, {
        status: rsvpStatus,
      });

      console.log("Public RSVP:", response.data);
      setSubmittedStatus(response.data.status);
    } catch (requestError) {
      const message = readError(requestError, "Could not save your RSVP. Please try again.");

      console.error("Public RSVP failed:", message);
      setRsvpError(message);
    } finally {
      setRsvpLoading(false);
    }
  }

  const submittedLabel = OPTIONS.find((option) => option.value === submittedStatus)?.label;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>YOU’RE INVITED</Text>

        {isLoading ? <Text style={styles.message}>Loading your invitation…</Text> : null}
        {!isLoading && loadError ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>{loadError}</Text>
        ) : null}

        {invitation ? (
          <>
            <Text style={styles.greeting}>Dear {invitation.guest_name},</Text>
            <Text style={styles.coupleNames}>{invitation.groom_name} &amp; {invitation.bride_name}</Text>

            <View style={styles.details}>
              <DetailRow label="Date" value={invitation.event_date} />
              <DetailRow label="Time" value={invitation.event_time.slice(0, 5)} />
              <DetailRow label="Venue" value={invitation.venue_name} />
              <DetailRow label="Address" value={invitation.venue_address} last />
            </View>

            <View style={styles.pass}>
              <Text style={styles.label}>Your Entry Pass</Text>
              <Text style={styles.passHint}>Show this at the entrance to be checked in.</Text>
              <InvitationCode code={invitation.invitation_code} />
            </View>

            <Text style={styles.question}>Will you attend?</Text>
            <View style={styles.options}>
              {OPTIONS.map((option) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: rsvpStatus === option.value, disabled: rsvpLoading }}
                  disabled={rsvpLoading}
                  key={option.value}
                  onPress={() => setRsvpStatus(option.value)}
                  style={[styles.option, rsvpStatus === option.value && styles.selectedOption]}
                >
                  <Text style={[styles.optionText, rsvpStatus === option.value && styles.selectedOptionText]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.selectedStatus}>
              Selected: {rsvpStatus ? publicRSVPStatus(rsvpStatus) : "None"}
            </Text>
            {rsvpError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{rsvpError}</Text> : null}
            {submittedStatus ? (
              <Text accessibilityLiveRegion="polite" style={styles.success}>
                Your RSVP: {publicRSVPStatus(submittedStatus)}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: rsvpLoading }}
              disabled={rsvpLoading}
              onPress={submitRSVP}
              style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, rsvpLoading && styles.disabledButton]}
            >
              <Text style={styles.submitText}>
                {rsvpLoading ? "Saving…" : submittedLabel ? "Update RSVP" : "Submit RSVP"}
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </ScrollView>
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

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: colors.background },
  card: { width: "100%", maxWidth: 560, padding: 24, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 14 },
  greeting: { color: colors.textMuted, fontSize: 14 },
  coupleNames: { color: colors.text, fontSize: 24, fontWeight: "700", marginTop: 8, marginBottom: 20 },
  details: { borderTopWidth: 1, borderTopColor: colors.border },
  detailRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { flexShrink: 1, color: colors.text, fontSize: 14, textAlign: "right" },
  question: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 22, marginBottom: 12 },
  pass: { marginTop: 22 },
  passHint: { color: colors.textMuted, fontSize: 12, marginTop: 6, marginBottom: 12 },
  options: { gap: 9, marginBottom: 16 },
  option: { minHeight: 46, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.card },
  selectedOption: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  selectedOptionText: { color: colors.accent },
  selectedStatus: { color: colors.textMuted, fontSize: 13, marginBottom: 12 },
  message: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  success: { color: colors.accent, fontSize: 14, fontWeight: "700", marginBottom: 12 },
  submitButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabledButton: { opacity: 0.55 },
});
