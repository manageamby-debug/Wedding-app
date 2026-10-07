import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { colors } from "../constants/theme";

type Mode = "qr" | "code";

const MODES: { value: Mode; label: string }[] = [
  { value: "qr", label: "QR Code" },
  { value: "code", label: "Code" },
];

export default function InvitationCode({ code }: { code: string }) {
  const [mode, setMode] = useState<Mode>("qr");

  return (
    <View>
      <View style={styles.tabs}>
        {MODES.map((option) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === option.value }}
            key={option.value}
            onPress={() => setMode(option.value)}
            style={[styles.tab, mode === option.value && styles.selectedTab]}
          >
            <Text style={[styles.tabText, mode === option.value && styles.selectedTabText]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "qr" ? (
        <View style={styles.qrBox}>
          {/* White background and black modules keep the code easy to scan. */}
          <QRCode backgroundColor="#FFFFFF" color="#000000" size={180} value={code} />
        </View>
      ) : (
        <View style={styles.codeBox}>
          <Text selectable style={styles.code}>{code}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface },
  selectedTab: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  selectedTabText: { color: colors.accent },
  qrBox: { alignSelf: "center", padding: 14, borderRadius: 12, backgroundColor: "#FFFFFF" },
  codeBox: { minHeight: 120, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface },
  code: { color: colors.text, fontSize: 20, fontWeight: "700", letterSpacing: 1.5, textAlign: "center" },
});
