# EverAfter — Frontend Documentation (`Wedding_mobile`)

> Mobile/web client for the Wedding-app. It lets an **organizer** create a wedding event, manage guests, send invitations (QR + share link), collect and verify contributions (payments), and check guests in at the venue. A **guest** can open a public invitation link and respond with an RSVP.

---

## 1. Tech stack

| Area | Technology |
|---|---|
| Framework | Expo SDK 57 + React Native 0.86 + React 19 |
| Language | TypeScript (`strict: true`) |
| Routing | **Expo Router** (file-based, `main` = `expo-router/entry`) |
| HTTP | Axios (single shared instance with interceptors) |
| Local storage | `@react-native-async-storage/async-storage` (JWT token) |
| Camera / QR scan | `expo-camera` (`CameraView`) |
| QR render | `react-native-qrcode-svg` + `react-native-svg` |
| Image picker | `expo-image-picker` (payment proof) |
| 3D background | `expo-gl` (`GLView` + raw GLSL ray-marching shader) |
| Web support | `react-native-web` (`expo start --web`) |
| Theme | Dark "Matte Black" with amber accent (`userInterfaceStyle: dark`) |

Installed but **not used yet** in the code: `react-hook-form`, `zod`, `zustand`, `@react-navigation/*` (only used by legacy `App.tsx`).

### Scripts
```bash
npm start        # expo start
npm run android  # expo start --android
npm run ios      # expo start --ios
npm run web      # expo start --web
```
Typecheck: `npx tsc --noEmit` · Lint: `npx expo lint` · Fix dependency versions: `npx expo install --fix`

---

## 2. Folder structure

```
Wedding_mobile/
├── app/                         # Expo Router routes (every file = a screen)
│   ├── _layout.tsx              # Root Stack, session-expired listener
│   ├── index.tsx                # Entry: restores session → dashboard or Welcome
│   ├── login.tsx                # re-exports src/screens/auth/LoginScreen
│   ├── register.tsx             # re-exports src/screens/auth/Register
│   ├── dashboard.tsx            # Organizer home: user, events, per-event stats
│   ├── create-event.tsx         # Create event form
│   ├── event/
│   │   ├── [id]/
│   │   │   ├── index.tsx        # Event details hub (largest screen)
│   │   │   ├── add-guest.tsx
│   │   │   └── add-contribution.tsx
│   │   ├── edit-event.tsx
│   │   ├── edit-guest.tsx
│   │   ├── guest/[guestId].tsx  # Guest details
│   │   ├── invitation.tsx       # Create + share invitation (organizer side)
│   │   ├── rsvp.tsx             # Organizer sets a guest's RSVP
│   │   ├── check-in-search.tsx  # Find guest by code / scanned QR, then check in
│   │   ├── check-in.tsx         # Direct confirm-check-in screen
│   │   ├── scan.tsx             # QR scanner
│   │   ├── payment-dashboard.tsx
│   │   ├── pending-contributions.tsx   # Payments list with search + filters
│   │   └── contribution/
│   │       ├── [contributionId].tsx    # Verify: mark paid / reject
│   │       └── payment.tsx             # Submit payment method + reference + proof
│   └── invitation/[code].tsx    # PUBLIC invitation + guest RSVP page
├── components/                  # Shared UI states
│   ├── EmptyState.tsx
│   ├── ErrorState.tsx
│   ├── EventCard.tsx
│   └── LoadingState.tsx
├── src/
│   ├── components/
│   │   ├── AuthLayout.tsx            # Shared shell for login/register
│   │   ├── InvitationCode.tsx        # QR / text code toggle
│   │   ├── PaymentSummary.tsx        # Paid / pending / rejected metrics
│   │   └── ThreeDWeddingBackdrop.tsx # Animated 3D rings shader
│   ├── constants/theme.ts       # colors, radius
│   ├── navigation/AuthNavigator.tsx   # LEGACY (React Navigation)
│   ├── screens/auth/            # WelcomeScreen, LoginScreen, Register
│   └── services/
│       ├── api.ts               # Axios instance + interceptors
│       └── auth.ts              # token storage + session-expired events
├── App.tsx                      # LEGACY (React Navigation entry, unused)
├── index.ts                     # imports expo-router/entry
├── app.json · package.json · tsconfig.json · AGENTS.md
└── (empty placeholders) src/context, src/hooks, src/types, src/utils,
    src/screens/{checkin,contributions,dashboard,events,guests,invitations,rsvp}
```

---

## 3. Navigation map

