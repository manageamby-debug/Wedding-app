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
import ThreeDWeddingBackdrop from "./ThreeDWeddingBackdrop";
import { colors } from "../constants/theme";

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function AuthLayout({ eyebrow, title, subtitle, children }: AuthLayoutProps) {
  const { width, height } = useWindowDimensions();
  const horizontalPadding = width < 360 ? 18 : width > 700 ? 32 : 22;

  return (
    <View style={styles.root}>
      <ThreeDWeddingBackdrop />
      <View style={[styles.tint, { pointerEvents: "none" }]} />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentWrap}>
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
              <View style={styles.brand}>
                <View style={styles.brandMark}><Text style={styles.brandInitial}>E</Text></View>
                <Text style={styles.brandName}>EVERAFTER</Text>
              </View>
              <View style={styles.navSpacer} />
            </View>

            <View style={[styles.intro, { marginTop: height < 700 ? 28 : 42, marginBottom: height < 700 ? 20 : 26 }]}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={[styles.title, { fontSize: width < 360 ? 31 : width > 700 ? 38 : 34, lineHeight: width < 360 ? 38 : width > 700 ? 45 : 41 }]}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={[styles.card, { padding: width < 360 ? 16 : 20 }]}>{children}</View>
            <Text style={styles.securityNote}>YOUR CELEBRATION, THOUGHTFULLY IN GOOD HANDS</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingTop: 10, paddingBottom: 24 },
  contentWrap: { width: "100%", maxWidth: 480, alignSelf: "center" },
  tint: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(9, 8, 9, 0.42)" },
  navRow: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(16,15,15,0.55)", alignItems: "center", justifyContent: "center" },
  backArrow: { color: colors.text, fontSize: 32, lineHeight: 35, marginTop: -3 },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, alignItems: "center", justifyContent: "center" },
  brandInitial: { color: colors.accent, fontSize: 16, fontFamily: "serif", fontStyle: "italic" },
  brandName: { color: colors.text, fontSize: 10, fontWeight: "700", letterSpacing: 2.2 },
  navSpacer: { width: 42 },
  intro: { marginTop: 42, marginBottom: 26 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 2.5, marginBottom: 12 },
  title: { color: colors.text, fontSize: 34, fontWeight: "600", letterSpacing: -0.8, lineHeight: 41 },
  subtitle: { color: "#C3BDB6", fontSize: 15, lineHeight: 23, marginTop: 9, maxWidth: 330 },
  card: { borderRadius: 22, borderWidth: 1, borderColor: "rgba(223,181,120,0.2)", backgroundColor: "rgba(18,16,16,0.88)", padding: 20 },
  securityNote: { color: "rgba(236,225,208,0.48)", fontSize: 9, letterSpacing: 1.4, textAlign: "center", marginTop: 25 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
