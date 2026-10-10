import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Line, Rect, Stop } from "react-native-svg";
import { colors } from "../constants/theme";

export type Pattern = "stripes" | "dots" | "plain";

// Placeholder for the couple photo: diagonal stripes (Classic), dots (Floral) or plain (Modern).
// Fill the parent absolutely; the parent should clip with overflow: "hidden".
export default function StripedBlock({ pattern = "stripes", shade = true, style }: { pattern?: Pattern; shade?: boolean; style?: ViewStyle }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };
  const { w, h } = size;
  const pitch = 40;
  const lines: number[] = [];
  if (pattern === "stripes") for (let x = -h; x < w + pitch; x += pitch) lines.push(x);
  const dots: { x: number; y: number }[] = [];
  if (pattern === "dots") {
    let row = 0;
    for (let y = 14; y < h; y += 34, row += 1) {
      for (let x = (row % 2 === 0 ? 14 : 31); x < w; x += 34) dots.push({ x, y });
    }
  }

  return (
    <View pointerEvents="none" onLayout={onLayout} style={[StyleSheet.absoluteFill, { backgroundColor: colors.heroBase }, style]}>
      {w > 0 ? (
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0.28" />
            </LinearGradient>
          </Defs>
          {lines.map((x) => (
            <Line key={x} x1={x} y1={0} x2={x + h} y2={h} stroke={colors.heroStripe} strokeWidth={14} />
          ))}
          {dots.map((d, i) => (
            <Circle key={i} cx={d.x} cy={d.y} r={5} fill={colors.heroStripe} />
          ))}
          {shade ? <Rect x={0} y={0} width={w} height={h} fill="url(#shade)" /> : null}
        </Svg>
      ) : null}
    </View>
  );
}
