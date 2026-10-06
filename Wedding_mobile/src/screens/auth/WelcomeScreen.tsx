import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import ThreeDWeddingBackdrop from "../../components/ThreeDWeddingBackdrop";
import { colors } from "../../constants/theme";

export default function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const compact = height < 700;

  return (
    <View style={styles.root}>
      <ThreeDWeddingBackdrop />
      <View style={[styles.tint, { pointerEvents: "none" }]} />
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.content, { maxWidth: width > 760 ? 680 : undefined, paddingHorizontal: width < 360 ? 20 : width > 760 ? 40 : 26 }]}>
          <View style={styles.brand}>
            <View style={styles.brandMark}><Text style={styles.brandInitial}>E</Text></View>
            <Text style={styles.brandName}>EVERAFTER</Text>
          </View>

          <View style={[styles.hero, { marginTop: compact ? 76 : 52 }]}>
            <Text style={styles.eyebrow}>A MORE BEAUTIFUL WAY TO PLAN</Text>
            <Text style={[styles.title, { fontSize: width < 360 ? 47 : width > 700 ? 68 : 55, lineHeight: width < 360 ? 52 : width > 700 ? 74 : 60 }]}>{"Your day.\nYour story."}</Text>
            <View style={styles.rule} />
            <Text style={styles.subtitle}>Bring every thoughtful detail of your celebration together, in one calm and considered space.</Text>
          </View>

          <View style={[styles.actions, { maxWidth: width > 520 ? 480 : undefined, alignSelf: width > 520 ? "center" : "stretch", width: width > 520 ? "100%" : undefined }]}>
            <Pressable accessibilityRole="button" onPress={() => router.push("/register")} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Start planning</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => router.push("/login")} style={styles.signInButton}>
              <Text style={styles.signInText}>I already have an account <Text style={styles.signInLink}>Sign in</Text></Text>
            </Pressable>
            <Text style={styles.footnote}>MADE FOR THE MOMENTS THAT MATTER</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  tint: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(10, 8, 8, 0.28)" },
  content: { flex: 1, width: "100%", alignSelf: "center", paddingHorizontal: 26, paddingTop: 20, paddingBottom: 18, justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.accent, alignItems: "center", justifyContent: "center" },
  brandInitial: { color: colors.accent, fontSize: 19, fontFamily: "serif", fontStyle: "italic" },
  brandName: { color: colors.text, fontSize: 11, fontWeight: "700", letterSpacing: 2.5 },
  hero: { marginTop: 30, maxWidth: 440 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 2.25, marginBottom: 17 },
  title: { color: "#F7F1E9", fontSize: 55, lineHeight: 60, letterSpacing: -1.7, fontWeight: "500" },
  rule: { width: 46, height: 1, backgroundColor: colors.accent, marginVertical: 19 },
  subtitle: { maxWidth: 315, color: "#CCC3B9", fontSize: 16, lineHeight: 25 },
  actions: { marginBottom: 10 },
  primaryButton: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.accent, paddingHorizontal: 18 },
  primaryButtonText: { color: "#17120C", fontSize: 15, fontWeight: "700" },
  buttonArrow: { position: "absolute", right: 20, color: "#17120C", fontSize: 20 },
  signInButton: { minHeight: 52, alignItems: "center", justifyContent: "center" },
  signInText: { color: "#C4BBB0", fontSize: 13 },
  signInLink: { color: colors.accent, fontWeight: "700" },
  footnote: { color: "rgba(236,225,208,0.45)", fontSize: 9, letterSpacing: 1.8, textAlign: "center", marginTop: 8 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
});
