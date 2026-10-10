import { useState } from "react";
import axios from "axios";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import AuthLayout from "../../components/AuthLayout";
import { colors } from "../../constants/theme";
import api from "../../services/api";

type ApiErrorResponse = {
  message?: unknown;
  detail?: unknown;
  errors?: Array<{ msg?: unknown }>;
};

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    if (isSubmitting) return;

    const issue = !fullName.trim()
      ? "Please enter your full name."
      : fullName.trim().length < 3
        ? "Full name must be at least 3 characters."
      : !email.trim()
        ? "Please enter your email."
        : !/^\S+@\S+\.\S+$/.test(email.trim())
          ? "Please enter a valid email."
          : !password
            ? "Please enter your password."
            : password.length < 8
              ? "Password must be at least 8 characters."
              : password !== confirmPassword
                ? "Passwords do not match."
                : !acceptedTerms
                  ? "Please accept the Terms and Privacy Policy to continue."
                  : "";

    if (issue) {
      setIsError(true);
      setMessage(issue);
      return;
    }

    setIsError(false);
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/users", {
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      });

      console.log("Registration successful:", response.data);
      router.push("/login");
    } catch (error) {
      const responseData = axios.isAxiosError<ApiErrorResponse>(error)
        ? error.response?.data
        : undefined;
      const serverMessage = responseData?.message ?? responseData?.detail;
      const validationMessage = responseData?.errors?.find(
        (item) => typeof item.msg === "string",
      )?.msg;
      const errorMessage =
        (typeof serverMessage === "string" && serverMessage !== "Validation error"
          ? serverMessage
          : typeof validationMessage === "string"
            ? validationMessage
            : axios.isAxiosError(error) && error.response?.status === 422
              ? "Please check your details and try again."
              : "Registration failed. Please try again.");

      console.error("Registration failed:", {
        status: axios.isAxiosError(error) ? error.response?.status : undefined,
        message: errorMessage,
      });
      setIsError(true);
      setMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      compact
      eyebrow="KARIBU CHEREKO"
      title="Create your account"
      subtitle="One space for every detail of your celebration."
    >
      <Text style={styles.label}>FULL NAME</Text>
      <TextInput
        accessibilityLabel="Full name"
        autoCapitalize="words"
        autoComplete="name"
        onChangeText={setFullName}
        placeholder="Your full name"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
        style={styles.input}
        textContentType="name"
        value={fullName}
      />

      <Text style={styles.label}>EMAIL ADDRESS</Text>
      <TextInput
        accessibilityLabel="Email address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
        style={styles.input}
        textContentType="emailAddress"
        value={email}
      />

      <Text style={styles.label}>CREATE PASSWORD</Text>
      <View style={styles.passwordField}>
        <TextInput
          accessibilityLabel="Create password"
          autoComplete="new-password"
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          placeholderTextColor={colors.textMuted}
          returnKeyType="next"
          secureTextEntry={!showPassword}
          style={styles.passwordInput}
          textContentType="newPassword"
          value={password}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"} onPress={() => setShowPassword((visible) => !visible)} hitSlop={10}>
          <Text style={styles.showPassword}>{showPassword ? "HIDE" : "SHOW"}</Text>
        </Pressable>
      </View>
      <Text style={styles.helper}>Use at least 8 characters for your password.</Text>

      <Text style={[styles.label, styles.confirmLabel]}>CONFIRM PASSWORD</Text>
      <TextInput
        accessibilityLabel="Confirm password"
        autoComplete="new-password"
        onChangeText={setConfirmPassword}
        onSubmitEditing={handleRegister}
        placeholder="Enter your password again"
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        secureTextEntry={!showPassword}
        style={styles.input}
        textContentType="newPassword"
        value={confirmPassword}
      />

      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acceptedTerms }} onPress={() => setAcceptedTerms((accepted) => !accepted)} style={styles.termsRow}>
        <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
          {acceptedTerms ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.termsText}>I agree to the <Text style={styles.termsLink}>Terms</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>.</Text>
      </Pressable>

      {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, isError ? styles.error : styles.success]}>{message}</Text> : null}

      <Pressable accessibilityRole="button" accessibilityState={{ disabled: isSubmitting }} disabled={isSubmitting} onPress={handleRegister} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, isSubmitting && styles.disabledButton]}>
        <Text style={styles.primaryButtonText}>{isSubmitting ? "Creating account…" : "Create account"}</Text>
        {isSubmitting ? null : <Text style={styles.buttonArrow}>→</Text>}
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Una akaunti?</Text>
        <Pressable accessibilityRole="link" onPress={() => router.push("/login")}>
          <Text style={styles.footerLink}>Log in</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.55, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, color: colors.text, paddingHorizontal: 14, fontSize: 14, marginBottom: 15 },
  passwordField: { minHeight: 50, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card, paddingHorizontal: 14 },
  passwordInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 12 },
  showPassword: { color: colors.link, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  helper: { color: colors.textMuted, fontSize: 11, marginTop: 7, marginBottom: 15 },
  confirmLabel: { marginTop: 1 },
  termsRow: { flexDirection: "row", alignItems: "center", marginTop: 2, marginBottom: 3 },
  checkbox: { width: 19, height: 19, borderRadius: 5, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { color: colors.onAccent, fontSize: 13, fontWeight: "800", lineHeight: 16 },
  termsText: { flex: 1, color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  termsLink: { color: colors.link, fontWeight: "600" },
  message: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  error: { color: colors.danger },
  success: { color: colors.success },
  primaryButton: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.accent, marginTop: 18, paddingHorizontal: 18 },
  primaryButtonText: { color: colors.onAccent, fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
  buttonArrow: { position: "absolute", right: 18, color: colors.onAccent, fontSize: 19, fontWeight: "500" },
  footer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 5, marginTop: 20 },
  footerText: { color: colors.textMuted, fontSize: 13 },
  footerLink: { color: colors.link, fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  disabledButton: { opacity: 0.65 },
});