```
/ (index)  ── no token ─────────► WelcomeScreen ─► /register ─► /login
           ── token valid ──────► /dashboard
           ── 401 ──────────────► /login?session=expired

/dashboard ─► /create-event
           ─► /event/{id}                     (via EventCard)

/event/{id}  (Event Details hub)
   ├─► /event/edit-event?id=
   ├─► /event/{id}/add-guest
   ├─► /event/{id}/add-contribution?guestId=
   ├─► /event/guest/{guestId}?eventId=
   │       ├─► /event/edit-guest?guestId=&eventId=
   │       ├─► /event/rsvp?id=&guestId=
   │       ├─► /event/check-in?id=&guestId=&guestCode=&guestName=
   │       ├─► /event/invitation?id=&guestId=&guestName=&guestCode=
   │       ├─► /event/contribution/{contributionId}?eventId=
   │       └─► /event/{id}/add-contribution?guestId=
   ├─► /event/check-in-search?id= ◄──► /event/scan?id=
   ├─► /event/payment-dashboard?id=
   │       └─► /event/pending-contributions?id=
   │               └─► /event/contribution/{contributionId}?eventId=
   │                       └─► /event/contribution/payment?contributionId=&eventId=
   └─► /event/pending-contributions?id=

/invitation/{code}   PUBLIC – opened from the shared link, no login
```

Notes:
- Static routes (`/event/rsvp`, `/event/check-in`, …) take precedence over dynamic `[id]` / `[guestId]`.
- Most screens read params with `useLocalSearchParams` and normalise them with a `firstParam()` helper, then validate IDs with a positive-integer regex before calling the API.

---

## 4. Authentication & session flow

Files: `src/services/auth.ts`, `src/services/api.ts`, `app/index.tsx`, `app/_layout.tsx`, `LoginScreen.tsx`.

1. **Login** (`POST /users/login` `{email, password}`) → returns `access_token`.
2. Token is saved in AsyncStorage under key `access_token`, then verified by `GET /users/me`, then `router.replace("/dashboard")`.
3. **Every request** gets `Authorization: Bearer <token>` from the Axios request interceptor.
4. **App start** (`app/index.tsx`): no token → Welcome; token → `GET /users/me`. On `401` the token is removed and the user is sent to `/login?session=expired`; other errors show `ErrorState` with retry.
5. **Session expiry**: the response interceptor catches any `401` (except the login request), removes the token once (`sessionExpiryHandled` guard) and calls `notifySessionExpired()`. `app/_layout.tsx` subscribes with `onSessionExpired` and redirects to `/login?session=expired`.
6. **Sign out**: `signOut()` removes the token (dashboard button) then `router.replace("/login")`.
7. **Register**: `POST /users` `{full_name, email, password}` → then `/login`. Client rules: name ≥ 3 chars, valid email, password ≥ 8, confirmation match, terms accepted. (Login only requires ≥ 6 chars.)

### API base URL (`api.ts`)
Port `8000` is fixed. Host is chosen automatically:
- Web → `http://localhost:8000`
- Phone (Expo Go) → the same host Expo serves from (`Constants.expoConfig.hostUri`), so the Wi-Fi IP never goes stale
- Android emulator fallback → `http://10.0.2.2:8000`

⚠ There is no env-based configuration; production would need a configurable base URL and HTTPS.

---

## 5. Screens

### Auth
| Screen | Purpose |
|---|---|
| `WelcomeScreen` | Branded landing with 3D backdrop; "Start planning" → `/register`, "Sign in" → `/login` |
| `LoginScreen` | Email/password, show/hide password, expired-session banner; "Forgot password" is a placeholder message only |
| `Register` | Full name, email, password + confirm, terms checkbox |
| `AuthLayout` | Shared layout: back button, brand, title/subtitle, card, keyboard avoiding, responsive padding |

### Organizer
| Route | What it does |
|---|---|
| `dashboard` | Loads `/users/me`, `/events`, and per-event `/events/{id}/dashboard` stats (guests, RSVP, check-in %, contributions). Lists events with `EventCard`. Create event + sign out. Refetches on focus. |
| `create-event` | Fields: name, couple names (`A & B`), date `YYYY-MM-DD` (not in past), time `HH:MM`, venue, description (≤ 5000), target contribution (≤ 2 decimals). Posts with `status: "draft"`. |
| `event/[id]/index` | **Main hub.** Event info; edit / delete; **status actions** (Complete, Cancel for active events); guest, RSVP, check-in and payment summaries; guest search, filters (All, RSVP Accepted/Pending, Paid, Payment Pending, Checked In, Not Checked In) and sort (Name A-Z, Not Checked In First); per-guest shortcuts (details, add contribution, RSVP, check-in, invitation); links to payment dashboard and pending payments. Loads event, guests, contributions and RSVPs in separate requests. |
| `event/edit-event` | Edit name, description, target, groom/bride, date, time, venue name/address, status (`draft/published/completed/cancelled`) |
| `event/[id]/add-guest` | Name, phone, email (optional, validated, lower-cased) |
| `event/edit-guest` | Loads guest list then finds the guest; `PUT /guests/{id}` |
| `event/guest/[guestId]` | Guest profile, RSVP, check-in, contributions and totals; edit / delete guest; shortcuts to invitation, RSVP, check-in, contribution detail |
| `event/invitation` | `POST /invitations {guest_id}` → shows `InvitationCode` (QR/code) and **Share** via `Share.share` with link `{baseURL}/invite/{short_code}` |
| `event/rsvp` | Organizer chooses Attending / Not attending / Maybe. Creates the invitation (to obtain `short_code`), checks if an RSVP exists (404 = create), then `POST /rsvp/{short_code}` |
| `event/scan` | Camera permission flow; scans QR once (`handled` ref) → `check-in-search?code=` |
| `event/check-in-search` | Search by guest/invitation code (or arrive from scanner), shows guest card and **Check In** button; handles 404 and 409 (already checked in) |
| `event/check-in` | Simple confirm screen using `POST /events/{id}/check-in/{guestCode}` |

