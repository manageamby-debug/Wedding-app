import { useCallback, useState } from "react";
import axios from "axios";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import api from "../src/services/api";
import { colors } from "../src/constants/theme";

type DashboardUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
};

type DashboardEvent = {
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

export default function Dashboard() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [userError, setUserError] = useState("");
  const [eventsError, setEventsError] = useState("");

  useFocusEffect(useCallback(() => {
    let isActive = true;

    setIsUserLoading(true);
    setIsEventsLoading(true);
    setUserError("");
    setEventsError("");

    async function loadUser() {
      try {
        const response = await api.get<DashboardUser>("/users/me");

        if (!isActive) return;

        console.log("Dashboard user:", response.data);
        setUser(response.data);
      } catch (requestError) {
        if (!isActive) return;

        const errorMessage = axios.isAxiosError(requestError)
          ? requestError.message
          : requestError instanceof Error
            ? requestError.message
            : "Unknown error";

        console.error("Failed to load dashboard user:", errorMessage);
        setUserError("Could not load your profile. Please try again.");
      } finally {
        if (isActive) setIsUserLoading(false);
      }
    }

    async function loadEvents() {
      try {
        const response = await api.get<DashboardEvent[]>("/events");

        if (!isActive) return;

        console.log("Dashboard events:", response.data);
        setEvents(response.data);
      } catch (requestError) {
        if (!isActive) return;

        const errorMessage = axios.isAxiosError(requestError)
          ? requestError.message
          : requestError instanceof Error
            ? requestError.message
            : "Unknown error";

        console.error("Failed to load dashboard events:", errorMessage);
        setEventsError("Could not load events. Please try again.");
      } finally {
        if (isActive) setIsEventsLoading(false);
      }
    }

    void loadUser();
    void loadEvents();

    return () => {
      isActive = false;
    };
  }, []));

  const firstName = user?.full_name.trim().split(/\s+/)[0] || "there";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>EVERAFTER · ORGANIZER</Text>
          <Text style={styles.title}>{user ? `Welcome, ${firstName}` : "Your dashboard"}</Text>

          {isUserLoading ? <Text style={styles.status}>Loading your profile…</Text> : null}
          {userError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{userError}</Text> : null}

          {user ? (
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{user.full_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{user.email}</Text>
              </View>
              <View style={[styles.detailRow, styles.lastRow]}>
                <Text style={styles.label}>Role</Text>
                <Text style={styles.role}>{user.role}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.eventsSection}>
            <View style={styles.eventsHeading}>
              <Text style={styles.sectionTitle}>My Events</Text>
              <View style={styles.eventsActions}>
                {!isEventsLoading && !eventsError && events.length > 0 ? (
                  <Text style={styles.eventCount}>{events.length}</Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/create-event")}
                  style={styles.createEventButton}
                >
                  <Text style={styles.createEventButtonText}>+ Create</Text>
                </Pressable>
              </View>
            </View>

            {isEventsLoading ? <Text style={styles.status}>Loading events…</Text> : null}
            {eventsError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{eventsError}</Text> : null}
            {!isEventsLoading && !eventsError && events.length === 0 ? (
              <Text style={styles.emptyState}>No events yet. Your events will appear here.</Text>
            ) : null}

            {events.map((event) => (
              <Pressable
                accessibilityHint="Opens the event details"
                accessibilityRole="button"
                key={event.id}
                onPress={() => router.push(`/event/${event.id}`)}
                style={({ pressed }) => [styles.eventCard, pressed && styles.eventCardPressed]}
              >
                <View style={styles.eventHeading}>
                  <Text style={styles.eventTitle}>{event.name || `${event.groom_name} & ${event.bride_name}`}</Text>
                  <Text style={styles.eventStatus}>{event.status}</Text>
                </View>
                <Text style={styles.eventCoupleNames}>{event.couple_names || `${event.groom_name} & ${event.bride_name}`}</Text>
                <Text style={styles.eventMeta}>{event.event_date} · {event.event_time.slice(0, 5)}</Text>
                <Text style={styles.eventVenue}>{event.venue || event.venue_name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },
  status: {
    color: colors.textMuted,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
  },
  value: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
  },
  role: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  eventsSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  eventsHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  eventsActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  createEventButton: {
    minHeight: 34,
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 11,
  },
  createEventButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  eventCount: {
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 8,
  },
  eventCard: {
    marginTop: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.card,
  },
  eventCardPressed: {
    opacity: 0.78,
  },
  eventHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  eventTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  eventCoupleNames: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 5,
  },
  eventStatus: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  eventMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 9,
  },
  eventVenue: {
    color: colors.text,
    fontSize: 13,
    marginTop: 5,
  },
});
