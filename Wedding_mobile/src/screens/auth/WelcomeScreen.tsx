import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors as theme } from "../../constants/theme";

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

const services = [
  { number: "01", title: "Mialiko ya kidigitali", body: "Tengeneza mwaliko wenye QR code na link ya RSVP kwa kila mgeni." },
  { number: "02", title: "Wageni na RSVP", body: "Panga orodha ya wageni, tafuta taarifa zao na fuatilia majibu." },
  { number: "03", title: "Michango na malipo", body: "Rekodi michango, angalia hali ya malipo na fuatilia jumla ya fedha." },
  { number: "04", title: "Check-in ya wageni", body: "Thibitisha waliofika kwa kutumia code ya mwaliko kwenye siku ya tukio." },
];

const steps = [
  { number: "1", title: "Fungua akaunti", body: "Jisajili bure kama mratibu wa harusi." },
  { number: "2", title: "Weka tukio lako", body: "Ongeza tarehe, eneo na taarifa muhimu za harusi." },
  { number: "3", title: "Alika na fuatilia", body: "Ongeza wageni, tuma mialiko na angalia RSVP." },
];

const tiers = [
  { name: "Starter", price: "500", featured: false, items: ["Taarifa na namba ya kadi", "SMS na email link", "Ripoti ya PDF"] },
  { name: "Plus", price: "750", featured: true, items: ["Vyote vya Starter", "WhatsApp", "QR code na template", "Link ya RSVP"] },
  { name: "Premium", price: "950", featured: false, items: ["Vyote vya Plus", "Picha ya wanandoa", "Ujumbe wa shukrani"] },
];

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const scrollRef = useRef<ScrollView>(null);
  const servicesY = useRef(0);
  const pricingY = useRef(0);

  const scrollTo = (y: number) => scrollRef.current?.scrollTo({ y, animated: true });
  const openRegister = () => router.push("/register");
  const openLogin = () => router.push("/login");

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
              <Pressable onPress={() => scrollTo(0)}><Text style={styles.navText}>Nyumbani</Text></Pressable>
              <Pressable onPress={() => scrollTo(servicesY.current)}><Text style={styles.navText}>Huduma</Text></Pressable>
              <Pressable onPress={() => scrollTo(pricingY.current)}><Text style={styles.navText}>Bei za e-card</Text></Pressable>
            </View>
          ) : null}
          <Pressable accessibilityRole="button" onPress={openLogin} style={styles.loginButton}>
            <Text style={styles.loginText}>Ingia</Text>
          </Pressable>
        </View>

        <View style={[styles.hero, compact && styles.heroCompact]}>
          <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
            <View style={styles.pill}><View style={styles.pillDot} /><Text style={styles.pillText}>HARUSI YAKO, KWA UTULIVU</Text></View>
            <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>Panga siku yako ya kipekee, kwa urahisi.</Text>
            <Text style={styles.heroBody}>Chereko inakusaidia kupanga wageni, mialiko, RSVP na michango sehemu moja. Anza kupanga harusi yako bila usumbufu.</Text>
            <View style={[styles.heroActions, compact && styles.heroActionsCompact]}>
              <Pressable accessibilityRole="button" onPress={openRegister} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryText}>Anza bure</Text><Text style={styles.arrow}>→</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => scrollTo(servicesY.current)} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Ona huduma</Text>
              </Pressable>
            </View>
            <View style={styles.trustLine}><Text style={styles.check}>✓</Text><Text style={styles.trustText}>Kujiunga ni bure</Text><Text style={styles.trustDot}>·</Text><Text style={styles.trustText}>Rahisi kutumia</Text></View>
          </View>

          <View style={[styles.heroVisual, compact && styles.heroVisualCompact]}>
            <View style={styles.visualGlow} />
            <View style={styles.inviteCard}>
              <View style={styles.cardTop}><Text style={styles.cardBrand}>CHEREKO</Text><Text style={styles.cardTag}>MWALIKO</Text></View>
              <View style={styles.cardOrnament}><View style={styles.cardRing} /><Text style={styles.cardHeart}>♡</Text><View style={styles.cardRingSecond} /></View>
              <Text style={styles.cardOverline}>TUNAFURAHI KUKUALIKA</Text>
              <Text style={styles.cardNames}>Amina <Text style={styles.cardAmp}>&</Text> Baraka</Text>
              <View style={styles.cardRule} />
              <Text style={styles.cardDate}>JUMAMOSI · 14 JUNI · 2026</Text>
              <Text style={styles.cardVenue}>Dar es Salaam, Tanzania</Text>
              <View style={styles.cardFooter}><Text style={styles.cardRsvp}>THAMINISHA UHUDHURIAJI</Text><View style={styles.qrMock}>{Array.from({ length: 9 }, (_, index) => <View key={index} style={[styles.qrPixel, index % 3 !== 1 && styles.qrPixelActive]} />)}</View></View>
            </View>
            <View style={styles.floatingNote}><View style={styles.floatingIcon}><Text style={styles.floatingIconText}>✓</Text></View><View><Text style={styles.floatingTitle}>Mialiko tayari</Text><Text style={styles.floatingBody}>QR code na RSVP ndani</Text></View></View>
          </View>
        </View>

        <View style={styles.quickFacts}>
          <View style={styles.fact}><Text style={styles.factValue}>BURE</Text><Text style={styles.factLabel}>kuanza kupanga</Text></View>
          <View style={styles.factDivider} />
          <View style={styles.fact}><Text style={styles.factValue}>1 sehemu</Text><Text style={styles.factLabel}>kwa taarifa za tukio</Text></View>
          <View style={styles.factDivider} />
          <View style={styles.fact}><Text style={styles.factValue}>QR + RSVP</Text><Text style={styles.factLabel}>kwa mwaliko wako</Text></View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.kicker}>ANZA KWA HATUA TATU</Text>
            <Text style={styles.sectionTitle}>Kutoka wazo hadi siku ya harusi.</Text>
          </View>
          <View style={[styles.steps, compact && styles.stepsCompact]}>
            {steps.map((step) => <View key={step.number} style={[styles.stepCard, compact && styles.stepCardCompact]}><Text style={styles.stepNumber}>{step.number}</Text><Text style={styles.stepTitle}>{step.title}</Text><Text style={styles.stepBody}>{step.body}</Text></View>)}
          </View>
        </View>

        <View onLayout={(event) => { servicesY.current = event.nativeEvent.layout.y; }} style={[styles.section, styles.servicesSection]}>
          <View style={styles.sectionHeading}>
            <Text style={styles.kicker}>VITU MUHIMU, PAMOJA</Text>
            <Text style={styles.sectionTitle}>Panga harusi yako bila kupoteza taarifa.</Text>
            <Text style={styles.sectionSub}>Zana za msingi za kusimamia wageni na shughuli yako, kwa mpangilio mmoja.</Text>
          </View>
          <View style={[styles.serviceGrid, compact && styles.serviceGridCompact]}>
            {services.map((service) => <View key={service.number} style={[styles.serviceCard, compact && styles.serviceCardCompact]}><Text style={styles.serviceNumber}>{service.number}</Text><Text style={styles.serviceTitle}>{service.title}</Text><Text style={styles.serviceBody}>{service.body}</Text></View>)}
          </View>
        </View>

        <View style={[styles.pricingSection]} onLayout={(event) => { pricingY.current = event.nativeEvent.layout.y; }}>
          <View style={styles.sectionHeading}>
            <Text style={styles.kicker}>E-CARD ZAIDI YA KAWAIDA</Text>
            <Text style={[styles.sectionTitle, styles.pricingTitle]}>Chagua kadi inayokufaa.</Text>
            <Text style={[styles.sectionSub, styles.pricingSub]}>Bei kwa kila kadi ya kidigitali. Unaweza kuanza na usajili wa bure.</Text>
          </View>
          <View style={[styles.tierGrid, compact && styles.tierGridCompact]}>
            {tiers.map((tier) => <View key={tier.name} style={[styles.tierCard, compact && styles.tierCardCompact, tier.featured && styles.tierFeatured]}>
              {tier.featured ? <View style={styles.popularBadge}><Text style={styles.popularText}>INAPENDWA</Text></View> : null}
              <Text style={[styles.tierName, tier.featured && styles.tierFeaturedText]}>{tier.name}</Text>
              <View style={styles.priceRow}><Text style={[styles.currency, tier.featured && styles.tierFeaturedText]}>TSh</Text><Text style={[styles.price, tier.featured && styles.tierFeaturedText]}>{tier.price}</Text></View>
              <Text style={[styles.perCard, tier.featured && styles.tierFeaturedMuted]}>kwa kadi moja</Text>
              <View style={[styles.tierRule, tier.featured && styles.tierRuleFeatured]} />
              {tier.items.map((item) => <View key={item} style={styles.tierItem}><Text style={[styles.tierCheck, tier.featured && styles.tierFeaturedText]}>✓</Text><Text style={[styles.tierItemText, tier.featured && styles.tierFeaturedText]}>{item}</Text></View>)}
              <Pressable accessibilityRole="button" onPress={openRegister} style={[styles.tierButton, tier.featured && styles.tierButtonFeatured]}><Text style={[styles.tierButtonText, tier.featured && styles.tierButtonTextFeatured]}>Chagua {tier.name}</Text></Pressable>
            </View>)}
          </View>
          <Text style={styles.creditNote}>SMS: TSh 25 kwa ujumbe · WhatsApp: TSh 75 kwa ujumbe</Text>
        </View>

        <View style={styles.bottomCta}>
          <View style={styles.ctaCopy}><Text style={styles.kicker}>SASA NI WAKATI WAKO</Text><Text style={styles.ctaTitle}>Anza kupanga kumbukumbu nzuri.</Text><Text style={styles.ctaBody}>Fungua akaunti yako na uanze kuweka maelezo ya tukio lako.</Text></View>
          <Pressable accessibilityRole="button" onPress={openRegister} style={styles.ctaButton}><Text style={styles.ctaButtonText}>Jisajili bure</Text><Text style={styles.ctaArrow}>→</Text></Pressable>
        </View>

        <View style={styles.footer}><View style={styles.footerBrand}><Text style={styles.footerName}>chereko</Text><Text style={styles.footerTagline}>Panga siku yako ya kipekee.</Text></View><View style={[styles.footerLinks, compact && styles.footerLinksCompact]}><Pressable onPress={() => scrollTo(servicesY.current)}><Text style={styles.footerLink}>Huduma</Text></Pressable><Pressable onPress={() => scrollTo(pricingY.current)}><Text style={styles.footerLink}>Bei za e-card</Text></Pressable><Pressable onPress={openLogin}><Text style={styles.footerLink}>Ingia</Text></Pressable></View><Text style={styles.copyright}>© Chereko</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  page: { paddingBottom: 0 },
  header: { height: 76, paddingHorizontal: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.line, zIndex: 2 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.gold, alignItems: "center", justifyContent: "center" },
  brandHeart: { color: colors.rose, fontSize: 23, lineHeight: 27 },
  brandName: { color: colors.ink, fontFamily: "serif", fontSize: 25, fontWeight: "700", letterSpacing: -0.5 },
  nav: { flexDirection: "row", alignItems: "center", gap: 34 },
  navText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
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
  qrPixelActive: { backgroundColor: colors.ink },
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
  tierButtonFeatured: { backgroundColor: colors.plum, borderColor: colors.plum },
  tierButtonText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  tierButtonTextFeatured: { color: colors.white },
  creditNote: { color: "#C0BBCB", fontSize: 11, textAlign: "center", marginTop: 20 },
  bottomCta: { marginHorizontal: 32, marginVertical: 62, padding: 30, borderRadius: 18, backgroundColor: "#F4EAE7", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20 },
  ctaCopy: { flex: 1 },
  ctaTitle: { color: colors.ink, fontFamily: "serif", fontWeight: "700", fontSize: 28, lineHeight: 34 },
  ctaBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 8 },
  ctaButton: { minHeight: 50, paddingHorizontal: 20, borderRadius: 25, backgroundColor: colors.plum, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  ctaButtonText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  ctaArrow: { color: colors.white, fontSize: 17 },
  footer: { minHeight: 150, paddingHorizontal: 32, paddingVertical: 24, borderTopWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 },
  footerBrand: { gap: 5 },
  footerName: { color: colors.ink, fontFamily: "serif", fontSize: 24, fontWeight: "700" },
  footerTagline: { color: colors.muted, fontSize: 11 },
  footerLinks: { flexDirection: "row", gap: 22 },
  footerLinksCompact: { width: "100%", justifyContent: "space-between" },
  footerLink: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  copyright: { color: colors.muted, fontSize: 10 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
});