### Contributions / payments
| Route | What it does |
|---|---|
| `event/[id]/add-contribution` | Amount (> 0, 2 dp), method, optional reference, **mode**: *Pending* → `POST /contributions`, *Paid* → `POST /contributions/manual`; optional proof image. If proof upload fails after the contribution was saved, it keeps `savedContributionId` so a retry never creates a duplicate. Returns to guest page when opened with `from=guest`. |
| `event/payment-dashboard` | Totals collected/pending/rejected, target progress bar, contributors count, shortcut to review pending |
| `event/pending-contributions` | List with search (name, phone, reference; Tanzanian phone normalisation `0…`/`255…`/`+255…`), filter chips with counts (Pending/Paid/Rejected/All), sum of filtered |
| `event/contribution/[contributionId]` | Details + private payment-proof image (fetched with the `Authorization` header). **Mark as Paid** (`POST /contributions/{id}/confirm`, optional reference) with confirm dialog, **Reject** (`POST /contributions/{id}/reject {rejection_reason}`) with modal. Link to Submit/Update Payment. |
| `event/contribution/payment` | Choose method (M-Pesa, Tigo Pesa, Airtel Money, Bank, Cash), reference (≤ 255), optional proof (JPG/PNG/WebP ≤ 5 MB). `PUT /contributions/{id}` then `POST /contributions/{id}/payment-proof` (multipart, 30 s timeout). Locked once paid. |

### Public (guest side)
| Route | What it does |
|---|---|
| `invitation/[code]` | No login. `GET /invite/{code}` shows the invitation (names, date, venue, QR/code); loads existing RSVP with `GET /rsvp/{code}`; guest answers Accept / Decline / Maybe with `POST /rsvp/{code}` |

---

## 6. Shared components

| Component | Notes |
|---|---|
| `LoadingState` | Spinner + message |
| `ErrorState` | Message + optional "Try Again" |
| `EmptyState` | Title, message, optional action button |
| `EventCard` | Name, couple, status label, date/time, countdown (active/published only), venue, target; navigates to `/event/{id}` |
| `PaymentSummary` | Total, Paid, Pending, Rejected, Target progress, Remaining. Accepts `payment_status` or `status`. |
| `InvitationCode` | Tabs QR / Code; QR is white background, black modules (size 180) |
| `ThreeDWeddingBackdrop` | Full-screen `GLView`, fragment shader ray-marches two rings and a diamond; ~30 fps (33 ms throttle); fails gracefully with `console.warn` |
| `AuthLayout` | See §5 |

---

## 7. Design system (`src/constants/theme.ts`)

```ts
colors = {
  background: "#0D0D0D", surface: "#141414", card: "#1A1A1A", border: "#2A2A2A",
  text: "#F5F5F5", textMuted: "#9A9A9A",
  accent: "#F29A0D", accentSoft: "#2B2112", onAccent: "#111111",
  success: "#5EC79A", info: "#6BB0E0", danger: "#E07A6E",
}
radius = { sm: 8, md: 12, lg: 16 }
```
Conventions: styles via `StyleSheet.create` at the bottom of each file; cards are `maxWidth: 560` centered; uppercase "eyebrow" labels with letter-spacing; accessibility props (`accessibilityRole`, `accessibilityState`, `accessibilityLiveRegion`) used widely. Several screens still use hard-coded hex colors (`#3B3531`, `#827C76`, `#153126`, `#351F1D`) that are not in the theme.

---

## 8. API endpoints used by the frontend

