# Renewly mobile app

Expo (React Native, TypeScript) app for Renewly. For the project overview, status and full setup
(including the backend), see the [root README](../README.md).

## Run it on your phone

1. Install **Expo Go** on the phone (Play Store or App Store). Put the phone on the same Wi-Fi as the PC.
2. Start the API so the phone can reach it:
   `dotnet run --project Renewly.Api --launch-profile http --urls http://0.0.0.0:5080` (from `backend/`).
3. From this folder run `npm install` (first time only), then `npm start`.
4. Scan the QR code in the terminal: with Expo Go on Android, or with the Camera app on iPhone.

Ports 8081 and 5080 must be allowed through Windows Firewall. The root README's
[step 3](../README.md#3-start-the-mobile-app) has the commands, and its
[troubleshooting](../README.md#troubleshooting) table covers connection problems.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server and show the QR code for Expo Go |
| `npm run android` | Same, and open the app on a connected Android device or emulator |
| `npm test` | Run the Jest tests (50) |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run lint` | ESLint |

In development the app calls the API on port 5080 of the PC it was loaded from, so you don't need to
set an address. The production URL is in [`src/config/env.ts`](src/config/env.ts).

App name, package (`com.bynqora.renewly`), `renewly://` scheme, version and icon are set in
[`app.json`](app.json). The app is on Expo SDK 57. When upgrading, run `npx expo install --fix` so native
libraries stay on versions Expo Go supports.

## Structure

```
src/
├── api/          client.ts (Axios + token refresh), endpoints.ts, types.ts (mirror the API DTOs),
│                 errors.ts (ApiError + codes), queryKeys.ts
├── app/          App.tsx (providers, splash), navigation/ (stack, tabs, deep links, types), providers/
├── components/   Design system; import icons only from components/icons.ts
├── features/     One folder per area: auth, dashboard, subscriptions, calendar, insights,
│                 notifications, account, premium (screens, hooks, schemas, tests)
├── services/     secureSession (expo-secure-store: Keystore/Keychain), sessionEvents, billing/ (Google Play seam)
├── store/        authStore (session state machine), preferencesStore (onboarding, last email)
├── theme/        Colours, spacing, radii, typography, shadows
├── utils/        format (money, dates, countdowns), forms (server errors → fields), device
└── test/         renderWithProviders for screen tests
```

## Conventions

- **Data** comes from TanStack Query hooks. After any change to a subscription, invalidate
  `subscriptionDependentKeys` so the dashboard, calendar and insights refresh too.
- **Forms** use React Hook Form with a Zod schema that mirrors the server's rules. Use `FormTextField`,
  and `applyApiErrors()` to put server validation errors under the right fields.
- **Errors** are always `ApiError`. Show them with `ErrorState` (screens), `FormMessage` (forms) or
  `toast.error` (actions).
- **Sessions:**
  - The refresh token lives in secure storage (Keystore); the access token is kept in memory only.
  - The Axios client refreshes the access token once on a 401 and retries the request.
  - Sign-out clears the query cache.
- **Native libraries:** add them with `npx expo install <package>`, not `npm install`, so the version
  matches the Expo SDK. Expo Go only includes Expo's supported libraries; anything else needs a
  development build.
- **Icons** are imported from `src/components/icons.ts` (one file per icon). Importing from the
  `lucide-react-native` barrel would add every icon to the bundle.
- **Free/Pro** limits come from `GET /me/plan` (`useMyPlan()`). Pro-only options stay visible, marked with
  a crown, and lead to the Premium screen.
- **Accessibility:** every icon-only button needs an `accessibilityLabel`. Touch targets are at least 48 dp.
  Text uses `AppText` so font scaling stays consistent.

## Tests

Tests run with the `jest-expo` preset. Screen tests render one screen inside navigation with a fresh
query client ([`src/test/renderWithProviders.tsx`](src/test/renderWithProviders.tsx)) and mock
`src/api/endpoints`. Native modules (secure store, AsyncStorage, NetInfo, date picker, icons) are mocked
in [`jest.setup.js`](jest.setup.js).
