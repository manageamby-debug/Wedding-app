import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { type ReactNode, useCallback, useState } from "react";
import {
  Alert,
  Image,
  type ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import LoadingState from "../components/LoadingState";
import WeddingNav from "../src/components/WeddingNav";
import Icon from "../src/components/Icon";
import GradientBlock from "../src/components/GradientBlock";
import { colors, fonts, gradientPairs } from "../src/constants/theme";
import { useTopPadding } from "../src/hooks/useTopPadding";
import api from "../src/services/api";
import { getToken } from "../src/services/auth";

const chapters = ["Tulipokutana", "Uchumba", "Posa", "Maandalizi", "Harusi"] as const;
type Chapter = (typeof chapters)[number];
type Event = { id: number; status: string; event_date: string };
// taken_at is optional: when the backend sends it, each chapter shows its date range.
type StoryPhoto = { id: number; event_id: number; chapter: Chapter; created_at: string; image_url: string; taken_at?: string | null };

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ detail?: unknown }>(error)) {
    if (!error.response) return "Siwezi kufikia server. Hakikisha backend inaendelea kufanya kazi.";
    const detail = error.response.data?.detail;
    if (typeof detail === "string") return detail;
    if (error.response.status === 413) return "Picha imezidi ukubwa wa 10 MB.";
  }
  return "Imeshindikana kuhifadhi picha. Jaribu tena.";
}

const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
function rangeLabel(photos: StoryPhoto[]) {
  const dates = photos.map((photo) => photo.taken_at).filter((value): value is string => !!value).sort();
  if (!dates.length) return "";
  const first = monthYear(dates[0]);
  const last = monthYear(dates[dates.length - 1]);
  return first === last ? first : `${first} – ${last}`;
}

