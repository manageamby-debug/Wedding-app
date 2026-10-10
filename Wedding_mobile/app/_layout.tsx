import { useEffect } from "react";
import { Stack } from "expo-router";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors, isLightTheme, takeReturnRoute } from "../src/constants/theme";
import { onSessionExpired } from "../src/services/auth";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => onSessionExpired(() => {
    router.replace("/login?session=expired");
  }), [router]);

  // After the user changes the theme the app restarts; take them back to where they were.
  useEffect(() => {
    const route = takeReturnRoute();
    if (!route) return;
    const timer = setTimeout(() => router.replace(route as never), 600);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <StatusBar style={isLightTheme ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
