# Fun Talk Mobile — Agent Guide

This repository is the **Expo/React Native mobile client** for Fun Talk. It targets iOS, Android, and web using a single TypeScript codebase.

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Expo SDK | ~56.0.5 |
| Router | Expo Router | ~56.2.7 (file-based routing) |
| React | React / React Native | 19.2.3 / 0.85.3 |
| Language | TypeScript | ~6.0.3 (strict mode) |
| Bundler | Metro (via Expo CLI) | — |
| JS Engine | Hermes | enabled |
| Architecture | New Architecture (TurboModules / Fabric) | enabled (`newArchEnabled=true`) |
| Package Manager | pnpm | (lockfile: `pnpm-lock.yaml`) |
| Testing | Node built-in test runner (`node:test` + `node:assert/strict`) | executed via `tsx` |
| Patching | `patch-package` | — |

> **Important:** Before writing Expo, React Native, or Expo Router code, consult the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/. Do not rely on assumptions from older SDK versions.

## Project Structure

```
src/
  app/                 # Expo Router routes and layouts (thin composition layer)
    _layout.tsx        # Root layout; wraps app in AuthProvider
    index.tsx          # Entry redirect (auth state → route decision)
    (auth)/            # Unauthenticated route group
      _layout.tsx
      login.tsx
    (app)/             # Authenticated route group
      _layout.tsx      # Auth guard; redirects unauthenticated users to login
      courses/
        index.tsx
      lesson.tsx
  features/            # Feature-owned UI, state, and business logic
    auth/              # Authentication flows, WeChat login, session management
    courses/           # Course home screen, map rendering, progress
    lesson/            # WebView-based lesson embedding, cookie sync, messaging
  lib/                 # App infrastructure (side-effect boundaries)
    api/client.ts      # Fetch wrapper with timeout, device ID, auth headers, 401 handling
    auth/              # Session mapping, storage, preferences
    device/            # Device ID generation
    env.ts             # EXPO_PUBLIC_* env var reads with runtime host rewriting
    storage/           # AsyncStorage abstraction + in-memory test doubles
  shared/              # Pure, platform-agnostic logic (no React / RN dependencies)
  components/          # Reusable cross-cutting UI components
  hooks/               # Cross-cutting React hooks (theme, color scheme)
  constants/           # App-wide theme values (colors, fonts, spacing)
  types/               # Global type declarations (asset modules)
assets/                # Bundled Expo assets (icons, splash, images)
android/               # Native Android project (ejected / prebuilt)
patches/               # patch-package patches for node_modules
scripts/               # Maintenance scripts (e.g., reset-project.js)
```

### Directory Rules

- Keep route files in `src/app/` **thin**. They should import and re-export feature screens. Do not embed business logic in routes.
- Keep code in the narrowest domain folder that owns it.
- Prefer pure helpers in `src/shared` or `src/lib` when logic needs direct unit tests without a React Native environment.
- Features expose a public API through their `index.ts` barrel export. Do not deep-import into another feature's internal files.

### Feature Internal Pattern

A typical feature under `src/features/<feature>/` follows this structure:

```
index.ts              # Barrel exports (public API)
<Provider>.tsx        # Optional React context / provider
components/           # Screens and UI pieces
  <Feature>Screen.tsx
  <SubComponent>.tsx
hooks/                # Feature-specific hooks
  use<Feature>.ts
services/             # API calls and business logic
  <feature>Api.ts
assets/               # Image / asset references
  <feature>Assets.ts
layout/ | utils/      # Optional layout math or helpers
```

### Platform-Specific Files

The project uses React Native's platform extension system:

- `.native.ts` / `.native.tsx` — native-only (iOS + Android)
- `.web.tsx` — web-only
- `.ios.ts` / `.android.ts` — single platform

Examples: `LessonWebViewScreen.web.tsx`, cookie sync utilities (`cookies.ts`, `cookies.native.ts`).

## Build, Test, and Development Commands

Install dependencies:

```bash
npm install
```

Run the dev server (always on port `19002`):

```bash
npm run start      # Expo dev server
npm run ios        # Expo dev server + iOS simulator
npm run android    # Expo dev server + Android emulator
npm run web        # Expo dev server + web
```

Code quality:

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # expo lint
npm test           # Node test runner via tsx
```

Other:

```bash
npm run reset-project   # Reset to blank Expo starter state
```

## Environment Variables

All public environment variables **must** use the `EXPO_PUBLIC_` prefix so Expo embeds them at build time.

| Variable | Purpose | Dev Default |
|---|---|---|
| `EXPO_PUBLIC_API_HOST` | Backend API base URL (no trailing slash) | `http://localhost:9000` |
| `EXPO_PUBLIC_WEB_BASE_URL` | WebView lesson embed origin (fun-talk-web) | `http://localhost:19001` |
| `EXPO_PUBLIC_OSS_BASE_URL` | Aliyun OSS for remote assets | `https://fun-talk-file.oss-cn-beijing.aliyuncs.com` |
| `EXPO_PUBLIC_ASSET_BASE_URL` | Optional override for static assets | — |
| `EXPO_PUBLIC_WECHAT_APP_ID` | WeChat Open Platform app ID | `wx4f3da33035cc1d14` |
| `EXPO_PUBLIC_WECHAT_UNIVERSAL_LINK` | WeChat universal link | `https://ai-fun-talk.com/app/` |

