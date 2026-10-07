import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../src/constants/theme";

type Props = {
  message?: string;
};

export default function LoadingState({ message = "Loading..." }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  message: { color: colors.text, marginTop: 10, fontSize: 16 },
});
