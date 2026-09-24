# Renewly mobile app

React Native (TypeScript) Android app for Renewly. For the project overview, status and full setup
(including the backend), see the [root README](../README.md).

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start Metro (the JavaScript bundler) |
| `npm run android` | Build and install on the running emulator or a connected phone |
| `npm test` | Run the Jest tests (50) |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run lint` | ESLint |

The app expects the API at `http://10.0.2.2:5080/api/v1` in development (the emulator's address for your PC).
To use a phone or change the production URL, see [`src/config/env.ts`](src/config/env.ts) and the
"How the app reaches the API" table in the root README.

## Structure

```
src/
├── api/          client.ts (Axios + token refresh), endpoints.ts, types.ts (mirror the API DTOs),
│                 errors.ts (ApiError + codes), queryKeys.ts
├── app/          App.tsx (providers, splash), navigation/ (stack, tabs, deep links, types), providers/
├── components/   Design system; import icons only from components/icons.ts
├── features/     One folder per area: auth, dashboard, subscriptions, calendar, insights,
│                 notifications, account, premium (screens, hooks, schemas, tests)
├── services/     secureSession (Keychain/Keystore), sessionEvents, billing/ (Google Play seam)
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
  - The refresh token lives in the Keystore; the access token is kept in memory only.
  - The Axios client refreshes the access token once on a 401 and retries the request.
  - Sign-out clears the query cache.
- **Icons** are imported from `src/components/icons.ts` (one file per icon). Importing from the
  `lucide-react-native` barrel would add every icon to the bundle.
- **Free/Pro** limits come from `GET /me/plan` (`useMyPlan()`). Pro-only options stay visible, marked with
  a crown, and lead to the Premium screen.
- **Accessibility:** every icon-only button needs an `accessibilityLabel`. Touch targets are at least 48 dp.
  Text uses `AppText` so font scaling stays consistent.

## Tests

Screen tests render one screen inside navigation with a fresh query client
([`src/test/renderWithProviders.tsx`](src/test/renderWithProviders.tsx)) and mock `src/api/endpoints`.
Native modules (Keychain, AsyncStorage, NetInfo, date picker, icons) are mocked in [`jest.setup.js`](jest.setup.js).
