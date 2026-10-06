import axios from "axios";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import api from "../../../src/services/api";
import { colors } from "../../../src/constants/theme";

type EventDetailsData = {
  id: number;
  groom_name: string;
  bride_name: string;
  event_date: string;
  event_time: string;
  venue_name: string;
  venue_address: string;
  status: "draft" | "published" | "completed" | "cancelled";
};

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const [event, setEvent] = useState<EventDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadEvent() {
      setIsLoading(true);
      setErrorMessage("");

      if (!eventId || !/^\d+$/.test(eventId)) {
        setEvent(null);
        setErrorMessage("This event link is invalid.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<EventDetailsData>(`/events/${eventId}`);

        if (!isActive) return;

        console.log("Event details:", response.data);
        setEvent(response.data);
      } catch (requestError) {
        if (!isActive) return;

        const message = axios.isAxiosError(requestError)
          ? requestError.response?.status === 404
            ? "Event not found or you do not have access to it."
            : requestError.message
          : requestError instanceof Error
            ? requestError.message
            : "Unknown error";

        console.error("Failed to load event details:", message);
        setEvent(null);
        setErrorMessage("Could not load this event. Check your connection and try again.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadEvent();

    return () => {
      isActive = false;
    };
  }, [eventId, retryCount]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/dashboard")}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹  My Events</Text>
          </Pressable>

          <Text style={styles.eyebrow}>EVENT OVERVIEW · #{eventId ?? "—"}</Text>
          <Text style={styles.title}>Event Details</Text>

          {isLoading ? <Text style={styles.message}>Loading event details…</Text> : null}

          {!isLoading && errorMessage ? (
            <View>
              <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setRetryCount((count) => count + 1)}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {event ? (
            <>
              <Text style={styles.coupleNames}>{event.groom_name} &amp; {event.bride_name}</Text>
              <View style={styles.statusRow}>
                <Text style={styles.label}>STATUS</Text>
                <Text style={styles.status}>{event.status}</Text>
              </View>

              <View style={styles.details}>
                <DetailRow label="Event ID" value={String(event.id)} />
                <DetailRow label="Date" value={event.event_date} />
                <DetailRow label="Time" value={event.event_time.slice(0, 5)} />
                <DetailRow label="Venue" value={event.venue_name} />
                <DetailRow label="Address" value={event.venue_address} last />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/event/${event.id}/add-guest`)}
                style={styles.addGuestButton}
              >
                <Text style={styles.addGuestButtonText}>+  Add Guest</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 560, padding: 24, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontSize: 26, fontWeight: "700", marginBottom: 20 },
  coupleNames: { color: colors.text, fontSize: 21, fontWeight: "700", marginBottom: 18 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  status: { color: colors.accent, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  details: { borderTopWidth: 1, borderTopColor: colors.border },
  detailRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { flexShrink: 1, color: colors.text, fontSize: 14, textAlign: "right" },
  message: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  retryButton: { alignSelf: "flex-start", marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, backgroundColor: colors.accentSoft },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  addGuestButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 22, borderRadius: 11, backgroundColor: colors.accent },
  addGuestButtonText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
});
