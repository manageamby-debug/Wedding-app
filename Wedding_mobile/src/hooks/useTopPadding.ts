import { useSafeAreaInsets } from "react-native-safe-area-context";

// Top padding used by every main screen so headings sit where the designs place them.
export function useTopPadding() {
  const { top } = useSafeAreaInsets();
  return Math.max(top, 44) + 12;
}