> **Android emulator note:** Use `http://10.0.2.2:9000` for `EXPO_PUBLIC_API_HOST`. The `devHost.ts` utility rewrites this to `localhost` on iOS simulators and physical devices automatically.

Use `.env.example` as the source of safe public placeholders. **Never commit secrets, local credentials, private certificates, generated logs, or machine-specific files.**

## Code Style & Naming Conventions

- **Language:** TypeScript with functional React components.
- **Indentation:** 2 spaces.
- **Components / Types:** `PascalCase`
- **Functions / Variables / Hooks / Helpers:** `camelCase`
- **Route files:** Focused on composition only.
- **Storage, auth, and API boundaries:** Must be explicit. Do not hide persistence side effects inside presentational components.

### Import Conventions

1. External libraries first, then a blank line.
2. Absolute aliases (`@/lib/*`, `@/features/*`, `@/shared/*`, `@/components/*`, `@/hooks/*`, `@/constants/*`) for cross-module dependencies.
3. Relative imports (`../`) **only within the same feature** for sibling files.
4. Do not deep-import into another feature's internal directories; use its `index.ts` barrel export.

Example:

```ts
import { useState } from 'react';
import { View } from 'react-native';

import { ApiRequestError } from '@/lib/api/client';
import { useAuth } from '@/features/auth';

import { useAuth } from '../AuthProvider';
import { loginImages } from '../assets/loginAssets';
```

## Testing Strategy

Tests run with **Node's built-in test runner** (`node:test` + `node:assert/strict`) executed through `tsx`:

```bash
npm test
# Equivalent to:
# node --import tsx --test src/shared/*.test.ts src/lib/auth/*.test.ts src/features/lesson/*.test.ts
```

### Where Tests Live

Tests are co-located with source files:

- `src/shared/*.test.ts` — pure logic (map math, progress state, lesson entry resolution)
- `src/lib/auth/*.test.ts` — auth session mapping, storage logic
- `src/features/lesson/*.test.ts` — lesson URL building, WebView bootstrap logic
- `src/lib/devHost.test.ts` — host rewriting logic

### Testing Conventions

- Test **pure logic and helpers** only. There are no React Native component/UI tests.
- Use `describe` / `it` / `beforeEach` from `node:test`.
- Use `assert.equal`, `assert.deepEqual`, `assert.ok`, `assert.match` from `node:assert/strict`.
- No external mocking library. Mock `globalThis.fetch` directly when testing API clients, and restore it in a `finally` block.
- Use in-memory storage doubles (`createMemoryStorage()`, `createMemoryTokenStore()`) to test auth/session logic without AsyncStorage.

### Test File Exclusion

`tsconfig.json` explicitly excludes `**/*.test.ts` from TypeScript compilation so tests can use Node-only APIs without affecting the app bundle.

## Native Configuration

### Android (`android/`)

- **Application ID:** `com.anonymous.funtalkmobile`
- **Architecture filter:** `arm64-v8a` only (`reactNativeArchitectures=arm64-v8a`)
- **New Architecture:** enabled (`newArchEnabled=true`)
- **Hermes:** enabled (`hermesEnabled=true`)
- **Edge-to-edge:** enabled (`edgeToEdgeEnabled=true`)
- **JS bundle command:** `npx expo export:embed`
- **ProGuard:** enabled for release builds
- **Signing:** debug keystore is currently used for release builds (not production-ready)

### iOS (`ios/`)

- Universal links domain: `ai-fun-talk.com`
- `NSMicrophoneUsageDescription` and `NSCameraUsageDescription` are declared in `app.json`.

### Patches

`patch-package` applies a patch to `@react-native-cookies/cookies@6.2.1` that replaces deprecated `jcenter()` with `mavenCentral()` in the library's Android build script.

## App Configuration (`app.json`)

- **Schemes:** `funtalkmobile`, `wx4f3da33035cc1d14` (WeChat)
- **Plugins:** `expo-router`, `expo-splash-screen`, `expo-wechat-no-pay`
- **Experiments:** `typedRoutes: true`, `reactCompiler: true`
- **Web output:** static (`output: static`)

## Security & Deployment Considerations

- Do not commit secrets, local credentials, private certificates, generated logs, or machine-specific files.
- The Android release build currently uses a debug signing config. Before production distribution, configure a proper release keystore.
- Keep `app.json` plugin and scheme configuration aligned with Expo SDK 56 docs.
- No CI/CD workflows are currently configured in this repository.
- No `eas.json` is present; builds are currently managed through standard Expo CLI commands.

## Commit & Pull Request Guidelines

- Use focused imperative commit subjects: `Add mobile session storage tests`, `Update lesson route guard`.
- Keep each commit to one logical change.
- PRs should include:
  - Goal and impacted paths
  - Config / env changes
  - Test evidence (`npm test` output)
  - Manual verification steps for iOS, Android, or web when UI or native behavior changes
  - `npm run typecheck` and `npm run lint` validation
