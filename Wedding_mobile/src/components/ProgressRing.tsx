import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type Props = {
  size: number;
  stroke: number;
  progress: number; // 0..1
  color: string;
  track: string;
  children?: ReactNode;
};

// Donut / countdown ring that starts at 12 o'clock and runs clockwise.
export default function ProgressRing({ size, stroke, progress, color, track, children }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {p > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}
