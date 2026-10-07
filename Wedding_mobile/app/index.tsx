import { useEffect, useState } from "react";
import { router } from "expo-router";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import WelcomeScreen from "../src/screens/auth/WelcomeScreen";
import { getToken } from "../src/services/auth";

export default function Index() {
  const [destination, setDestination] = useState<"checking" | "welcome" | "dashboard" | "error">("checking");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;
    setDestination("checking");

    getToken()
      .then((token) => {
        if (!isActive) return;

        if (token) {
          setDestination("dashboard");
          router.replace("/dashboard");
        } else {
          setDestination("welcome");
        }
      })
      .catch((error: unknown) => {
        console.error("Could not restore the saved session:", error);
        if (isActive) setDestination("error");
      });

    return () => {
      isActive = false;
    };
  }, [retryCount]);

  if (destination === "checking") {
    return <LoadingState message="Checking your session..." />;
  }

  if (destination === "dashboard") {
    return <LoadingState message="Opening your dashboard..." />;
  }

  if (destination === "error") {
    return (
      <ErrorState
        message="Unable to check your saved session. Please try again."
        onRetry={() => setRetryCount((count) => count + 1)}
      />
    );
  }

  if (destination === "welcome") return <WelcomeScreen />;

  return null;
}
