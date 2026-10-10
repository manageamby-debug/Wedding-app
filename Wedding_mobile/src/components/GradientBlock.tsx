import { useRef } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

let counter = 0;

// Diagonal two-colour gradient used for the "Our Story" photo placeholders.
export default function GradientBlock({ colors: pair, style }: { colors: [string, string]; style?: StyleProp<ViewStyle> }) {
  const id = useRef(`gb${++counter}`).current;
  return (
    <View style={[{ overflow: "hidden" }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={pair[0]} />
            <Stop offset="1" stopColor={pair[1]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
