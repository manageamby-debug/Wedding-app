import { Button, StyleSheet, Text, View } from "react-native";
import { colors } from "../src/constants/theme";

type Props = {
  message?: string;
  onRetry?: () => void;
};

export default function ErrorState({ message = "Something went wrong.", onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button title="Try Again" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 10 },
  message: { color: colors.textMuted, textAlign: "center", marginBottom: 15 },
});
