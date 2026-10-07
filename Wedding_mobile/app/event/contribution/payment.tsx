import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  Image,
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

type Contribution = {
  id: number;
  guest_id: number;
  guest_name: string;
  amount: number | string;
  payment_method: string;
  payment_status: string | null;
  transaction_reference: string | null;
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; description: string }[] = [
  { value: "mpesa", label: "M-Pesa", description: "Mobile money" },
  { value: "tigopesa", label: "Tigo Pesa", description: "Mobile money" },
  { value: "airtel_money", label: "Airtel Money", description: "Mobile money" },
  { value: "bank", label: "Bank", description: "Bank transfer" },
  { value: "cash", label: "Cash", description: "In person" },
];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isPositiveId(value: string | undefined): value is string {
  return !!value && /^\d+$/.test(value) && Number(value) >= 1;
}

function formatTsh(amount: number | string): string {
  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount)
    ? `TSh ${numericAmount.toLocaleString("en-TZ", { maximumFractionDigits: 2 })}`
    : `TSh ${amount}`;
}

function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: unknown; detail?: unknown }>(error)) {
    if (!error.response) return "Cannot reach the server. Check your connection and try again.";
    const payload = error.response.data;
    const detail = payload?.message ?? payload?.detail;
    if (typeof detail === "string") return detail;
    if (error.response.status === 409) return "This contribution is already paid and cannot be changed.";
    if (error.response.status === 404) return "Contribution not found, or you do not have access to it.";
  }
  return "Could not save payment details. Please try again.";
}

