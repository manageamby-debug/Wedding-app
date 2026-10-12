import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Alert, Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { applyThemeMode, colors as theme, isLightTheme } from "../../constants/theme";
import { PLAN_PRICES, type PlanName } from "../../constants/plans";
import { getStored, setStored } from "../../constants/themeStorage";
import { COPY, fill, type Lang } from "../../constants/welcomeCopy";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_LINK, PLAY_STORE_URL } from "../../constants/contact";

const colors = {
  ink: theme.text,
  muted: theme.textMuted,
  plum: theme.primary,
  rose: theme.accent,
  gold: theme.accent,
  paper: theme.background,
  line: theme.border,
  white: theme.surface,
  pale: theme.accentSoft,
};

// Ten invitation-card palettes. The hero card fades from one to the next.
type CardTheme = {
  bg: string;      // card background
  text: string;    // brand, names, date
  muted: string;   // overline, venue
  accent: string;  // tag, heart, ampersand, RSVP label
  ring: string;    // wedding rings and divider line
  border: string;  // card and footer borders
  glow: string;    // circle behind the card
};

const CARD_THEMES: CardTheme[] = [
  { bg: "#2A1B4A", text: "#FFFFFF", muted: "#BFB3DD", accent: "#F5B942", ring: "#F5B942", border: "#4B3A78", glow: "#6B4BB8" }, // Royal Plum
  { bg: "#0F3D32", text: "#F1FFF8", muted: "#A8D5C4", accent: "#F2C14E", ring: "#5EC79A", border: "#1F6B58", glow: "#1E8A6A" }, // Emerald
  { bg: "#FCE8EC", text: "#4A1D2B", muted: "#8A5A68", accent: "#D6336C", ring: "#E8899F", border: "#F2C2CE", glow: "#F5B3C3" }, // Rose Blush
  { bg: "#0B2545", text: "#F4F8FF", muted: "#A9BEDD", accent: "#5DA9FF", ring: "#8EC5FF", border: "#1F4678", glow: "#1D5FA8" }, // Ocean Navy
  { bg: "#E8553A", text: "#FFF5EC", muted: "#FFD9C9", accent: "#FFE08A", ring: "#FFE08A", border: "#F58A72", glow: "#FF9B7A" }, // Sunset Coral
  { bg: "#EEE8FF", text: "#2D2250", muted: "#6F6498", accent: "#7C5CFA", ring: "#B6A4FF", border: "#D5CAFF", glow: "#CFC3FF" }, // Lavender Dream
  { bg: "#FBF3DF", text: "#3A2D0E", muted: "#7D6A3C", accent: "#B8860B", ring: "#D4A93C", border: "#EBD9A4", glow: "#F0DFA6" }, // Champagne Gold
  { bg: "#0E5A5F", text: "#ECFFFD", muted: "#A7DDD9", accent: "#FFD166", ring: "#7FE0D5", border: "#1B8087", glow: "#1A8F94" }, // Teal Lagoon
  { bg: "#5A1228", text: "#FFF1F3", muted: "#E3B3BE", accent: "#F7C873", ring: "#F7C873", border: "#8A2A47", glow: "#A02A4F" }, // Burgundy Wine
  { bg: "#DDE8D5", text: "#1F3320", muted: "#55704F", accent: "#2F7D4B", ring: "#8FB98A", border: "#BCD1B1", glow: "#B9D3B0" }, // Forest Sage
];

const THEME_HOLD_MS = 2800;
const SPIN_MS = 1000;

