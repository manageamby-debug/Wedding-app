import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
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
  const { id, guestId, from } = useLocalSearchParams<{ id: string; guestId: string; from?: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const currentGuestId = Array.isArray(guestId) ? guestId[0] : guestId;
  const cameFromGuest = (Array.isArray(from) ? from[0] : from) === "guest";
  // Return to Guest Details when that is where the organizer came from.
  const returnPath = cameFromGuest && currentGuestId
    ? `/event/guest/${currentGuestId}?eventId=${eventId}`
    : `/event/${eventId}`;
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [transactionReference, setTransactionReference] = useState("");
  const [mode, setMode] = useState<ContributionMode>("pending");
  const [paymentProof, setPaymentProof] = useState<{ uri: string; mimeType: string } | null>(null);
  // Set when the contribution was saved but its payment proof failed to upload,
  // so retrying never creates the contribution twice.
  const [savedContributionId, setSavedContributionId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function pickPaymentProof() {
    if (isSubmitting) return;

    try {
      // The system photo picker needs no permission prompt on current iOS and Android.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log("Payment proof selected:", asset.uri);
        setPaymentProof({ uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" });
      }
    } catch (pickerError) {
      console.error("Pick payment proof failed:", pickerError);
      setErrorMessage("Could not open your photo library. Please try again.");
    }
  }

  async function uploadPaymentProof(contributionId: number): Promise<boolean> {
    if (!paymentProof) return true;

    try {
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

      const response = await api.post(`/contributions/${contributionId}/payment-proof`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });

      console.log("Payment proof uploaded:", response.data);
      return true;
    } catch (uploadError) {
      const isApiError = axios.isAxiosError<ApiErrorResponse>(uploadError);
      const detail = isApiError ? uploadError.response?.data?.detail : undefined;
      const reason = isApiError && !uploadError.response
        ? "Cannot reach the server."
        : typeof detail === "string"
          ? detail
          : "Please try again.";

      console.error("Payment proof upload failed:", {
        status: isApiError ? uploadError.response?.status : undefined,
        reason,
      });
      setErrorMessage(`The contribution was saved, but the payment proof was not uploaded. ${reason}`);
      return false;
    }
  }

  async function retryProofUpload() {
    if (isSubmitting || savedContributionId === null) return;

    setErrorMessage("");
    setIsSubmitting(true);
    const uploaded = await uploadPaymentProof(savedContributionId);
    setIsSubmitting(false);

    if (uploaded) router.replace(returnPath);
  }

  async function addContribution() {
    if (isSubmitting || savedContributionId !== null) return;

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

      if (paymentProof) {
        const uploaded = await uploadPaymentProof(response.data.id);

        if (!uploaded) {
          setSavedContributionId(response.data.id);
          return;
        }
      }

      router.replace(returnPath);
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
            onPress={() => router.replace(returnPath)}
            style={styles.backButton}
          >
            <Text style={styles.backText}>{cameFromGuest ? "‹  Guest Details" : "‹  Event Details"}</Text>
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
            placeholderTextColor={colors.textMuted}
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
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={styles.input}
            value={transactionReference}
          />

          <Text style={styles.label}>PAYMENT PROOF · OPTIONAL</Text>
          {paymentProof ? (
            <View style={styles.proofPreview}>
              <Image
                accessibilityLabel="Selected payment proof"
                resizeMode="contain"
                source={{ uri: paymentProof.uri }}
                style={styles.proofImage}
              />
              <View style={styles.proofCopy}>
                <Text style={styles.proofTitle}>Payment proof selected ✓</Text>
                <Text style={styles.helper}>Uploaded together with the contribution when you save it. Uploading proof does not mark the payment as paid.</Text>
                <View style={styles.proofActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={pickPaymentProof}
                    style={styles.proofRemoveButton}
                  >
                    <Text style={styles.proofRemoveText}>Choose Another</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={() => setPaymentProof(null)}
                    style={styles.proofRemoveButton}
                  >
                    <Text style={styles.proofRemoveText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityHint="Opens your photos to choose a screenshot or receipt of the payment"
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={pickPaymentProof}
              style={styles.proofButton}
            >
              <Text style={styles.proofButtonText}>Choose Payment Proof</Text>
            </Pressable>
          )}

          {errorMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text>
          ) : null}

          {savedContributionId !== null ? (
            <View style={styles.recoveryBlock}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isSubmitting }}
                disabled={isSubmitting}
                onPress={retryProofUpload}
                style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, isSubmitting && styles.disabledButton]}
              >
                <Text style={styles.submitText}>{isSubmitting ? "Uploading proof…" : "Retry Proof Upload"}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => router.replace(returnPath)}
                style={styles.proofButton}
              >
                <Text style={styles.proofButtonText}>Continue without proof</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={addContribution}
              style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, isSubmitting && styles.disabledButton]}
            >
              <Text style={styles.submitText}>
                {isSubmitting ? (paymentProof ? "Saving and uploading…" : "Saving contribution…") : "Save Contribution"}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "flex-start", padding: 22, paddingTop: 26 },
  card: { width: "100%", maxWidth: 620, padding: 24, borderRadius: 26, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backButton: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10 },
  title: { color: colors.text, fontFamily: "Georgia", fontSize: 38, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 8, marginBottom: 24 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.card, color: colors.text, paddingHorizontal: 14, fontSize: 14, marginBottom: 16 },
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
  proofButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginBottom: 18, borderWidth: 1, borderColor: colors.accent, borderRadius: 11, backgroundColor: colors.accentSoft },
  proofButtonText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  proofPreview: { flexDirection: "row", gap: 12, marginBottom: 18, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card },
  proofImage: { width: 120, height: 160, borderRadius: 8, backgroundColor: colors.surface },
  proofActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  recoveryBlock: { gap: 10 },
  proofCopy: { flex: 1 },
  proofTitle: { color: colors.success, fontSize: 13, fontWeight: "700", marginBottom: 4 },
  proofRemoveButton: { alignSelf: "flex-start", minHeight: 32, justifyContent: "center", paddingHorizontal: 11, borderRadius: 9, backgroundColor: colors.accentSoft },
  proofRemoveText: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  submitButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabledButton: { opacity: 0.55 },
});
