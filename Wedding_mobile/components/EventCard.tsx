import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../src/constants/theme";

type EventCardData = {
  id: number;
  name: string;
  couple_names: string;
  groom_name: string;
  bride_name: string;
  event_date: string;
  event_time: string;
  venue: string;
  venue_name: string;
  target_contribution?: number | string;
  status?: string;
};

type Props = {
  event: EventCardData;
};

export default function EventCard({ event }: Props) {
  const router = useRouter();
  const coupleNames = event.couple_names || `${event.groom_name} & ${event.bride_name}`;
  const daysRemaining = getDaysRemaining(event.event_date);

  return (
    <Pressable
      accessibilityHint="Opens the event details"
      accessibilityRole="button"
      onPress={() => router.push(`/event/${event.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Text style={styles.title}>{event.name || coupleNames}</Text>
      <Text style={styles.coupleNames}>{coupleNames}</Text>
      <Text style={styles.status}>Status: {getStatusLabel(event.status)}</Text>
      <Text style={styles.meta}>
        📅 {event.event_date}{event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ""}
      </Text>
      {(event.status === "active" || event.status === "published") && (
        <Text style={styles.countdown}>
          {daysRemaining > 0
            ? `⏳ ${daysRemaining} days remaining`
            : daysRemaining === 0
              ? "🎉 Today"
              : "📅 Event date passed"}
        </Text>
      )}
      <Text style={styles.venue}>📍 {event.venue || event.venue_name}</Text>
      {event.target_contribution !== undefined && (
        <Text style={styles.target}>
          🎯 Target: {Number(event.target_contribution).toLocaleString()} TSh
        </Text>
      )}
    </Pressable>
  );
}

function getDaysRemaining(eventDate: string): number {
  const today = new Date();
  const date = new Date(eventDate);

  if (Number.isNaN(date.getTime())) return 0;

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const difference = date.getTime() - today.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function getStatusLabel(status?: string): string {
  if (status === "draft") return "📝 Draft";
  if (status === "active" || status === "published") return "🟢 Active";
  if (status === "completed") return "✅ Completed";
  if (status === "cancelled") return "❌ Cancelled";
  return "Unknown";
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.card,
  },
  cardPressed: { opacity: 0.78 },
  title: { color: colors.text, fontSize: 15, fontWeight: "700" },
  coupleNames: { color: colors.textMuted, fontSize: 12, marginTop: 5 },
  status: { color: colors.accent, fontSize: 12, fontWeight: "700", marginTop: 5 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 9 },
  countdown: { color: colors.accent, fontSize: 12, fontWeight: "600", marginTop: 4 },
  venue: { color: colors.text, fontSize: 13, marginTop: 5 },
  target: { color: colors.text, fontSize: 13, fontWeight: "600", marginTop: 5 },
});
