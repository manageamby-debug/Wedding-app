import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors } from "../../src/constants/theme";

export default function ScanQR() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  // The camera reports the same QR code many times a second; only act on the first.
  const handled = useRef(false);

  function handleScanned({ data }: { data: string }) {
    const code = data.trim();

    if (handled.current || !code || !eventId) return;

    handled.current = true;
    router.replace({
      pathname: "/event/check-in-search",
      params: { id: eventId, code },
    });
  }

  const backButton = (
    <Pressable accessibilityRole="button" onPress={() => router.replace(`/event/${eventId ?? ""}`)} style={styles.backButton}>
      <Text style={styles.backText}>‹  Event Details</Text>
    </Pressable>
  );

  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Checking camera access…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <View style={styles.card}>
          {backButton}
          <Text style={styles.title}>Camera access needed</Text>
          <Text style={styles.message}>
            Allow camera access to scan guests’ QR codes. You can still check guests in by typing their code.
          </Text>
          {permission.canAskAgain ? (
            <Pressable accessibilityRole="button" onPress={requestPermission} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Allow Camera</Text>
            </Pressable>
          ) : (
            <Text style={styles.message}>Camera access is blocked. Enable it for this app in your device settings.</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        facing="back"
        onBarcodeScanned={handleScanned}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.top}>{backButton}</View>
        <View style={styles.frame} pointerEvents="none" />
        <Text style={styles.hint}>Point the camera at the guest’s QR code</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  centered: { flex: 1, alignItems: "center", justifyContent: "flex-start", padding: 22, paddingTop: 26, backgroundColor: colors.background },
  card: { width: "100%", maxWidth: 620, padding: 24, borderRadius: 26, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  overlay: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingVertical: 40 },
  top: { alignSelf: "stretch", paddingHorizontal: 20 },
  backButton: { alignSelf: "flex-start", marginBottom: 16 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  frame: { width: 240, height: 240, borderWidth: 3, borderColor: colors.accent, borderRadius: 18 },
  hint: { overflow: "hidden", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.6)", color: "#FFFFFF", fontSize: 13 },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 10 },
  message: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  primaryButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.accent },
  primaryText: { color: colors.onAccent, fontSize: 14, fontWeight: "700" },
});
