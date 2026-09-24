# Renewly

> **Know before you're charged. Cancel before you renew.**

Renewly is an Android app from **BYNQORA Technologies** that helps people avoid unwanted automatic
subscription renewals. Users record their subscriptions (Netflix, Spotify, ChatGPT, Claude, YouTube
Premium, Amazon Prime, Microsoft 365, Adobe, or any custom service). Renewly then reminds them before
each renewal and points them to the provider's official cancellation page.

What Renewly does **not** do:

- It never asks for or stores card numbers, CVVs, PINs or banking credentials. Only a masked label
  such as "Visa ****4521" is allowed; anything with more than 4 digits is rejected by both the app and the API.
- It never claims to cancel third-party subscriptions. Users cancel with the provider, and Renewly
  only records that they did ("Mark as cancelled").

**Contents:** [Status](#project-status) · [What's built](#whats-built) · [What's remaining](#whats-remaining) ·
[How to run](#how-to-run-the-app) · [Try it out](#try-it-out) · [Tests](#running-the-tests) ·
[Troubleshooting](#troubleshooting)

---

## Project status

| Stage | Scope | Status |
|---|---|---|
| 1 | Backend foundation: solution, 14-table schema, response envelope, error handling, catalog seed scripts | ✅ Done |
| 2 | Authentication: register, login, JWT with refresh-token rotation, email verification, password reset, lockout, rate limiting | ✅ Done |
| 3 | Core API: subscriptions, reminder scheduling, dashboard, calendar, insights, notifications, profile, settings, account deletion, devices | ✅ Done |
| 4 | Reminder delivery: background worker, FCM push, email, retries, renewal rollover | ✅ Done |
| 5 | Mobile foundation: React Native project, design system, navigation, API client, secure session, offline support | ✅ Done |
| 6 | Mobile screens: all 22 screens (auth, dashboard, subscriptions, cancellation, calendar, insights, notifications, profile, premium) | ✅ Done |
| 7 | Push notifications on the phone: FCM registration, Android notification channel, open the right screen from a notification | ⏳ Next |
| 8 | Release: Google Play Billing, app icon and splash, signing, ProGuard, production API, Data safety form, CI | Planned |

**Quality checks at the end of Stage 6:**

| Check | Result |
|---|---|
| Backend unit tests | 82 passing |
| Mobile tests | 50 passing, with no console warnings |
| Type-check and lint (mobile) | Clean |
| Warnings (backend) | None; warnings are treated as errors |
| Production Android bundle | Builds (2.5 MB) |
| API contract | Every response shape the app uses was compared against the running backend: 18 of 18 match |

The mobile app is an Expo project, so it runs on a real phone through the **Expo Go** app. You don't need
Android Studio. See [How to run](#how-to-run-the-app).

---

## What's built

### Mobile app (`frontend-mobile/`)

| Area | What the user gets |
|---|---|
| **Onboarding & sign-in** | Welcome screen (first launch only), sign in, create account, forgot password and reset with a 6-digit email code, email verification (auto-submits, resend after 60 s). The session is saved securely on the phone and survives restarts. |
| **Home dashboard** | The **next renewal first**: service, price, colour-coded countdown ("Renews in 3 days") and a "How to cancel before it renews" button. Also monthly and yearly totals, amount due in the next 7 days, upcoming renewals, free-plan usage ("3 of 5") and recent notifications. |
| **Subscriptions** | List with search, Active/Cancelled/All filter and sort. Add from a catalog of popular services or as a custom one. The form covers plan, amount and currency, billing cycle, renewal date picker, reminders (7/3/1 days before, push and email), a masked payment label and notes. The details screen shows the reminder schedule, with edit, delete and reactivate. |
| **Cancellation assistance** | Says plainly that Renewly doesn't control the subscription, shows the deadline ("Cancel before Sep 26 to avoid being charged $15.99"), numbered official steps, an "Open official cancellation page" button, a Google Play subscriptions link, and "Mark as cancelled" after confirmation. |
| **Calendar** | Month grid with coloured renewal dots, a month total, and the list for a chosen day. |
| **Insights** | Monthly, yearly and next-30-days totals, plus spending by category. Pro adds a 12-month forecast, most expensive subscriptions and billing-cycle mix. |
| **Notifications** | Reminder history with All/Unread/Failed filters, read state, "Mark all read", and tap-to-open the subscription. |
| **Profile** | Personal information, preferences (currency, time zone, language), notification settings (channels, default reminders, reminder time), change password, delete account, help, privacy policy, terms, about, and sign out. |
| **Premium** | Free vs Pro comparison and plan cards. Purchasing is disabled ("Coming soon") until Google Play Billing is added. |
| **Everywhere** | Loading skeletons, empty states, error states with retry, an offline banner, saved data shown when offline, pull-to-refresh, and screen-reader labels. |

### Backend (`backend/`)

- **Authentication:**
  - JWT access tokens that last 15 minutes.
  - 30-day refresh tokens that rotate on every use. Reusing an old one signs out every device in that login.
  - Email verification, password reset, and a 15-minute lockout after 5 wrong passwords.
  - Sign-in endpoints are rate-limited per IP.
- **Subscriptions API:**
  - Add, edit and delete subscriptions, mark as cancelled, and reactivate.
  - The Free plan is limited to 5 active subscriptions.
  - Cancellation guides, a dashboard, a calendar and insights.
  - Notification history, profile and settings, device registration, and account deletion (which Google Play requires).
- **Reminder engine:**
  - Reminders fire at the user's local reminder time in their time zone.
  - A background worker sends Firebase push and SMTP email, and records each attempt as pending, sent or failed.
  - It retries with back-off, removes device tokens Firebase rejects, recovers reminders left stuck when a worker crashes, and moves renewal dates forward after each renewal.
- **Data:**
  - SQL Server with EF Core migrations.
  - Seed data (the Free/Pro plans and 13 services with their official cancellation pages) lives in hand-run SQL scripts under [`backend/Database/ScriptTracker`](backend/Database/ScriptTracker/README.md). The app never inserts it itself.

---

## What's remaining

### Stage 7: push notifications on the phone
- [ ] Create a Firebase project and add an Android app with package `com.bynqora.renewly`.
- [ ] Put `google-services.json` in `frontend-mobile/` (git-ignored) and point `expo.android.googleServicesFile` in `app.json` at it.
- [ ] Add `@react-native-firebase/app` and `@react-native-firebase/messaging` to the app.
- [ ] Switch from Expo Go to a development build (`npx expo run:android`, or EAS Build), because Expo Go can't receive Firebase push.
- [ ] Ask for notification permission (Android 13+) and create the `renewal_reminders` channel.
- [ ] Register the device with `POST /api/v1/devices` after sign-in, and remove it on sign-out.
- [ ] Open the right screen when a notification is tapped (`renewly://subscriptions/{id}`).
- [ ] Give the backend the Firebase service-account key (`Firebase:CredentialsPath` in user-secrets).

### Stage 8: Google Play release
- [ ] Google Play Billing in the app (the `BillingProvider` interface is ready).
- [ ] A backend endpoint that verifies Google Play purchases and activates Pro (`UserPlans`).
- [ ] App icon, adaptive icon and splash artwork.
- [ ] Release signing key, ProGuard/R8, and a versioning plan.
- [ ] Production API URL in `frontend-mobile/src/config/env.ts`, plus hosting for the API and SQL Server.
- [ ] Privacy policy and terms pages at real URLs, the Play Store Data safety form, and store listing assets.
- [ ] CI pipeline (build and test both projects on every push).

### Open items
- [ ] **Receipt storage (Pro):** needs a file-storage backend and endpoints.
- [ ] **Translations:** the language setting is stored, but the app is currently English only.
- [ ] **Late reminders:** decide whether to send a "catch-up" reminder when a subscription is added after its reminder time has already passed. Today that reminder is skipped.
- [ ] **Currency conversion:** totals are shown per currency; converting between currencies would need exchange rates.

---

## How to run the app

### 1. Prerequisites

| Tool | Version | Used for |
|---|---|---|
| [.NET SDK](https://dotnet.microsoft.com/download/dotnet/9.0) | 9.0 | Backend API |
| SQL Server | 2019 or later (Developer/Express is fine) | Database |
| `sqlcmd` | any recent | Running the seed scripts |
| [Node.js](https://nodejs.org/) | 22.11 or later | Mobile app's bundler |
| **Expo Go** on your phone | latest, from the Play Store or App Store | Running the app |

The phone and the PC must be on the **same Wi-Fi network**.

### 2. Start the backend

```powershell
cd backend
dotnet tool restore

# One-time: secrets are stored in your Windows profile, never in the repository
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=RenewlyDb;User Id=<sql-user>;Password=<sql-password>;TrustServerCertificate=True" --project Renewly.Api
dotnet user-secrets set "Jwt:SigningKey" "<any random string of 32+ characters>" --project Renewly.Api

# Create or upgrade the database schema
dotnet ef database update --project Renewly.Infrastructure --startup-project Renewly.Api

# One-time: load the plans and the service catalog
sqlcmd -S localhost -U <sql-user> -P <sql-password> -C -I -d RenewlyDb -i Database\ScriptTracker\001_Seed_SubscriptionPlans.sql
sqlcmd -S localhost -U <sql-user> -P <sql-password> -C -I -d RenewlyDb -i Database\ScriptTracker\002_Seed_SubscriptionServices.sql

# Run the API (the reminder worker starts with it).
# --urls http://0.0.0.0:5080 lets the phone reach it over Wi-Fi, not just this PC.
dotnet run --project Renewly.Api --launch-profile http --urls http://0.0.0.0:5080
```

Check it's up:
- http://localhost:5080/health/ready returns `Healthy`.
- The API reference is at http://localhost:5080/scalar/v1.

> In Development, **emails and push notifications are printed in the API console** instead of being sent.
> This is where you'll find the 6-digit verification code when you sign up.

### 3. Start the mobile app

**One-time:** allow ports **8081** (the app's bundler) and **5080** (the API) through Windows Firewall
for private networks. In an administrator PowerShell:

```powershell
New-NetFirewallRule -DisplayName "Renewly Expo (8081)" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private
New-NetFirewallRule -DisplayName "Renewly API (5080)" -Direction Inbound -Protocol TCP -LocalPort 5080 -Action Allow -Profile Private
```

Then, in a second terminal:

```powershell
cd frontend-mobile
npm install   # first time, and after pulling dependency changes
npm start
```

A QR code appears in the terminal. Open it on the phone:
- **Android:** open Expo Go and tap **Scan QR code**.
- **iPhone:** scan it with the Camera app.

The app loads over Wi-Fi. When you save a change on the PC, the app on the phone reloads by itself.
Press `r` in the `npm start` terminal to reload by hand.

**How the app finds the API:** you don't need to set an address. In development the app calls port
5080 on the same PC it loaded from (see [`src/config/env.ts`](frontend-mobile/src/config/env.ts)). The API
just has to be started with `--urls http://0.0.0.0:5080`, as in step 2.

---

## Try it out

1. Open the app and tap **Create free account**. Use any email; nothing is really sent in Development.
2. Copy the **6-digit code** from the API console (`[DEV EMAIL] ... is your Renewly verification code`) into the app.
3. Tap **+** and pick **Netflix**, or add a custom subscription. Enter the amount and pick a renewal date a few days ahead.
4. The **Home** screen now leads with that renewal and its countdown. Tap **How to cancel before it renews** to see the cancellation assistance.
5. Try **Calendar** and **Insights**, and change your reminder time under **Profile → Notifications**.
6. To see a reminder being delivered without waiting, set a reminder's due time to now in the database:
   ```sql
   UPDATE SubscriptionReminders SET ScheduledForUtc = SYSUTCDATETIME() WHERE Status = 1;
   ```
   Within a minute the API console prints `[DEV PUSH] Netflix renews in ...`, and it appears under **Notifications** in the app.

---

## Running the tests

```powershell
# Backend: 82 tests
cd backend
dotnet test

# Mobile: 50 tests, plus type-check and lint
cd frontend-mobile
npm test
npm run typecheck
npm run lint
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile | Expo SDK 57 (React Native 0.86), TypeScript, React Navigation 7, TanStack Query 5 (with offline cache), Zustand, React Hook Form + Zod, Axios, expo-secure-store, Lucide icons |
| API | ASP.NET Core 9, Clean Architecture, FluentValidation, Serilog, OpenAPI with the Scalar reference UI |
| Data | SQL Server, Entity Framework Core 9 migrations, ScriptTracker SQL scripts for reference data |
| Auth | JWT access tokens (15 min), rotating refresh tokens (30 days) with reuse detection, 6-digit email codes |
| Notifications | Firebase Cloud Messaging (push) and SMTP via MailKit (email), delivered by a background worker |

## Repository layout

```
ReNewly/
├── backend/                     ASP.NET Core 9 Web API
│   ├── Renewly.Domain/            Entities, enums, pure business rules
│   ├── Renewly.Application/       Use cases, DTOs, validators, interfaces
│   ├── Renewly.Infrastructure/    EF Core, repositories, JWT, email, FCM, background worker
│   ├── Renewly.Api/               Controllers, middleware, auth, configuration
│   ├── Renewly.UnitTests/         xUnit tests
│   └── Database/ScriptTracker/    Hand-applied SQL scripts for reference data
└── frontend-mobile/             Expo / React Native (TypeScript) app
    ├── app.json                   App name, package com.bynqora.renewly, renewly:// scheme, icon
    └── src/
        ├── api/                   Typed API client, endpoints, error handling, query keys
        ├── app/                   App root, navigation, providers, splash
        ├── components/            Design system (buttons, fields, cards, states, icons…)
        ├── features/              auth, dashboard, subscriptions, calendar, insights,
        │                          notifications, account, premium
        ├── services/              Secure session storage, session events, billing interface
        ├── store/                 Zustand stores (auth session, preferences)
        ├── theme/                 Colours, spacing, typography
        └── utils/                 Formatting, forms, device helpers
```

More detail:
- [Backend README](backend/README.md): configuration, every endpoint, business rules, reminder delivery, migrations.
- [Mobile README](frontend-mobile/README.md): structure, conventions and scripts.
- [ScriptTracker](backend/Database/ScriptTracker/README.md): how reference data is managed.

## Plans

| | Free | Pro |
|---|---|---|
| Subscriptions tracked | 5 active | Unlimited |
| Reminders per subscription | 1 (push) | 7, 3 and 1 days before, by push and email |
| Insights | Totals, next 30 days, by category | Plus a 12-month forecast, top subscriptions and billing-cycle mix |
| Receipt storage, cloud sync | – | ✓ (planned) |
| Ads | Yes | No |

Limits come from the `SubscriptionPlans` table. A user is Pro while an active `UserPlans` row points to a
Pro plan; Google Play Billing will create those rows, so nothing else needs to change.

## Troubleshooting

| Problem | Fix |
|---|---|
| Expo Go can't connect or keeps loading after scanning | Make sure the phone and PC are on the same Wi-Fi and port 8081 is allowed through the firewall. If the network blocks devices from reaching each other (office or public Wi-Fi), run `npx expo start --tunnel` instead. |
| Expo Go says the project's SDK version isn't supported | Update Expo Go from the store. The app uses Expo SDK 57. |
| The app shows "You're offline" or can't reach the server | Check the API was started with `--urls http://0.0.0.0:5080`, port 5080 is allowed through the firewall, and `http://<your PC's IP>:5080/health/ready` opens in the phone's browser. |
| The service picker only offers "Custom subscription" | The seed scripts haven't been run. Run `001` and `002` from ScriptTracker. |
| `sqlcmd` fails with a `QUOTED_IDENTIFIER` error | Add the `-I` flag, as shown above. |
| No verification email arrives | In Development the code is printed in the API console, not emailed. |
| The API refuses to start with `Jwt:SigningKey` errors | Set the signing key with `dotnet user-secrets` (step 2). |

## Security and privacy principles

- **Secrets stay out of the repository.** Connection strings, the JWT signing key, SMTP credentials and
  the Firebase service account come from user-secrets or environment variables.
- **Credentials are hashed.** Passwords use PBKDF2 (the ASP.NET Core Identity hasher). Refresh tokens and
  email codes are stored only as SHA-256 hashes. On the phone, the session is kept in the Android Keystore.
- **Account deletion is in the app, as Google Play requires.** It hard-deletes subscriptions, reminders,
  notifications, devices and sessions, and anonymises the account row.
- **Users only see their own data.** Every endpoint that returns user data requires a verified email and
  returns only the caller's records.

---

© BYNQORA Technologies. All rights reserved.