const tierOptions: { name: PlanName; price: string; featured: boolean }[] = [
  { name: "Starter", price: PLAN_PRICES.Starter, featured: false },
  { name: "Plus", price: PLAN_PRICES.Plus, featured: true },
  { name: "Premium", price: PLAN_PRICES.Premium, featured: false },
];

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const scrollRef = useRef<ScrollView>(null);
  const servicesY = useRef(0);
  const pricingY = useRef(0);
  const [language, setLanguage] = useState<Lang>(() => getStored("welcomeLanguage") === "en" ? "en" : "sw");
  const copy = COPY[language];

  // 0 = current card showing, 1 = next card fully in place.
  const [spin] = useState(() => new Animated.Value(0));
  const [current, setCurrent] = useState(0);
  const next = (current + 1) % CARD_THEMES.length;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      Animated.timing(spin, {
        toValue: 1,
        duration: SPIN_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false, // the glow colour needs the JS driver
      }).start(({ finished }) => {
        if (!finished || cancelled) return;
        setCurrent((value) => (value + 1) % CARD_THEMES.length);
        spin.setValue(0);
      });
    }, THEME_HOLD_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      spin.stopAnimation();
    };
  }, [current, spin]);

  // The old card spins away to the left while the next one spins in from the right.
  const range = (from: number | string, to: number | string) => spin.interpolate({ inputRange: [0, 1], outputRange: [from, to] as number[] | string[] });
  const outgoingStyle = {
    opacity: spin.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.6, 0] }),
    transform: [
      { perspective: 900 },
      { translateX: range(0, -150) },
      { rotateY: range("0deg", "-75deg") },
      { rotateZ: range("-2deg", "-16deg") },
      { scale: range(1, 0.85) },
    ],
  };
  const incomingStyle = {
    opacity: spin.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.6, 1] }),
    transform: [
      { perspective: 900 },
      { translateX: range(150, 0) },
      { rotateY: range("75deg", "0deg") },
      { rotateZ: range("14deg", "-2deg") },
      { scale: range(0.85, 1) },
    ],
  };
  const glowColor = range(CARD_THEMES[current].glow, CARD_THEMES[next].glow);

  const scrollTo = (y: number) => scrollRef.current?.scrollTo({ y, animated: true });
  const openRegister = () => router.push("/register");
  const [selectedPlan, setSelectedPlan] = useState<PlanName>("Plus");
  const tiers = tierOptions.map((tier) => ({ ...tier, items: copy.tierItems[tier.name] }));
  const chosenTier = tiers.find((tier) => tier.name === selectedPlan) ?? tiers[1];
  const continueWithPlan = () => router.push({ pathname: "/register", params: { plan: selectedPlan } });
  const openLogin = () => router.push("/login");
  const toggleLanguage = () => {
    const nextLanguage = language === "sw" ? "en" : "sw";
    setStored("welcomeLanguage", nextLanguage);
    setLanguage(nextLanguage);
  };
  const toggleTheme = () => {
    const restarted = applyThemeMode(isLightTheme ? "dark" : "light");
    if (!restarted) Alert.alert("Chereko", copy.themeRestartMessage);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => scrollTo(0)} style={styles.brand}>
            <View style={styles.brandIcon}><Text style={styles.brandHeart}>♡</Text></View>
            <Text style={styles.brandName}>chereko</Text>
          </Pressable>
          {!compact ? (
            <View style={styles.nav}>
              <Pressable onPress={() => scrollTo(0)}><Text style={styles.navText}>{copy.nav.home}</Text></Pressable>
              <Pressable onPress={() => scrollTo(servicesY.current)}><Text style={styles.navText}>{copy.nav.services}</Text></Pressable>
              <Pressable onPress={() => scrollTo(pricingY.current)}><Text style={styles.navText}>{copy.nav.pricing}</Text></Pressable>
            </View>
          ) : null}
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={copy.switchLanguage} onPress={toggleLanguage} style={styles.headerUtilityButton}>
              <Text style={styles.headerUtilityText}>{language === "sw" ? "EN" : "SW"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={copy.switchTheme} onPress={toggleTheme} style={styles.headerUtilityButton}>
              <Text style={styles.themeIcon}>{isLightTheme ? "☾" : "☀"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openLogin} style={styles.loginButton}>
              <Text style={styles.loginText}>{copy.nav.login}</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.hero, compact && styles.heroCompact]}>
          <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
            <View style={styles.pill}><View style={styles.pillDot} /><Text style={styles.pillText}>{copy.pill}</Text></View>
            <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>{copy.heroTitle}</Text>
            <Text style={styles.heroBody}>{copy.heroBody}</Text>
            <View style={[styles.heroActions, compact && styles.heroActionsCompact]}>
              <Pressable accessibilityRole="button" onPress={openRegister} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryText}>{copy.start}</Text><Text style={styles.arrow}>→</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => scrollTo(servicesY.current)} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>{copy.seeServices}</Text>
              </Pressable>
            </View>
            <View style={styles.trustLine}><Text style={styles.check}>✓</Text><Text style={styles.trustText}>{copy.trust[0]}</Text><Text style={styles.trustDot}>·</Text><Text style={styles.trustText}>{copy.trust[1]}</Text></View>
          </View>

          <View style={[styles.heroVisual, compact && styles.heroVisualCompact]}>
            <Animated.View style={[styles.visualGlow, { backgroundColor: glowColor }]} />
            <View style={styles.cardStage}>
              <InviteCard theme={CARD_THEMES[current]} animatedStyle={outgoingStyle} copy={copy} />
              <InviteCard theme={CARD_THEMES[next]} animatedStyle={incomingStyle} copy={copy} />
            </View>
            <View style={styles.floatingNote}><View style={styles.floatingIcon}><Text style={styles.floatingIconText}>✓</Text></View><View><Text style={styles.floatingTitle}>{copy.note.title}</Text><Text style={styles.floatingBody}>{copy.note.body}</Text></View></View>
          </View>
        </View>

        <View style={styles.quickFacts}>
          <View style={styles.fact}><Text style={styles.factValue}>{copy.facts[0].value}</Text><Text style={styles.factLabel}>{copy.facts[0].label}</Text></View>
          <View style={styles.factDivider} />
          <View style={styles.fact}><Text style={styles.factValue}>{copy.facts[1].value}</Text><Text style={styles.factLabel}>{copy.facts[1].label}</Text></View>
          <View style={styles.factDivider} />
          <View style={styles.fact}><Text style={styles.factValue}>{copy.facts[2].value}</Text><Text style={styles.factLabel}>{copy.facts[2].label}</Text></View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.kicker}>{copy.stepsKicker}</Text>
            <Text style={styles.sectionTitle}>{copy.stepsTitle}</Text>
          </View>
          <View style={[styles.steps, compact && styles.stepsCompact]}>
            {copy.steps.map((step, index) => <View key={step.title} style={[styles.stepCard, compact && styles.stepCardCompact]}><Text style={styles.stepNumber}>{index + 1}</Text><Text style={styles.stepTitle}>{step.title}</Text><Text style={styles.stepBody}>{step.body}</Text></View>)}
          </View>
        </View>

        <View onLayout={(event) => { servicesY.current = event.nativeEvent.layout.y; }} style={[styles.section, styles.servicesSection]}>
          <View style={styles.sectionHeading}>
            <Text style={styles.kicker}>{copy.servicesKicker}</Text>
            <Text style={styles.sectionTitle}>{copy.servicesTitle}</Text>
            <Text style={styles.sectionSub}>{copy.servicesSub}</Text>
          </View>
          <View style={[styles.serviceGrid, compact && styles.serviceGridCompact]}>
            {copy.services.map((service, index) => <View key={service.title} style={[styles.serviceCard, compact && styles.serviceCardCompact]}><Text style={styles.serviceNumber}>{String(index + 1).padStart(2, "0")}</Text><Text style={styles.serviceTitle}>{service.title}</Text><Text style={styles.serviceBody}>{service.body}</Text></View>)}
          </View>
        </View>

        <View style={[styles.pricingSection]} onLayout={(event) => { pricingY.current = event.nativeEvent.layout.y; }}>
          <View style={styles.sectionHeading}>
            <Text style={styles.kicker}>{copy.pricingKicker}</Text>
            <Text style={[styles.sectionTitle, styles.pricingTitle]}>{copy.pricingTitle}</Text>
            <Text style={[styles.sectionSub, styles.pricingSub]}>{copy.pricingSub}</Text>
          </View>
          <View style={[styles.tierGrid, compact && styles.tierGridCompact]}>
            {tiers.map((tier) => <View key={tier.name} style={[styles.tierCard, compact && styles.tierCardCompact, tier.featured && styles.tierFeatured, selectedPlan === tier.name && styles.tierSelected]}>
              {tier.featured ? <View style={styles.popularBadge}><Text style={styles.popularText}>{copy.popular}</Text></View> : null}
              <Text style={[styles.tierName, tier.featured && styles.tierFeaturedText]}>{tier.name}</Text>
              <View style={styles.priceRow}><Text style={[styles.currency, tier.featured && styles.tierFeaturedText]}>TSh</Text><Text style={[styles.price, tier.featured && styles.tierFeaturedText]}>{tier.price}</Text></View>
              <Text style={[styles.perCard, tier.featured && styles.tierFeaturedMuted]}>{copy.perCard}</Text>
              <View style={[styles.tierRule, tier.featured && styles.tierRuleFeatured]} />
              {tier.items.map((item) => <View key={item} style={styles.tierItem}><Text style={[styles.tierCheck, tier.featured && styles.tierFeaturedText]}>✓</Text><Text style={[styles.tierItemText, tier.featured && styles.tierFeaturedText]}>{item}</Text></View>)}
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedPlan === tier.name }}
                onPress={() => setSelectedPlan(tier.name)}
                style={({ pressed }) => [styles.tierButton, selectedPlan === tier.name && styles.tierButtonSelected, pressed && styles.pressed]}
              >
                <Text style={[styles.tierButtonText, selectedPlan === tier.name && styles.tierButtonTextSelected]}>
                  {selectedPlan === tier.name ? fill(copy.chosen, tier.name) : fill(copy.choose, tier.name)}
                </Text>
              </Pressable>
            </View>)}
          </View>
          <View style={styles.planBar}>
            <View style={styles.planBarCopy}>
              <Text style={styles.planBarLabel}>{copy.planLabel}</Text>
              <Text style={styles.planBarValue}>{chosenTier.name} · TSh {chosenTier.price} {copy.perCardShort}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={continueWithPlan} style={({ pressed }) => [styles.planBarButton, pressed && styles.pressed]}>
              <Text style={styles.planBarButtonText}>{fill(copy.continueWith, chosenTier.name)}</Text><Text style={styles.planBarButtonText}>→</Text>
            </Pressable>
          </View>
          <Text style={styles.creditNote}>{copy.creditNote}</Text>
        </View>

        <View style={[styles.bottomCta, compact && styles.bottomCtaCompact]}>
          <View style={styles.ctaCopy}><Text style={[styles.kicker, styles.ctaKicker]}>{copy.ctaKicker}</Text><Text style={styles.ctaTitle}>{copy.ctaTitle}</Text><Text style={styles.ctaBody}>{copy.ctaBody}</Text></View>
          <Pressable accessibilityRole="button" onPress={openRegister} style={styles.ctaButton}><Text style={styles.ctaButtonText}>{copy.ctaButton}</Text><Text style={styles.ctaArrow}>→</Text></Pressable>
        </View>

        <View style={[styles.footer, compact && styles.footerCompact]}>
          <View style={styles.footerBrand}><Text style={styles.footerName}>chereko</Text><Text style={styles.footerTagline}>{copy.footerTagline}</Text></View>
          <View style={[styles.footerLinks, compact && styles.footerLinksCompact]}>
            <Pressable onPress={() => scrollTo(servicesY.current)}><Text style={styles.footerLink}>{copy.nav.services}</Text></Pressable>
            <Pressable onPress={() => scrollTo(pricingY.current)}><Text style={styles.footerLink}>{copy.nav.pricing}</Text></Pressable>
            <Pressable onPress={openLogin}><Text style={styles.footerLink}>{copy.nav.login}</Text></Pressable>
          </View>
          <View style={[styles.footerContact, compact && styles.footerContactCompact]}>
            <Text style={styles.footerContactTitle}>{copy.contactTitle}</Text>
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`tel:${CONTACT_PHONE_LINK}`)} style={styles.footerContactRow}>
              <Text style={styles.footerContactLabel}>{copy.phoneLabel}:</Text><Text style={styles.footerContactValue}>{CONTACT_PHONE_DISPLAY}</Text>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} style={styles.footerContactRow}>
              <Text style={styles.footerContactLabel}>{copy.emailLabel}:</Text><Text style={styles.footerContactValue}>{CONTACT_EMAIL}</Text>
            </Pressable>
          </View>
          <GooglePlayBadge copy={copy} onPress={PLAY_STORE_URL ? () => Linking.openURL(PLAY_STORE_URL) : undefined} />
          <Text style={styles.copyright}>{copy.copyright}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InviteCard({ theme: card, animatedStyle, copy }: { theme: CardTheme; animatedStyle: ComponentProps<typeof Animated.View>["style"]; copy: typeof COPY["sw"] }) {
  return (
    <Animated.View style={[styles.inviteCard, styles.inviteCardLayer, { backgroundColor: card.bg, borderColor: card.border }, animatedStyle]}>
      <View style={styles.cardTop}><Text style={[styles.cardBrand, { color: card.text }]}>CHEREKO</Text><Text style={[styles.cardTag, { color: card.accent }]}>{copy.card.tag}</Text></View>
      <View style={styles.cardOrnament}><View style={[styles.cardRing, { borderColor: card.ring }]} /><Text style={[styles.cardHeart, { color: card.accent }]}>♡</Text><View style={[styles.cardRingSecond, { borderColor: card.ring }]} /></View>
      <Text style={[styles.cardOverline, { color: card.muted }]}>{copy.card.overline}</Text>
      <Text style={[styles.cardNames, { color: card.text }]}>Amina <Text style={[styles.cardAmp, { color: card.accent }]}>&</Text> Baraka</Text>
      <View style={[styles.cardRule, { backgroundColor: card.ring }]} />
      <Text style={[styles.cardDate, { color: card.text }]}>{copy.card.date}</Text>
      <Text style={[styles.cardVenue, { color: card.muted }]}>Dar es Salaam, Tanzania</Text>
      <View style={[styles.cardFooter, { borderColor: card.border }]}><Text style={[styles.cardRsvp, { color: card.accent }]}>{copy.card.rsvp}</Text><View style={styles.qrMock}>{Array.from({ length: 9 }, (_, index) => <View key={index} style={[styles.qrPixel, index % 3 !== 1 && styles.qrPixelActive]} />)}</View></View>
    </Animated.View>
  );
}

