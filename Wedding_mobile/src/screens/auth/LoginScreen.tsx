import { useState } from "react";
import axios from "axios";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AuthLayout from "../../components/AuthLayout";
import { colors } from "../../constants/theme";
import api from "../../services/api";
import { getToken, saveToken } from "../../services/auth";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

type CurrentUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
};

export default function LoginScreen() {
  const { session } = useLocalSearchParams<{ session?: string }>();
  const sessionReason = Array.isArray(session) ? session[0] : session;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(
    sessionReason === "expired" ? "Your session expired. Please sign in again." : "",
  );
  const [isError, setIsError] = useState(sessionReason === "expired");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    if (isSubmitting) return;

    setMessage("");
    setIsError(true);
    if (!email.trim()) {
      setMessage("Please enter your email.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMessage("Please enter a valid email.");
      return;
    }
    if (!password) {
      setMessage("Please enter your password.");
      return;
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setIsError(false);
    setIsSubmitting(true);

    let loginRequestSucceeded = false;
    let sessionSaved = false;

    try {
      const response = await api.post<LoginResponse>("/users/login", {
        email: email.trim(),
        password,
      });

      loginRequestSucceeded = true;
      await saveToken(response.data.access_token);
      sessionSaved = true;

      const savedToken = await getToken();
      if (!savedToken) {
        throw new Error("The access token was not found in local storage.");
      }

      const meResponse = await api.get<CurrentUser>("/users/me");

      console.log("Login successful:", {
        token_type: response.data.token_type,
        access_token_saved: true,
      });
      console.log("Current user:", meResponse.data);
      router.replace("/dashboard");
    } catch (error) {
      const isApiError = axios.isAxiosError(error);
      const responseData = isApiError ? error.response?.data : undefined;
      const serverMessage =
        responseData && typeof responseData === "object" && "message" in responseData
          ? responseData.message
          : undefined;
      const errorMessage =
        typeof serverMessage === "string"
          ? serverMessage
          : isApiError && !error.response
            ? "Unable to reach the server. Check that the backend is running."
            : loginRequestSucceeded
              ? sessionSaved
                ? "Login succeeded, but the current user could not be loaded. Please try again."
                : "Login succeeded, but the session could not be saved. Please try again."
              : "Invalid email or password.";

      console.error("Login failed:", {
        status: isApiError ? error.response?.status : undefined,
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
      eyebrow="YOUR PLANNING SPACE"
      title="Welcome back"
      subtitle="Sign in to pick up where your celebration plans left off."
    >
      <Text style={styles.label}>EMAIL ADDRESS</Text>
      <TextInput
        accessibilityLabel="Email address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor="#827C76"
        returnKeyType="next"
        style={styles.input}
        textContentType="emailAddress"
        value={email}
      />

      <View style={styles.passwordHeading}>
        <Text style={styles.label}>PASSWORD</Text>
        <Pressable accessibilityRole="button" onPress={() => { setIsError(false); setMessage("Password reset will be available when account services are connected."); }}>
          <Text style={styles.linkSmall}>Forgot password?</Text>
        </Pressable>
      </View>
      <View style={styles.passwordField}>
        <TextInput
          accessibilityLabel="Password"
          autoComplete="current-password"
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
          placeholder="Enter your password"
          placeholderTextColor="#827C76"
          returnKeyType="go"
          secureTextEntry={!showPassword}
          style={styles.passwordInput}
          textContentType="password"
          value={password}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"} onPress={() => setShowPassword((visible) => !visible)} hitSlop={10}>
          <Text style={styles.showPassword}>{showPassword ? "HIDE" : "SHOW"}</Text>
        </Pressable>
      </View>

      {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, isError ? styles.error : styles.success]}>{message}</Text> : null}

      <Pressable accessibilityRole="button" accessibilityState={{ disabled: isSubmitting }} disabled={isSubmitting} onPress={handleLogin} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, isSubmitting && styles.disabledButton]}>
        <Text style={styles.primaryButtonText}>{isSubmitting ? "Signing in…" : "Sign in"}</Text>
        {isSubmitting ? null : <Text style={styles.buttonArrow}>→</Text>}
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to Everafter?</Text>
        <Pressable accessibilityRole="link" onPress={() => router.push("/register")}>
          <Text style={styles.footerLink}>Create an account</Text>
        </Pressable>
      </View>
      <Text style={styles.legal}>By continuing, you agree to our <Text style={styles.legalLink}>Terms</Text> and <Text style={styles.legalLink}>Privacy Policy</Text>.</Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  label: { color: "#D3C8B9", fontSize: 10, fontWeight: "700", letterSpacing: 1.55, marginBottom: 9 },
  input: { minHeight: 54, borderWidth: 1, borderColor: "#3B3531", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.035)", color: colors.text, paddingHorizontal: 15, fontSize: 15, marginBottom: 21 },
  passwordHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  linkSmall: { color: colors.accent, fontSize: 12, fontWeight: "600" },
  passwordField: { minHeight: 54, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#3B3531", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.035)", paddingHorizontal: 15, marginBottom: 4 },
  passwordInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 14 },
  showPassword: { color: "#C5A779", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  message: { fontSize: 12, lineHeight: 18, marginTop: 9 },
  error: { color: "#F0A095" },
  success: { color: "#B9D6BF" },
  primaryButton: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.accent, marginTop: 22, paddingHorizontal: 18 },
  primaryButtonText: { color: "#17120C", fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
  buttonArrow: { position: "absolute", right: 18, color: "#17120C", fontSize: 19, fontWeight: "500" },
  footer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 5, marginTop: 22 },
  footerText: { color: "#B8B1A9", fontSize: 13 },
  footerLink: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  legal: { color: "#827C76", fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 19 },
  legalLink: { color: "#C5A779" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  disabledButton: { opacity: 0.65 },
});
