import { Button, StyleSheet, Text, View } from "react-native";
import { colors } from "../src/constants/theme";

type Props = {
  title: string;
  message?: string;
  buttonTitle?: string;
  onPress?: () => void;
};

export default function EmptyState({ title, message, buttonTitle, onPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {buttonTitle && onPress ? <Button title={buttonTitle} onPress={onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", padding: 30 },
  title: { color: colors.text, fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  message: { color: colors.textMuted, textAlign: "center", marginBottom: 15 },
});
