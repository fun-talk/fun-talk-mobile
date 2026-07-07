# Fun Talk Mobile — Agent Guide

This repository is the **Expo / React Native mobile client** for Fun Talk. It is a universal TypeScript application that targets iOS, Android, and web from a single codebase. The app provides course browsing, authentication (including WeChat login), and an interactive English lesson player that can render either in a WebView or through a native lesson runtime.

> **Note:** `CLAUDE.md` at the repository root simply points to this file. Treat `AGENTS.md` as the single source of truth for agent guidance.

## Technology Stack

| Layer | Technology | Version in `package.json` |
|---|---|---|
| Framework | Expo SDK | `~54.0.0` (installed: `54.0.35`) |
| Router | Expo Router | `~6.0.23` (file-based routing) |
| React | React / React Native | `19.1.0` / `0.81.5` |
| Language | TypeScript | `~6.0.3` (strict mode) |
| Bundler | Metro (via Expo CLI) | — |
| JS Engine | Hermes | enabled (`hermesEnabled=true`) |
| Architecture | New Architecture (TurboModules / Fabric) | enabled (`newArchEnabled=true`) |
| Package Manager | npm | `package-lock.json` is the source of truth |
| Testing | Node built-in test runner (`node:test` + `node:assert/strict`) | executed via `tsx` |
| Patching | `patch-package` | — |