export default function OurStoryScreen() {
  const topPadding = useTopPadding();
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<StoryPhoto[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | "All">("All");
  const [expanded, setExpanded] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [retry, setRetry] = useState(0);

  useFocusEffect(useCallback(() => {
    let live = true;
    setIsLoading(true);
    setErrorMessage("");
    async function loadStory() {
      try {
        const eventsResponse = await api.get<Event[]>("/events");
        const selectedEvent = eventsResponse.data.find(
          (item) => item.status === "active" || item.status === "published",
        ) ?? eventsResponse.data[0] ?? null;
        if (!live) return;
        setEvent(selectedEvent);
        if (!selectedEvent) {
          setPhotos([]);
          return;
        }
        const response = await api.get<StoryPhoto[]>(
          "/events/" + selectedEvent.id + "/story-photos",
        );
        if (live) setPhotos(response.data);
      } catch (error) {
        if (live) setErrorMessage(getErrorMessage(error));
      } finally {
        if (live) setIsLoading(false);
      }
    }
    void loadStory();
    return () => { live = false; };
  }, [retry]));

  // The wedding-day chapter stays locked until the wedding day has passed.
  const harusiLocked = !!event && new Date().setHours(0, 0, 0, 0) <= new Date(`${event.event_date}T00:00:00`).getTime();
  const isLocked = (chapter: Chapter) => chapter === "Harusi" && harusiLocked;

  async function uploadPhotos(targetChapter: Chapter | "All" = activeChapter) {
    if (!event || isUploading) return;
    setUploadMessage("");
    setErrorMessage("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.85,
      });
      if (result.canceled || !result.assets.length) return;
      const selectedAssets = result.assets.slice(0, 10);
      setIsUploading(true);
      const chapter = targetChapter === "All" || isLocked(targetChapter) ? "Uchumba" : targetChapter;
      let uploaded = 0;
      for (const asset of selectedAssets) {
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          throw new Error("Kila picha lazima iwe na ukubwa wa 10 MB au chini.");
        }
        const mimeType = asset.mimeType?.toLowerCase() ?? "image/jpeg";
        if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
          throw new Error("Chagua picha ya JPG, PNG au WebP.");
        }
        const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
        const formData = new FormData();
        const fileName = "story-photo." + extension;
        if (Platform.OS === "web") {
          const blob = await (await fetch(asset.uri)).blob();
          formData.append("file", blob, fileName);
        } else {
          formData.append("file", {
            uri: asset.uri,
            name: fileName,
            type: mimeType,
          } as unknown as Blob);
        }
        formData.append("chapter", chapter);
        const uploadedPhoto = await api.post<StoryPhoto>(
          "/events/" + event.id + "/story-photos",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 30000,
          },
        );
        uploaded += 1;
        setPhotos((items) => [uploadedPhoto.data, ...items]);
        setUploadMessage("Imehifadhi picha " + uploaded + " kati ya " + selectedAssets.length + "…");
      }
      const response = await api.get<StoryPhoto[]>("/events/" + event.id + "/story-photos");
      setPhotos(response.data);
      setUploadMessage(uploaded + (uploaded === 1 ? " picha imehifadhiwa." : " picha zimehifadhiwa."));
    } catch (error) {
      setErrorMessage(error instanceof Error && !axios.isAxiosError(error)
        ? error.message
        : getErrorMessage(error));
      setUploadMessage("");
    } finally {
      setIsUploading(false);
    }
  }

  async function removePhoto(photo: StoryPhoto) {
    if (!event) return;
    const confirmDelete = async () => {
      try {
        await api.delete("/events/" + event.id + "/story-photos/" + photo.id);
        setPhotos((items) => items.filter((item) => item.id !== photo.id));
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm("Unataka kufuta picha hii kwenye Our Story?")) void confirmDelete();
    } else {
      Alert.alert("Futa picha", "Unataka kuondoa picha hii kwenye Our Story?", [
        { text: "Ghairi", style: "cancel" },
        { text: "Futa", style: "destructive", onPress: () => void confirmDelete() },
      ]);
    }
  }

  if (isLoading) return <LoadingState message="Inapakia Our Story…" />;
  const visibleChapters = activeChapter === "All" ? chapters : [activeChapter];
  const photoCount = photos.length;

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPadding }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>Our Story</Text>
            <Text style={styles.subtitle}>{photoCount} photos · {chapters.length} chapters</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add photos to Our Story"
            accessibilityState={{ disabled: !event || isUploading }}
            disabled={!event || isUploading}
            onPress={() => void uploadPhotos()}
            style={[styles.add, (!event || isUploading) && styles.disabled]}
          >
            {isUploading ? <Text style={styles.addText}>…</Text> : <Icon name="plus" color={colors.onAccent} size={22} strokeWidth={2.6} />}
          </Pressable>
        </View>
        {event ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filters}>
              {(["All", ...chapters] as const).map((chapter) => (
                <Pressable
                  key={chapter}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeChapter === chapter }}
                  onPress={() => setActiveChapter(chapter)}
                  style={[styles.filter, activeChapter === chapter && styles.filterActive]}
                >
                  <Text style={[styles.filterText, activeChapter === chapter && styles.filterTextActive]}>{chapter}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {uploadMessage ? <Text accessibilityLiveRegion="polite" style={styles.success}>{uploadMessage}</Text> : null}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text>
                <Pressable onPress={() => setRetry((value) => value + 1)}><Text style={styles.retry}>Jaribu tena</Text></Pressable>
              </View>
            ) : null}
            {visibleChapters.map((chapter, chapterIndex) => {
              if (isLocked(chapter) && event) {
                return (
                  <View key={chapter} style={styles.locked}>
                    <Icon name="lock" color={colors.textMuted} size={22} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lockedTitle}>
                        {chapter} · {new Date(`${event.event_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </Text>
                      <Text style={styles.lockedSub}>Opens after the wedding day</Text>
                    </View>
                  </View>
                );
              }
              const chapterPhotos = photos.filter((photo) => photo.chapter === chapter);
              const range = rangeLabel(chapterPhotos);
              const open = expanded === chapter;
              return (
                <View key={chapter} style={styles.chapter}>
                  <View style={styles.chapterHeading}>
                    <View style={styles.chapterTitleRow}>
                      <Text style={styles.chapterTitle} numberOfLines={1}>{chapter}</Text>
                      {range ? <Text style={styles.chapterRange} numberOfLines={1}> · {range}</Text> : null}
                    </View>
                    <Text style={styles.chapterMeta}>{chapterPhotos.length} photos</Text>
                  </View>
                  {chapterPhotos.length === 0 ? (
                    <Pressable accessibilityRole="button" disabled={isUploading} onPress={() => void uploadPhotos(chapter)} style={styles.emptyChapter}>
                      <Icon name="plus" color={colors.accent} size={28} />
                      <Text style={styles.emptyTitle}>Add photos for {chapter}</Text>
                      <Text style={styles.emptyHint}>Choose photos from your phone or computer</Text>
                    </Pressable>
                  ) : open ? (
                    <View>
                      <View style={styles.gallery}>
                        {chapterPhotos.map((photo) => (
                          <StoryPhotoTile key={photo.id} photo={photo} fallback={gradientPairs[photo.id % gradientPairs.length]} onRemove={() => void removePhoto(photo)} style={styles.gridTile} />
                        ))}
                        <Pressable accessibilityRole="button" accessibilityLabel={"Add photos to " + chapter} disabled={isUploading} onPress={() => void uploadPhotos(chapter)} style={[styles.gridTile, styles.addTile]}>
                          <Icon name="plus" color={colors.accent} size={26} />
                        </Pressable>
                      </View>
                      <Pressable onPress={() => setExpanded(null)}><Text style={styles.toggle}>Show less</Text></Pressable>
                    </View>
                  ) : (
                    <Mosaic
                      flip={chapterIndex % 2 === 1}
                      photos={chapterPhotos}
                      onRemove={(photo) => void removePhoto(photo)}
                      onAdd={() => void uploadPhotos(chapter)}
                      onOpenAll={() => setExpanded(chapter)}
                    />
                  )}
                </View>
              );
            })}
          </>
        ) : (
          <View style={[styles.emptyChapter, { marginTop: 20 }]}>
            <Text style={styles.emptyTitle}>Anza kwa kuunda event</Text>
            <Text style={styles.emptyHint}>Picha zitahifadhiwa kwenye Our Story ya event yako.</Text>
            <Pressable style={styles.createEvent} onPress={() => router.push("/create-event")}>
              <Text style={styles.createEventText}>Unda event</Text>
            </Pressable>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
      <WeddingNav active="more" eventId={event?.id} />
    </View>
  );
}

// Three-photo mosaic: one big photo + two small ones (mirrored on alternate chapters).
function Mosaic({ photos, flip, onRemove, onAdd, onOpenAll }: { photos: StoryPhoto[]; flip: boolean; onRemove: (photo: StoryPhoto) => void; onAdd: () => void; onOpenAll: () => void }) {
  const extra = Math.max(0, photos.length - 3);
  const slot = (index: number, style: ViewStyle, badge?: ReactNode) => {
    const photo = photos[index];
    if (photo) {
      return <StoryPhotoTile photo={photo} fallback={gradientPairs[index % gradientPairs.length]} onRemove={() => onRemove(photo)} style={style} onPress={badge ? onOpenAll : undefined}>{badge}</StoryPhotoTile>;
    }
    // First empty slot is an "add" tile, the others stay quiet placeholders.
    const firstEmpty = photos.length;
    return index === firstEmpty
      ? <Pressable accessibilityRole="button" accessibilityLabel="Add photos" onPress={onAdd} style={[style, styles.addTile]}><Icon name="plus" color={colors.accent} size={26} /></Pressable>
      : <View style={[style, styles.emptySlot]} />;
  };
  const badge = extra > 0 ? <View style={styles.more}><Text style={styles.moreText}>+{extra}</Text></View> : undefined;
  const big = slot(0, styles.bigTile);
  const column = (
    <View style={styles.column}>
      {slot(1, styles.smallTile)}
      {slot(2, styles.smallTile, badge)}
    </View>
  );
  return <View style={styles.mosaic}>{flip ? <>{column}{big}</> : <>{big}{column}</>}</View>;
}

function StoryPhotoTile({ photo, fallback, onRemove, onPress, style, children }: { photo: StoryPhoto; fallback: [string, string]; onRemove: () => void; onPress?: () => void; style?: ViewStyle; children?: ReactNode }) {
  const [source, setSource] = useState<ImageSourcePropType | null>(null);
  useFocusEffect(useCallback(() => {
    let live = true;
    let objectUrl: string | null = null;
    const fullUrl = api.defaults.baseURL + photo.image_url;
    if (Platform.OS === "web") {
      void api.get<Blob>(photo.image_url, { responseType: "blob" }).then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        if (live) setSource({ uri: objectUrl });
        else URL.revokeObjectURL(objectUrl);
      }).catch(() => { if (live) setSource(null); });
    } else {
      void getToken().then((token) => {
        if (live) setSource({ uri: fullUrl, headers: token ? { Authorization: "Bearer " + token } : {} });
      });
    }
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.id, photo.image_url]));

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={"Photo in chapter " + photo.chapter + ". Long press to delete."}
      onPress={onPress}
      onLongPress={onRemove}
      style={[styles.photoTile, style]}
    >
      {source ? <Image source={source} resizeMode="cover" style={styles.photoImage} /> : <GradientBlock colors={fallback} style={styles.photoImage} />}
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 22, paddingBottom: 15, maxWidth: 620, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headingCopy: { flex: 1 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.text, fontWeight: "700" },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 1 },
  add: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  addText: { fontSize: 24, color: colors.onAccent },
  disabled: { opacity: 0.55 },

  filtersScroll: { marginTop: 12, flexGrow: 0, overflow: "visible" },
  filters: { gap: 8 },
  filter: { height: 35, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 15, fontWeight: "700", color: colors.text },
  filterTextActive: { color: "#FFFFFF" },

  success: { color: colors.success, backgroundColor: colors.successSoft, borderRadius: 14, padding: 12, marginTop: 14, fontSize: 14, fontWeight: "700" },
  errorBox: { borderRadius: 15, padding: 13, backgroundColor: colors.dangerSoft, marginTop: 14 },
  error: { color: colors.onDangerSoft, fontSize: 14 },
  retry: { color: colors.accent, fontWeight: "800", marginTop: 8 },

  chapter: { marginTop: 16 },
  chapterHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8, height: 28 },
  chapterTitleRow: { flex: 1, flexDirection: "row", alignItems: "baseline" },
  chapterTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.text, fontWeight: "700", flexShrink: 0 },
  chapterRange: { fontSize: 14, color: colors.textMuted, flexShrink: 1 },
  chapterMeta: { fontSize: 14, color: colors.textMuted },

  mosaic: { flexDirection: "row", gap: 8, height: 150 },
  column: { flex: 1, gap: 8 },
  bigTile: { flex: 2, height: 150 },
  smallTile: { flex: 1 },
  photoTile: { borderRadius: 20, overflow: "hidden", backgroundColor: colors.surface },
  photoImage: { ...StyleSheet.absoluteFillObject },
  addTile: { borderRadius: 20, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  emptySlot: { borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  more: { position: "absolute", right: 8, bottom: 8, borderRadius: 13, backgroundColor: "rgba(20,14,34,0.7)", paddingHorizontal: 10, height: 26, alignItems: "center", justifyContent: "center" },
  moreText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },

  gallery: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridTile: { width: "48.5%", aspectRatio: 1.12 },
  toggle: { color: colors.accent, fontWeight: "800", fontSize: 14, marginTop: 12, textAlign: "center" },

  locked: { marginTop: 16, minHeight: 73, borderRadius: 24, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.border, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 14 },
  lockedTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  lockedSub: { color: colors.textMuted, fontSize: 14.5, marginTop: 2 },

  emptyChapter: { minHeight: 150, borderRadius: 20, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 20 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyHint: { color: colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 6 },
  createEvent: { backgroundColor: colors.accent, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 11, marginTop: 16 },
  createEventText: { color: colors.onAccent, fontWeight: "800" },
});
