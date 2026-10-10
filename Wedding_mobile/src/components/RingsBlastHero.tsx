import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { colors } from "../constants/theme";

// Two 3D-looking wedding rings orbit each other, collide, and blast.
// One looping value (0 -> 1 over 7s) drives every part of the scene.
const SCENE = 300;
const MID = SCENE / 2;
const SPARKS = [[-120, -60], [120, -70], [-90, 60], [100, 50], [-60, -110], [60, -120], [-140, 0], [140, 10]] as const;

const centered = (size: number) => ({ position: "absolute" as const, left: MID - size / 2, top: MID - size / 2, width: size, height: size });

export default function RingsBlastHero({ height, compact = false }: { height: number; compact?: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let live = true;
    let loop: Animated.CompositeAnimation | null = null;
    let spinLoop: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!live) return;
      if (reduced) {
        t.setValue(0.2);
        return;
      }
      loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true }));
      spinLoop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
      spinLoop.start();
    });
    return () => {
      live = false;
      loop?.stop();
      spinLoop?.stop();
    };
  }, [t, spin]);

  const at = (input: number[], output: number[]) => t.interpolate({ inputRange: input, outputRange: output });
  const orbit = t.interpolate({ inputRange: [0, 0.4, 1], outputRange: ["0deg", "600deg", "600deg"] });
  const ringOpacity = at([0, 0.04, 0.4, 0.405, 1], [0, 1, 1, 0, 0]);
  const ringA = at([0, 0.4, 0.405, 1], [120, 0, 120, 120]);
  const ringB = at([0, 0.4, 0.405, 1], [-120, 0, -120, -120]);
  const flip = spin.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.18, 1, 0.18, 1] });
  const shake = at([0, 0.4, 0.41, 0.43, 0.45, 0.47, 1], [0, 0, -4, 4, -3, 0, 0]);

  const wave = (delay: number) => ({
    opacity: at([0, 0.4 + delay, 0.42 + delay, 0.74 + delay, 1], [0, 0, 0.95, 0, 0]),
    transform: [{ scale: at([0, 0.4 + delay, 0.74 + delay, 1], [0.1, 0.1, 6.5, 6.5]) }],
  });

  const ring = (color: string, gem: boolean, translateX: Animated.AnimatedInterpolation<number>) => (
    <Animated.View style={[styles.ringWrap, { opacity: ringOpacity, transform: [{ translateX }] }]}>
      <Animated.View style={{ width: 78, height: 78, alignItems: "center", transform: [{ scaleX: flip }] }}>
        <Svg width={78} height={78} viewBox="0 0 78 78">
          <Circle cx={39} cy={39} r={31} stroke={color} strokeWidth={12} fill="none" />
          <Circle cx={39} cy={39} r={37} stroke="rgba(0,0,0,0.25)" strokeWidth={1.5} fill="none" />
          <Circle cx={39} cy={39} r={26} stroke="rgba(255,255,255,0.6)" strokeWidth={2} strokeDasharray="42 200" fill="none" />
        </Svg>
        {gem ? <View style={styles.gem} /> : null}
      </Animated.View>
    </Animated.View>
  );

  return (
    <View style={[styles.hero, { height }]} accessibilityLabel="Two wedding rings collide in a burst of light" accessible>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="heroBg" cx="70%" cy="20%" r="85%">
            <Stop offset="0" stopColor={colors.heroB} />
            <Stop offset="1" stopColor={colors.heroA} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroBg)" />
      </Svg>
      <View style={styles.stage} pointerEvents="none">
        <Animated.View style={{ width: SCENE, height: SCENE, transform: [{ scale: compact ? 0.68 : 1 }, { translateX: shake }] }}>
          <Animated.View style={[styles.orbit, { transform: [{ rotate: orbit }] }]}>
            {ring(colors.accent, true, ringA)}
            {ring(colors.ringB, false, ringB)}
          </Animated.View>
          <Animated.View style={[styles.round, centered(80), styles.waveOne, wave(0)]} />
          <Animated.View style={[styles.round, centered(80), styles.waveTwo, wave(0.03)]} />
          <Animated.View style={[centered(130), { opacity: at([0, 0.4, 0.46, 0.66, 0.86, 1], [0, 0, 1, 0.85, 0, 0]), transform: [{ scale: at([0, 0.4, 0.46, 0.66, 0.86, 1], [0.1, 0.1, 1, 1.3, 1.45, 1.45]) }] }]}>
            <Svg width={130} height={130} viewBox="0 0 130 130">
              <Defs>
                <RadialGradient id="fireball" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FFF6C8" />
                  <Stop offset="0.38" stopColor="#FFB347" />
                  <Stop offset="0.68" stopColor="#E8551E" />
                  <Stop offset="1" stopColor="#E8551E" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={65} cy={65} r={65} fill="url(#fireball)" />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.round, centered(140), styles.flash, { opacity: at([0, 0.39, 0.41, 0.58, 1], [0, 0, 1, 0, 0]), transform: [{ scale: at([0, 0.39, 0.41, 0.58, 1], [0.2, 0.2, 1.5, 3.4, 3.4]) }] }]} />
          {SPARKS.map(([x, y]) => (
            <Animated.View
              key={`${x},${y}`}
              style={[styles.round, styles.spark, { opacity: at([0, 0.4, 0.42, 0.76, 1], [0, 0, 1, 0, 0]), transform: [{ translateX: at([0, 0.4, 0.42, 0.76, 1], [0, 0, 0, x, x]) }, { translateY: at([0, 0.4, 0.42, 0.76, 1], [0, 0, 0, y, y]) }] }]}
            />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", overflow: "hidden", backgroundColor: colors.heroA },
  stage: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  orbit: { position: "absolute", left: MID, top: MID, width: 0, height: 0 },
  ringWrap: { position: "absolute", left: -39, top: -39, width: 78, height: 78 },
  gem: { position: "absolute", top: -4, width: 14, height: 14, backgroundColor: "#EAF6FF", transform: [{ rotate: "45deg" }] },
  round: { borderRadius: 999 },
  waveOne: { borderWidth: 5, borderColor: "#FFE9A8" },
  waveTwo: { borderWidth: 3, borderColor: "#FF9A3C" },
  flash: { backgroundColor: "rgba(255,255,255,0.85)" },
  spark: { position: "absolute", left: MID - 3.5, top: MID - 3.5, width: 7, height: 7, backgroundColor: "#FFD27A" },
});