| Method | Endpoint | Used in |
|---|---|---|
| POST | `/users` | Register |
| POST | `/users/login` | Login |
| GET | `/users/me` | Index, Login, Dashboard |
| GET / POST | `/events` | Dashboard / Create event |
| GET / PUT / DELETE | `/events/{id}` | Details, Edit, Payment dashboard / status change / delete |
| GET | `/events/{id}/dashboard` | Dashboard stats |
| GET / POST | `/events/{id}/guest` | Guest list / Add guest |
| PUT / DELETE | `/guests/{guestId}` | Edit / delete guest |
| GET | `/guests/{guestId}/contributions` | Guest details |
| GET | `/events/{id}/rsvps` | Event details, Guest details |
| GET / POST | `/events/{id}/check-in/{code}` | Search guest / Check in |
| POST | `/invitations` `{guest_id}` | Invitation, RSVP |
| GET | `/invite/{shortCode}` | Public invitation |
| GET / POST | `/rsvp/{shortCode}` | Read / create-or-update RSVP |
| GET | `/events/{id}/contributions` | Lists, details, payment dashboard |
| POST | `/contributions` · `/contributions/manual` | Add contribution (pending / already paid) |
| PUT | `/contributions/{id}` | Submit payment details |
| POST | `/contributions/{id}/confirm` · `/reject` | Verify payment |
| POST / GET | `/contributions/{id}/payment-proof` | Upload / view proof (GET needs auth header) |

### Domain values
- **Event status**: `draft`, `active`, `published`, `completed`, `cancelled`
- **RSVP**: `attending`, `not_attending`, `maybe`
- **Payment status** (normalised on the client): `paid`/`confirmed` → paid · `rejected`/`failed` → rejected · everything else → pending
- **Check-in**: `checked_in` vs not
- **Payment methods**: `mpesa`, `tigopesa`, `airtel_money`, `bank`, `cash`
- Currency is **TSh**, formatted with `toLocaleString("en-TZ")`.

---

## 9. Common patterns

- **Error handling**: `axios.isAxiosError` → no `response` = "Cannot reach the server…"; reads `detail` (string or `[{msg}]`) or `message`; special messages for 404 / 409.
- **Loading data**: `useFocusEffect` + `isActive` flag for cancellation, `retryCount` state to retry.
- **Confirmations**: `Alert.alert` on native, `window.confirm`/`window.alert` on web.
- **Double-submit protection**: `if (isSubmitting) return;` and `disabled` buttons.
- **Backend gaps worked around on the client**: no "get one contribution" or "get one guest" endpoint, so details screens fetch the list and `find` the item.

---

## 10. Known issues & cleanup suggestions

1. **Two navigation systems.** `App.tsx` + `src/navigation/AuthNavigator.tsx` (React Navigation) are leftovers; the app actually boots from `expo-router/entry`. Remove them and `@react-navigation/*` if unused.
2. **Empty folders** (`src/context`, `hooks`, `types`, `utils`, and most of `src/screens/*`) — either use them or delete them.
3. **Duplicated helpers** across many files: `firstParam`, `isPositiveId`, `formatTsh`, `getApiErrorMessage`/error parsing, payment-status normalisation, type definitions (`EventContribution`, `GuestResponse`, …). Move them to `src/utils` and `src/types`.
4. **Components split in two places** (`/components` and `/src/components`). Pick one.
5. **`AGENTS.md` says routes live in `src/app/`**, but they are in `/app`. Update the doc.
6. **Unused dependencies**: `react-hook-form`, `zod`, `zustand` — forms are hand-written with `useState`. Consider using zod + react-hook-form to reduce the long validation chains.
7. **`app.json`** still has the default name/slug `react-native-app`; referenced asset files (`./assets/...`) were not found in the folder listing — check they exist before building.
8. **No env config**: API URL is derived from Expo host; add `EXPO_PUBLIC_API_URL` for staging/production.
9. **Token in AsyncStorage** (unencrypted). Consider `expo-secure-store` on native.
10. **Console logging of API responses** (`console.log("Guest created:", …)`) should be removed or guarded in production.
11. **Mixed UI**: the event details screen uses plain RN `Button`s for filters, while other screens use styled `Pressable`s.
12. **"Forgot password"** and Terms / Privacy links are placeholders.
13. **Inconsistent `status` values**: `create-event.tsx` types omit `active`, while dashboard and details include it.
14. **Large file**: `app/event/[id]/index.tsx` is ~1,300 lines; split into sections (header, summaries, guest list, filters).
15. **RSVP by organizer** creates a new invitation (`POST /invitations`) every time just to get a `short_code`; ideally the backend should expose an RSVP endpoint by `guest_id`.

---

## 11. Quick start

```bash
cd Wedding_mobile
npm install
npx expo start          # press w for web, or scan the QR with Expo Go
```
Run the FastAPI backend on port **8000** on the same PC (e.g. `uvicorn app.main:app --host 0.0.0.0 --port 8000`) so a phone on the same Wi-Fi can reach it. Camera features (QR scan) need a real device or a development build.
