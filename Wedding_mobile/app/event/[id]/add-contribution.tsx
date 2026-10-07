import axios from "axios";
import { useState } from "react";
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
import api from "../../../src/services/api";
import { colors } from "../../../src/constants/theme";

type PaymentMethod = "mpesa" | "tigopesa" | "airtel_money" | "bank" | "cash";
type ContributionMode = "pending" | "paid";

type ContributionResponse = {
  id: number;
  guest_id: number;
  amount: number | string;
  payment_method: string;
  payment_status: string;
  transaction_reference: string | null;
  paid_at: string | null;
};

type ApiErrorResponse = {
  detail?: unknown;
  message?: unknown;
  errors?: Array<{ msg?: unknown }>;
};

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "tigopesa", label: "Tigo Pesa" },
  { value: "airtel_money", label: "Airtel Money" },
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
];

export default function AddContributionScreen() {
  const { id, guestId } = useLocalSearchParams<{ id: string; guestId: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const currentGuestId = Array.isArray(guestId) ? guestId[0] : guestId;
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [transactionReference, setTransactionReference] = useState("");
  const [mode, setMode] = useState<ContributionMode>("pending");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function addContribution() {
    if (isSubmitting) return;

    if (!eventId || !/^\d+$/.test(eventId) || Number(eventId) < 1
      || !currentGuestId || !/^\d+$/.test(currentGuestId) || Number(currentGuestId) < 1) {
      setErrorMessage("The event or guest link is invalid. Return to Event Details and try again.");
      return;
    }

    const cleanAmount = amount.trim();
    const numericAmount = Number(cleanAmount);

    if (!/^\d+(?:\.\d{1,2})?$/.test(cleanAmount) || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setErrorMessage("Enter an amount greater than zero with up to 2 decimal places.");
      return;
    }

    if (!paymentMethod) {
      setErrorMessage("Choose how the contribution was or will be paid.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    const payload = {
      guest_id: Number(currentGuestId),
      amount: numericAmount,
      payment_method: paymentMethod,
      transaction_reference: transactionReference.trim() || null,
    };

    try {
      const endpoint = mode === "paid" ? "/contributions/manual" : "/contributions";
      const response = await api.post<ContributionResponse>(endpoint, payload);

      console.log("Contribution created:", response.data);
      router.replace(`/event/${eventId}`);
    } catch (requestError) {
      const isApiError = axios.isAxiosError<ApiErrorResponse>(requestError);
      const responseData = isApiError ? requestError.response?.data : undefined;
      const serverMessage = responseData?.detail ?? responseData?.message;
      const detailErrors = Array.isArray(responseData?.detail)
        ? responseData.detail.find((item) => typeof item?.msg === "string")?.msg
        : undefined;
      const validationMessage = responseData?.errors?.find(
        (item) => typeof item.msg === "string",
      )?.msg ?? detailErrors;
      const message =
        isApiError && !requestError.response
          ? "Cannot reach the server. Check that the backend is running."
          : typeof serverMessage === "string"
            ? serverMessage
            : typeof validationMessage === "string"
              ? validationMessage
              : "Could not save this contribution. Please try again.";

      console.error("Create contribution failed:", {
        status: isApiError ? requestError.response?.status : undefined,
        message,
      });
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
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
            onPress={() => router.replace(`/event/${eventId}`)}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹  Event Details</Text>
          </Pressable>

          <Text style={styles.eyebrow}>EVENT · #{eventId ?? "—"}</Text>
          <Text style={styles.title}>Add Contribution</Text>
          <Text style={styles.subtitle}>Guest ID: {currentGuestId ?? "—"}</Text>

          <Text style={styles.label}>AMOUNT · TSH</Text>
          <TextInput
            accessibilityLabel="Contribution amount in Tanzanian shillings"
            editable={!isSubmitting}
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            placeholder="e.g. 20000"
            placeholderTextColor="#827C76"
            returnKeyType="done"
            style={styles.input}
            value={amount}
          />

          <Text style={styles.label}>RECORD AS</Text>
          <View style={styles.modeOptions}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === "pending" }}
              disabled={isSubmitting}
              onPress={() => setMode("pending")}
              style={[styles.modeOption, mode === "pending" && styles.selectedOption]}
            >
              <Text style={[styles.modeTitle, mode === "pending" && styles.selectedText]}>Pledge</Text>
              <Text style={styles.modeDescription}>Save as pending</Text>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === "paid" }}
              disabled={isSubmitting}
              onPress={() => setMode("paid")}
              style={[styles.modeOption, mode === "paid" && styles.selectedOption]}
            >
              <Text style={[styles.modeTitle, mode === "paid" && styles.selectedText]}>Received</Text>
              <Text style={styles.modeDescription}>Mark as paid</Text>
            </Pressable>
          </View>
          <Text style={styles.helper}>
            {mode === "pending"
              ? "A pledge is saved as pending until it is confirmed."
              : "Use this when the guest has already paid; it is saved as paid."}
          </Text>

          <Text style={styles.label}>PAYMENT METHOD</Text>
          <View style={styles.methodOptions}>
            {paymentMethods.map((method) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: paymentMethod === method.value }}
                disabled={isSubmitting}
                key={method.value}
                onPress={() => setPaymentMethod(method.value)}
                style={[styles.methodOption, paymentMethod === method.value && styles.selectedOption]}
              >
                <Text style={[styles.methodText, paymentMethod === method.value && styles.selectedText]}>
                  {method.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>TRANSACTION REFERENCE · OPTIONAL</Text>
          <TextInput
            accessibilityLabel="Transaction reference, optional"
            autoCapitalize="characters"
            editable={!isSubmitting}
            onChangeText={setTransactionReference}
            placeholder="e.g. payment receipt number"
            placeholderTextColor="#827C76"
            returnKeyType="done"
            style={styles.input}
            value={transactionReference}
          />

          {errorMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting }}
            disabled={isSubmitting}
            onPress={addContribution}
            style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, isSubmitting && styles.disabledButton]}
          >
            <Text style={styles.submitText}>
              {isSubmitting ? "Saving contribution…" : "Save Contribution"}
            </Text>
          </Pressable>
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
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 8, marginBottom: 24 },
  label: { color: "#D3C8B9", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: "#3B3531", borderRadius: 11, backgroundColor: "rgba(255,255,255,0.035)", color: colors.text, paddingHorizontal: 14, fontSize: 14, marginBottom: 16 },
  modeOptions: { flexDirection: "row", gap: 10, marginBottom: 10 },
  modeOption: { flex: 1, minHeight: 65, justifyContent: "center", paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.card },
  selectedOption: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  modeTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  modeDescription: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  selectedText: { color: colors.accent },
  helper: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 18 },
  methodOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  methodOption: { minHeight: 36, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.card },
  methodText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  submitButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabledButton: { opacity: 0.55 },
});
