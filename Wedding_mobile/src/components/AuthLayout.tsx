import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors } from "../constants/theme";
import RingsBlastHero from "./RingsBlastHero";

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  compact?: boolean;
};

export default function AuthLayout({ eyebrow, title, subtitle, children, compact = false }: AuthLayoutProps) {
  const { width, height } = useWindowDimensions();
  const horizontalPadding = width < 360 ? 18 : width > 700 ? 32 : 24;
  const heroHeight = compact ? 230 : 320;
  const overlap = 36;

  return (
    <View style={styles.root}>
      <View style={styles.heroLayer}>
        <RingsBlastHero height={heroHeight} compact={compact} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.navRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.wordmark}>Chereko</Text>
          <View style={styles.navSpacer} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingTop: heroHeight - overlap }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.sheet, { minHeight: height - heroHeight + overlap, paddingHorizontal: horizontalPadding }]}>
            <View style={styles.contentWrap}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              <View style={styles.form}>{children}</View>
              <Text style={styles.securityNote}>CHEREKO · TAFRIJA NA MATUKIO YA KIJAMII</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.heroA },
  heroLayer: { position: "absolute", top: 0, left: 0, right: 0 },
  safeArea: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 },
  navRow: { height: 52, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  backArrow: { color: "#FFFFFF", fontSize: 30, lineHeight: 33, marginTop: -3 },
  wordmark: { color: "#FFFFFF", fontFamily: "Georgia", fontSize: 26, fontWeight: "700", letterSpacing: 1 },
  navSpacer: { width: 42 },
  keyboardView: { flex: 1 },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 28,
    paddingBottom: 28,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -10 },
    elevation: 12,
  },
  contentWrap: { width: "100%", maxWidth: 620, alignSelf: "center" },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 2.4, marginBottom: 8 },
  title: { color: colors.text, fontFamily: "Georgia", fontSize: 32, fontWeight: "700", letterSpacing: -0.6 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 6 },
  form: { marginTop: 20 },
  securityNote: { color: colors.textMuted, fontSize: 9, letterSpacing: 1.4, textAlign: "center", marginTop: 24 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