function GooglePlayBadge({ copy, onPress }: { copy: typeof COPY["sw"]; onPress?: () => void }) {
  const badge = (
    <>
      <Svg width={25} height={25} viewBox="0 0 24 24" accessibilityLabel={copy.playStoreName}>
        <Path d="M3.3 2.1 12.6 12l-9.3 9.9c-.4-.2-.6-.7-.6-1.2V3.3c0-.5.2-1 .6-1.2Z" fill="#34A853" />
        <Path d="m3.3 2.1 12.2 6.7 3.5-2L5.8 1.2c-1-.5-2-.1-2.5.9Z" fill="#4285F4" />
        <Path d="m3.3 21.9 12.2-6.7 3.5 2-13.2 5.6c-1 .5-2 .1-2.5-.9Z" fill="#FBBC04" />
        <Path d="m15.5 8.8 6-3.3c.9.5 1.4.8 1.4.8.8.5.8 1.5 0 2l-5 2.8-2.4-2.3Z" fill="#EA4335" />
        <Path d="m15.5 15.2 6 3.3c.9-.5 1.4-.8 1.4-.8.8-.5.8-1.5 0-2l-5-2.8-2.4 2.3Z" fill="#EA4335" />
      </Svg>
      <View style={styles.playBadgeCopy}>
        <Text style={styles.playBadgeTop}>{copy.playTop}</Text>
        <Text style={styles.playBadgeName}>{copy.playStoreName}</Text>
      </View>
    </>
  );

  return onPress ? (
    <Pressable accessibilityRole="link" accessibilityLabel={`${copy.playTop} ${copy.playStoreName}`} onPress={onPress} style={styles.playBadge}>
      {badge}
    </Pressable>
  ) : (
    <View accessibilityRole="image" accessibilityLabel={`${copy.playTop} ${copy.playStoreName}`} style={styles.playBadge}>
      {badge}
    </View>
  );
}

