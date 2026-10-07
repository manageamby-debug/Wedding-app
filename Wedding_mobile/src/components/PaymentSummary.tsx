import { StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/theme";

type Contribution = {
  amount: number | string;
  payment_status?: string | null;
  status?: string | null;
};

type Props = {
  contributions: Contribution[];
  targetContribution?: number | string | null;
  isLoading?: boolean;
  error?: string;
};

type PaymentStatus = "paid" | "pending" | "rejected";
type Tone = "accent" | "success" | "danger" | "info";

function getPaymentStatus(contribution: Contribution): PaymentStatus {
  const status = (contribution.payment_status ?? contribution.status ?? "").trim().toLowerCase();
  if (status === "paid" || status === "confirmed") return "paid";
  if (status === "rejected" || status === "failed") return "rejected";
  return "pending";
}

function toAmount(value: number | string): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatTsh(amount: number): string {
  return `TSh ${amount.toLocaleString("en-TZ", { maximumFractionDigits: 2 })}`;
}

function toneColor(tone: Tone): string {
  if (tone === "success") return colors.success;
  if (tone === "danger") return colors.danger;
  if (tone === "info") return colors.info;
  return colors.accent;
}

export default function PaymentSummary({
  contributions,
  targetContribution,
  isLoading = false,
  error = "",
}: Props) {
  const totals: Record<PaymentStatus, number> = { paid: 0, pending: 0, rejected: 0 };
  const counts: Record<PaymentStatus, number> = { paid: 0, pending: 0, rejected: 0 };
  let totalContributions = 0;

  for (const contribution of contributions) {
    const amount = toAmount(contribution.amount);
    const status = getPaymentStatus(contribution);
    totalContributions += amount;
    totals[status] += amount;
    counts[status] += 1;
  }

  const unavailable = isLoading || !!error;
  const target = Number(targetContribution);
  const hasTarget = Number.isFinite(target) && target > 0;
  const progress = hasTarget ? Math.min((totals.paid / target) * 100, 100) : 0;
  const remaining = hasTarget ? Math.max(target - totals.paid, 0) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Summary</Text>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <View style={styles.grid}>
        <Metric
          label="Total contributions"
          value={unavailable ? "—" : formatTsh(totalContributions)}
          hint="All recorded contributions"
          tone="accent"
        />
        <Metric
          label="Paid"
          value={unavailable ? "—" : formatTsh(totals.paid)}
          hint={unavailable ? "Confirmed as paid" : `${counts.paid} confirmed`}
          tone="success"
        />
        <Metric
          label="Pending"
          value={unavailable ? "—" : formatTsh(totals.pending)}
          hint={unavailable ? "Awaiting confirmation" : `${counts.pending} awaiting`}
          tone="info"
        />
        <Metric
          label="Rejected"
          value={unavailable ? "—" : formatTsh(totals.rejected)}
          hint={unavailable ? "Not counted as paid" : `${counts.rejected} rejected or failed`}
          tone="danger"
        />
        <Metric
          label="Target progress"
          value={unavailable || !hasTarget ? "—" : `${Math.round(progress)}%`}
          hint={hasTarget ? "Paid amount only" : "No contribution target set"}
          tone="success"
        />
        <Metric
          label="Remaining"
          value={unavailable || !hasTarget ? "—" : formatTsh(remaining)}
          hint={hasTarget ? "Left to reach the target" : "No contribution target set"}
          tone="info"
        />
      </View>
    </View>
  );
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: Tone }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricAccent, { backgroundColor: toneColor(tone) }]} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: toneColor(tone) }]}>{value}</Text>
      <Text style={styles.metricHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 18 },
  title: { color: colors.text, fontSize: 15, fontWeight: "700", letterSpacing: 0.2, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { position: "relative", flexGrow: 1, flexBasis: "45%", minHeight: 108, justifyContent: "center", overflow: "hidden", paddingVertical: 13, paddingLeft: 16, paddingRight: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.card },
  metricAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  metricValue: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  metricHint: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginBottom: 8 },
});
