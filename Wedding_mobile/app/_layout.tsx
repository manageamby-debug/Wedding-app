import { useEffect } from "react";
import { Stack } from "expo-router";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../src/constants/theme";
import { onSessionExpired } from "../src/services/auth";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => onSessionExpired(() => {
    router.replace("/login?session=expired");
  }), [router]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
