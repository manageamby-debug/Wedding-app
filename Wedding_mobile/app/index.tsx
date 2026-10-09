import { useEffect, useState } from "react";
import axios from "axios";
import { router } from "expo-router";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import WelcomeScreen from "../src/screens/auth/WelcomeScreen";
import api from "../src/services/api";
import { getToken, removeToken } from "../src/services/auth";

export default function Index() {
  const [destination, setDestination] = useState<"checking" | "welcome" | "dashboard" | "error">("checking");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;
    setDestination("checking");

    getToken()
      .then(async (token) => {
        if (!isActive) return;

        if (!token) {
          setDestination("welcome");
          return;
        }

        try {
          await api.get("/users/me");
          if (!isActive) return;
          setDestination("dashboard");
          router.replace("/dashboard");
        } catch (requestError) {
          if (!isActive) return;
          if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
            await removeToken();
            if (!isActive) return;
            router.replace("/login?session=expired");
            return;
          }
          throw requestError;
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