Notable runtime dependencies: `@react-native-async-storage/async-storage`, `@react-native-cookies/cookies`, `expo-asset`, `expo-av`, `expo-dev-client`, `expo-image`, `expo-secure-store`, `expo-speech`, `expo-wechat-no-pay`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-webview`, `react-native-worklets`.

> **Important:** Before writing Expo, React Native, or Expo Router code, consult the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/. Do not rely on assumptions from newer or older SDK versions.

## Project Structure

```
src/
  app/                 # Expo Router routes and layouts (thin composition layer)
    _layout.tsx        # Root layout; wraps app in AuthProvider + OpeningAnimation
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
    lesson/            # WebView lesson embedding + native lesson runtime
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
android/               # Generated native Android project (prebuild; gitignored)
patches/               # patch-package patches for node_modules
scripts/               # Maintenance scripts (e.g., reset-project.js)
docs/                  # Manual QA checklist for native lesson release
fun-talk-web_backup/   # Nested backup of the web lesson renderer + migration evidence
软著材料/               # Generated software-copyright registration documents
```

The current worktree also contains an untracked `fun-talk-server/` directory. It is outside the mobile client and is not described here.

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

Examples:

- `components/animated-icon.tsx` (native) vs. `components/animated-icon.web.tsx` + `.module.css` (web)
- `hooks/use-color-scheme.ts` (native) vs. `hooks/use-color-scheme.web.ts` (SSR-safe web)
- `features/lesson/components/LessonWebViewScreen.tsx` (native) vs. `features/lesson/components/LessonWebViewScreen.web.tsx`
- `features/lesson/syncWebViewCookies.ts` (default no-op), `features/lesson/syncWebViewCookies.native.ts` (cookie manager), `features/lesson/syncWebViewCookies.web.ts` (no-op)

## Main Modules

### `features/auth/` — Authentication

Manages login, session persistence, WeChat native login, and the auth guard.

| Key file | Responsibility |
|---|---|
| `AuthProvider.tsx` | React context/provider. Holds `FtAuthRecord`, builds the `apiClient`, persists auth, checks session on launch, exposes `saveAuth`, `logout`, `refreshAuth`. |
| `components/LoginScreen.tsx` | Main login screen container; handles personal/school form login and WeChat login. |
| `components/LandingView.tsx` | Responsive landing view with mascot, entry buttons, QR-code login box. |
| `components/LoginView.tsx` | Tabbed login form container. |
| `components/PersonalForm.tsx` / `SchoolForm.tsx` | Account-type login forms. |
| `components/WechatModal.tsx` / `WechatQrBox.tsx` | WeChat native login confirmation and QR code rendering. |
| `hooks/useWechatQrLogin.ts` | Fetches QR code, polls scan status, completes QR login. |
| `services/login.ts` | API calls for check-session, frontpage login, WeChat code login, QR endpoints. |
| `services/wechatNative.ts` | Native WeChat SDK wrapper (`expo-wechat-no-pay`). |

Public API (`features/auth/index.ts`):

```ts
export { AuthProvider, useAuth } from './AuthProvider';
export { LoginScreen } from './components/LoginScreen';
```

### `features/courses/` — Course Home

Renders the scrollable course map, progress, and course entry.

| Key file | Responsibility |
|---|---|
| `components/CourseHomeScreen.tsx` | Main course map screen. |
| `components/CourseNode.tsx` | Numbered course node on the map. |
| `components/CourseMapBackground.tsx` | Tiled background image. |
| `components/CourseToolbar.tsx` | Study report, count badge, greeting, logout. |
| `components/CourseEnterLoadingOverlay.tsx` | Loading overlay while entering a course. |
| `hooks/useCourseHome.ts` | Loads published lessons/progress, handles course entry, logout, scroll-to-current, pending fox move. |
| `hooks/useLogoutTimer.ts` | Polls `/api/v1/should_logout` and forces logout when requested by the server. |
| `layout/courseHomeLayout.ts` | Viewport-relative sizing helpers. |
| `services/courseHomeApi.ts` | Fetches published lessons, posts logout, checks force-logout. |

The feature barrel re-exports map/progress helpers from `src/shared/` (see `features/courses/index.ts`).

### `features/lesson/` — Lesson Rendering

This is the largest feature. It contains two render paths:

1. **WebView lesson** — loads the web lesson renderer (`fun-talk-web`) inside `react-native-webview`, syncs cookies/auth, and bridges messages.
2. **Native lesson** — a self-contained native lesson runtime with a state-machine controller, WebSocket realtime session, recording/VAD, media playback, TTS, and progress completion.

| Key file | Responsibility |
|---|---|
| `LessonScreen.tsx` | Dispatcher that chooses `NativeLessonScreen` or `LessonWebViewScreen` based on `resolveLessonRenderMode`. |
| `lessonMode.ts` | Decides `native` vs. `webview` render mode from env/params. |
| `buildLessonWebUrl.ts` | Builds WebView destination path/URL and detects course-home navigation. |
| `components/LessonWebViewScreen.tsx` | Native WebView lesson: cookie sync, bootstrap injection, bridge messages, progress updates. |
| `components/LessonWebViewScreen.web.tsx` | Web placeholder: WebView lessons require iOS/Android. |
| `syncWebViewCookies*.ts` | Cookie sync for `sid` (native) or no-op (web/default). |
| `webViewBootstrap.ts` | Injects auth/deviceId/token into WebView `localStorage` and patches `fetch`. |
| `webViewMessages.ts` | Parses bridge messages; resolves auth updates and course-progress updates. |
| `components/NativeLessonScreen.tsx` | Loads lesson definition, wires controller/recording/realtime session, handles completion and fallback. |
| `components/NativeLessonShell.tsx` | Renders scaled lesson canvas, media frame, speech card, options, recording/free-chat panels. |
| `nativeLessonController.ts` | Pure state reducer for lesson flow: story → teaching → challenge → free_chat → end. |
| `nativeLessonLoader.ts` | Fetches and normalizes `NativeLessonDefinition` from `/api/v1/realtime_lesson`. |
| `nativeLessonRealtimeProjection.ts` | Applies realtime server events to projection state. |
| `nativeLessonSessionProtocol.ts` | WebSocket message protocol: commands, URL builder, event normalization. |
| `nativeLessonMedia.ts` / `nativeRealtimeAudio.ts` | Media view building, audio unpacking, WAV construction. |
| `recordingController.ts` / `simpleVad.ts` | Recording state machine and voice-activity detection. |
| `freeChatAutoRecording.ts` | Auto-start/submit free-chat recordings once per turn. |
| `WEBVIEW_LIMITATIONS.md` | Documents known WebView lesson limitations. |

The public barrel (`features/lesson/index.ts`) exports screen components, controller helpers, layout/realtime/progress utilities, and related types.

### `src/lib/` — Infrastructure

| Key file | Responsibility |
|---|---|
| `api/client.ts` | `createApiClient`: fetch wrapper with 15 s timeout, device ID query param, Bearer token, 401 logout callback, Chinese network-error messages. |
| `auth/session.ts` | Maps backend login/check-session responses into `FtAuthRecord`. |
| `auth/storage.ts` | Platform-aware auth persistence: `SecureStore` on native, `AsyncStorage` on web. |
| `auth/storageCore.ts` | Core read/write/clear logic for split token/profile stores. |
| `auth/preferences.ts` | Remember-me preference helpers. |
| `auth/types.ts` | `FtAuthRecord`, `FtAuthProfile`, expiration helpers. |
| `device/deviceId.ts` | Generates and persists a random hex device ID in AsyncStorage. |
| `env.ts` | Reads `EXPO_PUBLIC_*` vars (with runtime host rewriting). |
| `devHost.ts` | Rewrites `10.0.2.2` to `localhost` except on Android emulators. |
| `storage/asyncStorage.ts` | `KeyValueStorage` abstraction + default AsyncStorage + in-memory test doubles. |
| `assets/localImage.ts` | Casts `require(...)` module IDs to `ImageSource`. |
| `assets/ossAssets.ts` | Builds URLs for Aliyun OSS-hosted assets. |
| `debugAlert.ts` | Queued `Alert.alert` helper for debug messages. |

### `src/shared/` — Pure Logic

| Key file | Responsibility |
|---|---|
| `courseHomeMap.ts` | Base course positions, map height/segment math, published-lesson filtering, node building. |
| `courseHomeProgress.ts` | Local + server course progress parsing, completion logic, progress API calls. |
| `courseHomeFoxMove.ts` | Pending fox-move animation state. |
| `courseOpeningSceneEntry.ts` | Resolves opening-scene entry/exit paths with safe return-to sanitization. |

## Build, Test, and Development Commands

Install dependencies:

```bash
npm install
```

Use npm for dependency installs so EAS and local builds resolve the same lockfile.

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
npm run reset-project   # Reset to blank Expo starter state (destructive)
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
2. Absolute aliases (`@/lib/*`, `@/features/*`, `@/shared/*`, `@/components/*`, `@/hooks/*`, `@/constants/*`, `@/assets/*`) for cross-module dependencies.
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

- `src/shared/*.test.ts` — pure logic (map math, progress state, fox move, opening scene entry)
- `src/lib/auth/*.test.ts` — auth session mapping, storage logic
- `src/lib/devHost.test.ts` — host rewriting logic
- `src/features/courses/layout/*.test.ts` — course home layout math
- `src/features/lesson/*.test.ts` — lesson URL building, WebView bootstrap logic, native lesson controller, media, recording/VAD, realtime projection, session protocol, progress, etc.

Verified test files include:

```
src/features/courses/layout/courseHomeLayout.test.ts
src/features/lesson/freeChatAutoRecording.test.ts
src/features/lesson/lesson.test.ts
src/features/lesson/nativeLessonController.test.ts
src/features/lesson/nativeLessonErrors.test.ts
src/features/lesson/nativeLessonLoader.test.ts
src/features/lesson/nativeLessonMedia.test.ts
src/features/lesson/nativeLessonPreview.test.ts
src/features/lesson/nativeLessonProgress.test.ts
src/features/lesson/nativeLessonRealtimeProjection.test.ts
src/features/lesson/nativeLessonScale.test.ts
src/features/lesson/nativeLessonSessionProtocol.test.ts
src/features/lesson/nativeLessonTtsPolicy.test.ts
src/features/lesson/nativeRealtimeAudio.test.ts
src/features/lesson/recordingController.test.ts
src/features/lesson/simpleVad.test.ts
src/lib/auth/session.test.ts
src/lib/auth/storage.test.ts
src/lib/devHost.test.ts
src/shared/courseHomeFoxMove.test.ts
src/shared/courseHomeMap.test.ts
src/shared/courseHomeProgress.test.ts
src/shared/courseOpeningSceneEntry.test.ts
```

### Testing Conventions

- Test **pure logic and helpers** only. There are no React Native component/UI tests.
- Use `describe` / `it` / `beforeEach` from `node:test`.
- Use `assert.equal`, `assert.deepEqual`, `assert.ok`, `assert.match` from `node:assert/strict`.
- No external mocking library. Mock `globalThis.fetch` directly when testing API clients, and restore it in a `finally` block.
- Use in-memory storage doubles (`createMemoryStorage()`) to test auth/session logic without AsyncStorage.

### Test File Exclusion

`tsconfig.json` explicitly excludes `**/*.test.ts` from TypeScript compilation so tests can use Node-only APIs without affecting the app bundle.

## Native Configuration

### Android (`android/`)

> **Important:** The `android/` directory is **gitignored** and treated as a generated/prebuild artifact. It is created by Expo prebuild and should not be edited directly unless you intend to commit native changes.

Current prebuild values (from `android/gradle.properties` and `android/app/build.gradle`):

- **Application ID / namespace:** `com.funtalk`
- **Architecture filter:** `arm64-v8a` only (`reactNativeArchitectures=arm64-v8a`)
- **New Architecture:** enabled (`newArchEnabled=true`)
- **Hermes:** enabled (`hermesEnabled=true`)
- **Edge-to-edge:** enabled (`edgeToEdgeEnabled=true`)
- **JS bundle command:** `npx expo export:embed`
- **PNG crunch:** enabled in release (`android.enablePngCrunchInReleaseBuilds=true`)
- **GIF/WebP support:** enabled (`expo.gif.enabled=true`, `expo.webp.enabled=true`); animated WebP disabled
- **Minification:** R8/ProGuard minification is controlled by `android.enableMinifyInReleaseBuilds` and currently defaults to `false`
- **Signing:**
  - Debug config uses the standard Android debug keystore (`debug.keystore`, passwords `android`)
  - Release config uses plaintext upload keystore properties from `gradle.properties`:
    - `MYAPP_UPLOAD_STORE_FILE=my-upload-key.jks`
    - `MYAPP_UPLOAD_STORE_PASSWORD=funtalk@kaixin506`
    - `MYAPP_UPLOAD_KEY_ALIAS=my-key-alias`
    - `MYAPP_UPLOAD_KEY_PASSWORD=funtalk@kaixin506`

### iOS

There is **no local `ios/` project** in the repository (it is also gitignored). iOS configuration is managed through `app.json`:

- **Bundle identifier:** `com.anonymous.funtalkmobile`
- **Universal links domain:** `ai-fun-talk.com`
- **Permissions:** `NSMicrophoneUsageDescription`, `NSCameraUsageDescription`

### App Configuration (`app.json`)

- **Schemes:** `funtalkmobile`, `wx4f3da33035cc1d14` (WeChat)
- **Plugins:** `expo-router`, `expo-splash-screen`, `expo-wechat-no-pay`, `expo-asset`
- **Experiments:** `typedRoutes: true`, `reactCompiler: true`
- **Web output:** static (`output: static`)
- **EAS project ID:** `5db2c1d4-0128-4575-bf32-993e20e3164a`

## EAS Build (`eas.json`)

EAS Build is configured with three profiles:

- `development` — development client, internal distribution
- `preview` — internal distribution
- `production` — app-store distribution with `autoIncrement: true`

Submit profile:

- `production` — empty placeholder profile (configure when ready)

## Patches

`patch-package` applies a patch to `@react-native-cookies/cookies@6.2.1` that replaces the deprecated `jcenter()` repository with `mavenCentral()` in the library's Android build script. The patch directory also contains pre-built Android library artifacts.

## Related Repositories / Artifacts

### `fun-talk-web_backup/`

This is a **nested Git repository** containing a backup of the original Vite + React + TypeScript web lesson renderer (`fun-talk-web`). It serves as the reference implementation for the React Native native lesson migration and contains extensive migration evidence under `fun-talk-web_backup/docs/`:

- `RN_MIGRATION_GUIDE.md`
- `RN_MIGRATION_PHASE0_BASELINE.md` through `RN_MIGRATION_PHASE11_AUDIT.md`
- `dist/` — a pre-built web bundle used for WebView fallback in the mobile app

It is **not** part of the mobile app build. The actual `fun-talk-web` directory is gitignored at the root.

### Python scripts at root

- `gd3.py`, `generate_doc.py`, `generate_doc2.py` — generate software copyright registration source-code documents (软著材料) as Word `.docx` files. They read selected source files, format/clean the code, and output paginated documents under `软著材料/`.

### Documentation files

- `docs/native-lesson-manual-qa.md` — release QA checklist for native lessons
- `src/features/lesson/WEBVIEW_LIMITATIONS.md` — known WebView lesson limitations and recommended production setup
- `README.md` — generic Expo starter README (does not describe the Fun Talk app)
- `CLAUDE.md` — single-line pointer to `AGENTS.md`

## Security & Deployment Considerations

- **`.env` is currently tracked in Git** even though `.gitignore` lists `.env` and `.env*.local`. Review and rotate any secrets, then remove `.env` from version control if it contains non-public values.
- **Android signing secrets are stored in plain text** in `android/gradle.properties`:
  - `MYAPP_UPLOAD_STORE_PASSWORD`
  - `MYAPP_UPLOAD_KEY_PASSWORD`
  - Keystore path `my-upload-key.jks`
- **Machine-specific paths** are hardcoded in `android/gradle.properties` (`org.gradle.java.home`). These will break on other developer machines and CI runners.
- **Duplicate `org.gradle.jvmargs` entries** exist in `android/gradle.properties` (line 13 with `-Xmx6144m`, line 66 with `-Xmx4g`; the later value wins).
- The Android release build currently references a debug signing config plus the plaintext upload keystore. Treat this as **not production-ready** until properly configured.
- Do not commit secrets, local credentials, private certificates, generated logs, or machine-specific files.
- Keep `app.json` plugin and scheme configuration aligned with Expo SDK 54 docs.
- No CI/CD workflows are currently configured in this repository.

## Commit & Pull Request Guidelines

- Use focused imperative commit subjects: `Add mobile session storage tests`, `Update lesson route guard`.
- Keep each commit to one logical change.
- PRs should include:
  - Goal and impacted paths
  - Config / env changes
  - Test evidence (`npm test` output)
  - Manual verification steps for iOS, Android, or web when UI or native behavior changes
  - `npm run typecheck` and `npm run lint` validation