const styles = StyleSheet.create({
  cardStage: { width: 278, height: 336 },
  inviteCardLayer: { position: "absolute", top: 0, left: 0, width: 278, height: 336, pointerEvents: "none" },
  safe: { flex: 1, backgroundColor: colors.white },
  page: { paddingBottom: 0 },
  header: { height: 76, paddingHorizontal: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.line, zIndex: 2 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.gold, alignItems: "center", justifyContent: "center" },
  brandHeart: { color: colors.rose, fontSize: 23, lineHeight: 27 },
  brandName: { color: colors.ink, fontFamily: "serif", fontSize: 25, fontWeight: "700", letterSpacing: -0.5 },
  nav: { flexDirection: "row", alignItems: "center", gap: 34 },
  navText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerUtilityButton: { minWidth: 36, height: 36, paddingHorizontal: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  headerUtilityText: { color: colors.ink, fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  themeIcon: { color: colors.ink, fontSize: 17, lineHeight: 20 },
  loginButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 20 },
  loginText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  hero: { minHeight: 570, paddingHorizontal: 56, paddingVertical: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 46, backgroundColor: colors.paper },
  heroCompact: { paddingHorizontal: 22, paddingVertical: 38, flexDirection: "column", gap: 22 },
  heroCopy: { flex: 1, maxWidth: 560 },
  heroCopyCompact: { width: "100%" },
  pill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: "#F4EAE7", marginBottom: 22 },
  pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.rose },
  pillText: { color: "#9D5866", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: colors.ink, fontFamily: "serif", fontSize: 56, lineHeight: 64, fontWeight: "700", letterSpacing: -1.6, maxWidth: 570 },
  heroTitleCompact: { fontSize: 42, lineHeight: 48 },
  heroBody: { color: colors.muted, fontSize: 16, lineHeight: 27, maxWidth: 470, marginTop: 18 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 28 },
  heroActionsCompact: { alignItems: "stretch", flexDirection: "column" },
  primaryButton: { minHeight: 52, paddingHorizontal: 22, borderRadius: 27, backgroundColor: colors.plum, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, shadowColor: colors.plum, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  arrow: { color: colors.white, fontSize: 18 },
  secondaryButton: { minHeight: 50, paddingHorizontal: 20, borderRadius: 25, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#DDD7D3" },
  secondaryText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  trustLine: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 20 },
  check: { color: "#159C72", fontSize: 14, fontWeight: "800" },
  trustText: { color: colors.muted, fontSize: 12 },
  trustDot: { color: colors.gold, fontSize: 18 },
  heroVisual: { width: 390, height: 410, alignItems: "center", justifyContent: "center" },
  heroVisualCompact: { width: "100%", maxWidth: 390, height: 360, alignSelf: "center" },
  visualGlow: { position: "absolute", width: 320, height: 320, borderRadius: 160, backgroundColor: "#F1E5E2", opacity: 0.8 },
  inviteCard: { width: 278, minHeight: 330, padding: 20, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: "center", shadowColor: colors.ink, shadowOpacity: 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 7, transform: [{ rotate: "-2deg" }] },
  cardTop: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardBrand: { color: colors.ink, fontFamily: "serif", fontWeight: "700", fontSize: 12, letterSpacing: 2 },
  cardTag: { color: colors.rose, fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  cardOrnament: { width: 74, height: 65, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 19 },
  cardRing: { position: "absolute", left: 7, width: 43, height: 43, borderRadius: 22, borderWidth: 3, borderColor: colors.gold },
  cardRingSecond: { position: "absolute", right: 7, width: 43, height: 43, borderRadius: 22, borderWidth: 3, borderColor: colors.gold },
  cardHeart: { zIndex: 1, color: colors.rose, fontSize: 30, lineHeight: 34 },
  cardOverline: { color: colors.muted, fontSize: 8, fontWeight: "700", letterSpacing: 1.7, marginTop: 7 },
  cardNames: { color: colors.ink, fontFamily: "serif", fontSize: 28, fontWeight: "700", marginTop: 8 },
  cardAmp: { color: colors.rose, fontStyle: "italic" },
  cardRule: { width: 48, height: 1, backgroundColor: colors.gold, marginVertical: 12 },
  cardDate: { color: colors.ink, fontSize: 9, fontWeight: "700", letterSpacing: 0.7 },
  cardVenue: { color: colors.muted, fontSize: 10, marginTop: 6 },
  cardFooter: { width: "100%", marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardRsvp: { color: colors.plum, fontSize: 7, fontWeight: "800", letterSpacing: 0.6 },
  qrMock: { width: 35, height: 35, padding: 3, backgroundColor: "#FFF", borderWidth: 1, borderColor: colors.line, flexDirection: "row", flexWrap: "wrap", gap: 2 },
  qrPixel: { width: 7, height: 7, backgroundColor: "#FFFFFF" },
  qrPixelActive: { backgroundColor: "#1A1A1A" },
  floatingNote: { position: "absolute", right: -6, bottom: 44, backgroundColor: colors.white, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 9, shadowColor: colors.ink, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  floatingIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E7F5EF", alignItems: "center", justifyContent: "center" },
  floatingIconText: { color: "#159C72", fontSize: 14, fontWeight: "800" },
  floatingTitle: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  floatingBody: { color: colors.muted, fontSize: 9, marginTop: 3 },
  quickFacts: { paddingVertical: 27, paddingHorizontal: 36, backgroundColor: colors.white, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 44 },
  fact: { alignItems: "center", gap: 4 },
  factValue: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  factLabel: { color: colors.muted, fontSize: 11 },
  factDivider: { width: 1, height: 34, backgroundColor: colors.line },
  section: { paddingHorizontal: 52, paddingVertical: 76, alignItems: "center" },
  sectionHeading: { alignItems: "center", maxWidth: 660, marginBottom: 32 },
  kicker: { color: colors.plum, fontSize: 10, fontWeight: "800", letterSpacing: 1.8, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontFamily: "serif", fontSize: 36, lineHeight: 43, textAlign: "center", fontWeight: "700", letterSpacing: -0.6 },
  sectionSub: { color: colors.muted, fontSize: 14, lineHeight: 23, textAlign: "center", maxWidth: 520, marginTop: 12 },
  steps: { width: "100%", maxWidth: 1020, flexDirection: "row", gap: 15 },
  stepsCompact: { flexDirection: "column" },
  stepCard: { flex: 1, minHeight: 154, padding: 20, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white },
  stepCardCompact: { width: "100%" },
  stepNumber: { color: colors.rose, fontFamily: "serif", fontSize: 24, fontWeight: "700" },
  stepTitle: { color: colors.ink, fontSize: 15, fontWeight: "700", marginTop: 14 },
  stepBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 7 },
  servicesSection: { backgroundColor: colors.paper },
  serviceGrid: { width: "100%", maxWidth: 1020, flexDirection: "row", flexWrap: "wrap", gap: 14 },
  serviceGridCompact: { flexDirection: "column" },
  serviceCard: { width: "48.8%", minHeight: 170, padding: 22, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  serviceCardCompact: { width: "100%" },
  serviceNumber: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  serviceTitle: { color: colors.ink, fontSize: 17, fontWeight: "700", marginTop: 15 },
  serviceBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 8, maxWidth: 390 },
  pricingSection: { paddingHorizontal: 32, paddingVertical: 76, backgroundColor: theme.primary, alignItems: "center" },
  pricingTitle: { color: colors.white },
  pricingSub: { color: "#C0BBCB" },
  tierGrid: { width: "100%", maxWidth: 1020, flexDirection: "row", gap: 14, alignItems: "stretch" },
  tierGridCompact: { flexDirection: "column", maxWidth: 430 },
  tierCard: { flex: 1, minHeight: 310, padding: 21, borderWidth: 1, borderColor: theme.border, borderRadius: 24, backgroundColor: theme.surface },
  tierCardCompact: { width: "100%" },
  tierFeatured: { backgroundColor: colors.white, borderColor: colors.white },
  tierSelected: { borderColor: colors.gold, borderWidth: 2 },
  popularBadge: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 5, backgroundColor: "#F4EAE7", borderRadius: 12, marginBottom: 10 },
  popularText: { color: "#9D5866", fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  tierName: { color: theme.text, fontSize: 13, fontWeight: "700" },
  tierFeaturedText: { color: colors.ink },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 12 },
  currency: { color: "#D2CDE0", fontSize: 12, fontWeight: "700" },
  price: { color: theme.text, fontSize: 38, fontWeight: "800", letterSpacing: -1 },
  perCard: { color: "#B9B4C6", fontSize: 11, marginTop: 3 },
  tierFeaturedMuted: { color: colors.muted },
  tierRule: { height: 1, backgroundColor: theme.border, marginVertical: 16 },
  tierRuleFeatured: { backgroundColor: colors.line },
  tierItem: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 11 },
  tierCheck: { color: "#C6A276", fontSize: 12, fontWeight: "800" },
  tierItemText: { color: theme.text, fontSize: 11, lineHeight: 16, flex: 1 },
  tierButton: { minHeight: 42, borderWidth: 1, borderColor: "#777184", borderRadius: 22, marginTop: 8, alignItems: "center", justifyContent: "center" },
  tierButtonSelected: { backgroundColor: colors.plum, borderColor: colors.plum },
  tierButtonText: { color: theme.text, fontSize: 11, fontWeight: "700" },
  tierButtonTextSelected: { color: "#FFFFFF" },
  planBar: { width: "100%", maxWidth: 1020, marginTop: 22, padding: 16, borderRadius: 18, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 },
  planBarCopy: { flex: 1, minWidth: 180 },
  planBarLabel: { color: "#B9B4C6", fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  planBarValue: { color: theme.text, fontSize: 16, fontWeight: "700", marginTop: 5 },
  planBarButton: { minHeight: 48, paddingHorizontal: 22, borderRadius: 24, backgroundColor: colors.plum, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  planBarButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  creditNote: { color: "#C0BBCB", fontSize: 11, textAlign: "center", marginTop: 20 },
  bottomCta: { marginHorizontal: 32, marginVertical: 62, padding: 30, borderRadius: 18, backgroundColor: "#F4EAE7", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20 },
  bottomCtaCompact: { marginHorizontal: 18, marginVertical: 40, padding: 22, flexDirection: "column", alignItems: "stretch" },
  ctaCopy: { flex: 1 },
  ctaKicker: { color: "#5632A8" },
  ctaTitle: { color: "#302032", fontFamily: "serif", fontWeight: "700", fontSize: 28, lineHeight: 34 },
  ctaBody: { color: "#655965", fontSize: 13, lineHeight: 21, marginTop: 8 },
  ctaButton: { minHeight: 50, paddingHorizontal: 20, borderRadius: 25, backgroundColor: colors.plum, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  ctaButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  ctaArrow: { color: "#FFFFFF", fontSize: 17 },
  footer: { minHeight: 150, paddingHorizontal: 32, paddingVertical: 24, borderTopWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 },
  footerCompact: { flexDirection: "column", alignItems: "flex-start", paddingHorizontal: 22, gap: 20 },
  footerBrand: { gap: 5 },
  footerName: { color: colors.ink, fontFamily: "serif", fontSize: 24, fontWeight: "700" },
  footerTagline: { color: colors.muted, fontSize: 11 },
  footerLinks: { flexDirection: "row", gap: 22 },
  footerLinksCompact: { width: "100%", justifyContent: "space-between" },
  footerLink: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  footerContact: { minWidth: 220, gap: 5 },
  footerContactCompact: { width: "100%", maxWidth: 390 },
  footerContactTitle: { color: colors.ink, fontSize: 11, fontWeight: "700", marginBottom: 2 },
  footerContactRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  footerContactLabel: { color: colors.muted, fontSize: 10 },
  footerContactValue: { color: colors.ink, fontSize: 10, fontWeight: "600" },
  playBadge: { minWidth: 160, height: 52, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: "#555555", backgroundColor: "#111111", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  playBadgeCopy: { gap: 1 },
  playBadgeTop: { color: "#E6E6E6", fontSize: 8, lineHeight: 10, letterSpacing: 0.4 },
  playBadgeName: { color: "#FFFFFF", fontSize: 15, lineHeight: 18, fontWeight: "600" },
  copyright: { color: colors.muted, fontSize: 10 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
});