export default function PaymentScreen() {
  const params = useLocalSearchParams<{ contributionId: string; eventId: string }>();
  const contributionId = firstParam(params.contributionId);
  const eventId = firstParam(params.eventId);

  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProof, setPaymentProof] = useState<{ uri: string; mimeType: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [referenceError, setReferenceError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadContribution() {
      if (!isPositiveId(contributionId) || !isPositiveId(eventId)) {
        setErrorMessage("This payment link is invalid. Return to contribution details and try again.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await api.get<Contribution[]>(`/events/${eventId}/contributions`);
        if (!isActive) return;

        const found = response.data.find((item) => item.id === Number(contributionId)) ?? null;
        setContribution(found);
        setPaymentMethod(
          PAYMENT_METHODS.some((option) => option.value === found?.payment_method)
            ? (found?.payment_method as PaymentMethod)
            : "",
        );
        setPaymentReference(found?.transaction_reference ?? "");
        setErrorMessage(found ? "" : "Contribution not found in this event.");
      } catch (error) {
        if (isActive) setErrorMessage(getApiErrorMessage(error));
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadContribution();
    return () => {
      isActive = false;
    };
  }, [contributionId, eventId, retryCount]);

  const status = (contribution?.payment_status ?? "").trim().toLowerCase();
  const isPaid = status === "paid" || status === "confirmed";

  async function pickPaymentProof() {
    if (isSaving) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType?.toLowerCase() ?? "image/jpeg";
        if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
          setErrorMessage("Choose a JPG, PNG or WebP image for the payment proof.");
          return;
        }
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          setErrorMessage("Payment proof must be 5 MB or smaller.");
          return;
        }

        setPaymentProof({ uri: asset.uri, mimeType });
        setErrorMessage("");
      }
    } catch (pickerError) {
      console.error("Pick payment proof failed:", pickerError);
      setErrorMessage("Could not open your photo library. Please try again.");
    }
  }

  async function uploadPaymentProof() {
    if (!paymentProof || !isPositiveId(contributionId)) return;

    const extension = paymentProof.mimeType === "image/png"
      ? "png"
      : paymentProof.mimeType === "image/webp"
        ? "webp"
        : "jpg";
    const fileName = `payment-proof.${extension}`;
    const formData = new FormData();

    if (Platform.OS === "web") {
      const blob = await (await fetch(paymentProof.uri)).blob();
      formData.append("file", blob, fileName);
    } else {
      formData.append("file", {
        uri: paymentProof.uri,
        name: fileName,
        type: paymentProof.mimeType,
      } as unknown as Blob);
    }

    const response = await api.post(
      `/contributions/${contributionId}/payment-proof`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      },
    );
    console.log("Payment proof uploaded:", response.data);
  }

  async function submitPayment() {
    setErrorMessage("");
    setReferenceError("");

    if (!paymentMethod) {
      setErrorMessage("Please select a payment method.");
      return;
    }

    const trimmedReference = paymentReference.trim();
    if (!trimmedReference) {
      setReferenceError("Enter the transaction or payment reference.");
      return;
    }
    if (trimmedReference.length > 255) {
      setReferenceError("Reference must be 255 characters or fewer.");
      return;
    }
    if (!isPositiveId(contributionId) || isPaid || isSaving) return;

    setIsSaving(true);
    let paymentDetailsSaved = false;
    try {
      const response = await api.put<Contribution>(`/contributions/${contributionId}`, {
        payment_method: paymentMethod,
        transaction_reference: trimmedReference,
      });
      paymentDetailsSaved = true;
      setContribution((current) => (current ? { ...current, ...response.data } : current));
      console.log("Payment submitted:", response.data);

      if (paymentProof) {
        await uploadPaymentProof();
      }

      router.back();
    } catch (error) {
      console.error(paymentDetailsSaved ? "Payment proof upload failed:" : "Payment submission failed:", error);
      setErrorMessage(
        paymentDetailsSaved
          ? `Payment details are saved as pending, but the proof was not uploaded. ${getApiErrorMessage(error)}`
          : getApiErrorMessage(error),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹  Back</Text>
          </Pressable>

          <Text style={styles.eyebrow}>CONTRIBUTION · #{contributionId ?? "—"}</Text>
          <Text style={styles.title}>Submit Payment</Text>
          <Text style={styles.subtitle}>Choose how you paid and enter the transaction reference for organizer verification.</Text>

          {isLoading ? <Text style={styles.message}>Loading contribution…</Text> : null}

          {!isLoading && errorMessage && !contribution ? (
            <View>
              <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text>
              {isPositiveId(contributionId) && isPositiveId(eventId) ? (
                <Pressable accessibilityRole="button" onPress={() => setRetryCount((count) => count + 1)} style={styles.retryButton}>
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {contribution ? (
            <>
              <View style={styles.summary}>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryLabel}>CONTRIBUTOR</Text>
                  <Text style={styles.summaryName}>{contribution.guest_name}</Text>
                </View>
                <Text style={styles.summaryAmount}>{formatTsh(contribution.amount)}</Text>
              </View>

              {isPaid ? (
                <Text accessibilityLiveRegion="polite" style={styles.successNotice}>
                  This contribution is already {status}. Payment details are locked.
                </Text>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Payment method</Text>
                  <Text style={styles.helper}>Select the method used for this contribution.</Text>

                  <View style={styles.methods}>
                    {PAYMENT_METHODS.map((method) => {
                      const selected = paymentMethod === method.value;
                      return (
                        <Pressable
                          key={method.value}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected, disabled: isSaving }}
                          disabled={isSaving}
                          onPress={() => {
                            setPaymentMethod(method.value);
                            setErrorMessage("");
                          }}
                          style={({ pressed }) => [
                            styles.methodOption,
                            selected && styles.methodOptionSelected,
                            pressed && styles.pressed,
                            isSaving && styles.disabled,
                          ]}
                        >
                          <View style={[styles.radio, selected && styles.radioSelected]}>
                            {selected ? <View style={styles.radioDot} /> : null}
                          </View>
                          <View style={styles.methodCopy}>
                            <Text style={[styles.methodLabel, selected && styles.methodLabelSelected]}>{method.label}</Text>
                            <Text style={styles.methodDescription}>{method.description}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>TRANSACTION REFERENCE</Text>
                  <TextInput
                    accessibilityLabel="Transaction or payment reference"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!isSaving}
                    maxLength={255}
                    onChangeText={(value) => {
                      setPaymentReference(value);
                      setReferenceError("");
                    }}
                    onSubmitEditing={() => void submitPayment()}
                    placeholder="e.g. MPESA12345ABC"
                    placeholderTextColor="#827C76"
                    returnKeyType="done"
                    style={[styles.input, referenceError && styles.inputError]}
                    value={paymentReference}
                  />
                  <Text style={styles.helper}>Use the reference shown on your mobile money or bank confirmation.</Text>

                  <Text style={styles.inputLabel}>PAYMENT PROOF · OPTIONAL</Text>
                  <Text style={styles.helper}>Attach a JPG, PNG or WebP image up to 5 MB.</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isSaving }}
                    disabled={isSaving}
                    onPress={() => void pickPaymentProof()}
                    style={({ pressed }) => [styles.proofButton, pressed && styles.pressed, isSaving && styles.disabled]}
                  >
                    <Text style={styles.proofButtonText}>{paymentProof ? "Change payment proof" : "Choose image"}</Text>
                  </Pressable>
                  {paymentProof ? (
                    <View style={styles.proofPreview}>
                      <Image accessibilityLabel="Selected payment proof preview" source={{ uri: paymentProof.uri }} style={styles.proofImage} />
                      <View style={styles.proofCopy}>
                        <Text style={styles.proofName}>Proof attached</Text>
                        <Text style={styles.methodDescription}>{paymentProof.mimeType}</Text>
                      </View>
                      <Pressable
                        accessibilityLabel="Remove payment proof"
                        accessibilityRole="button"
                        disabled={isSaving}
                        onPress={() => setPaymentProof(null)}
                        style={styles.removeProofButton}
                      >
                        <Text style={styles.removeProofText}>Remove</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {referenceError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{referenceError}</Text> : null}
                  {errorMessage ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text> : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isSaving || !paymentMethod || isLoading }}
                    disabled={isSaving || !paymentMethod || isLoading}
                    onPress={() => void submitPayment()}
                    style={({ pressed }) => [
                      styles.submitButton,
                      pressed && styles.pressed,
                      (isSaving || !paymentMethod || isLoading) && styles.disabledButton,
                    ]}
                  >
                    <Text style={styles.submitText}>{isSaving ? "Submitting…" : "Submit Payment"}</Text>
                  </Pressable>
                </>
              )}
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "flex-start", padding: 24 },
  card: { width: "100%", maxWidth: 560, padding: 24, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontSize: 26, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 22 },
  message: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20, marginTop: 10 },
  retryButton: { alignSelf: "flex-start", marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, backgroundColor: colors.accentSoft },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  summary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 16, marginBottom: 24, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  summaryCopy: { flex: 1 },
  summaryLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.1 },
  summaryName: { color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 5 },
  summaryAmount: { color: colors.accent, fontSize: 16, fontWeight: "700" },
  successNotice: { color: colors.success, fontSize: 14, lineHeight: 21, padding: 14, borderRadius: 10, backgroundColor: "#153126" },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  helper: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 12 },
  methods: { gap: 9, marginBottom: 22 },
  methodOption: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  methodOptionSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  radio: { width: 20, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.textMuted, borderRadius: 10 },
  radioSelected: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  methodCopy: { flex: 1 },
  methodLabel: { color: colors.text, fontSize: 14, fontWeight: "600" },
  methodLabelSelected: { color: colors.accent },
  methodDescription: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  inputLabel: { color: "#D3C8B9", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: "#3B3531", borderRadius: 11, backgroundColor: "rgba(255,255,255,0.035)", color: colors.text, paddingHorizontal: 14, fontSize: 14 },
  inputError: { borderColor: colors.danger },
  proofButton: { minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: colors.accent, borderRadius: 11, backgroundColor: colors.accentSoft },
  proofButtonText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  proofPreview: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, padding: 10, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  proofImage: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.border },
  proofCopy: { flex: 1 },
  proofName: { color: colors.text, fontSize: 13, fontWeight: "600" },
  removeProofButton: { paddingHorizontal: 8, paddingVertical: 8 },
  removeProofText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  submitButton: { minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: 22, borderRadius: 11, backgroundColor: colors.accent },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
  disabledButton: { opacity: 0.45 },
});
