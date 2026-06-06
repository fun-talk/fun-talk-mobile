# WebView Lesson — Known Limitations

Phase 5 loads the existing FunTalk web lesson inside `react-native-webview`. This keeps feature parity quickly, but comes with platform constraints.

## Auth & Cookies

- Native login stores Bearer token in SecureStore; the web lesson expects `localStorage.ft_auth` and API/WebSocket `sid` cookies.
- The app injects `ft_auth` before page load and patches `fetch()` to send `Authorization: Bearer …`.
- `@react-native-cookies/cookies` attempts to seed the `sid` cookie for REST + WebSocket auth. This requires a dev build on device/simulator; Expo Go support is limited.
- If cookies cannot be set, REST calls may still work via the injected Bearer header, but `/ws` realtime audio may fail until cookies are available.

## Dev Environment

- Web and API must both be reachable from the device/emulator.
- Default dev URLs:
  - Web: `http://localhost:19001` (use LAN IP on physical devices, e.g. `http://192.168.x.x:19001`)
  - API: `http://localhost:9000` (same LAN IP rule applies)
- Web build must have `VITE_API_HOST` pointing at the same API host the device can reach.

## Microphone / Camera

- Android/iOS require OS permissions (`RECORD_AUDIO`, etc.) plus WebView `onPermissionRequest` grants.
- Real-device testing is required; emulators often have unreliable microphone capture.
- Bluetooth headsets and silent-mode behavior vary by OEM WebView.

## Orientation

- Lesson screen unlocks orientation; leaving lesson restores portrait lock.
- Some Android tablets keep system auto-rotate behavior independent of app lock.

## Progress Sync

- Course completion is still written by the web lesson (`localStorage` + server API).
- Native course home refreshes progress when the screen regains focus or when WebView navigates back to `/app/courses`.

## Opening Scene

- Opening scene URLs (`/demos/openingScene?...`) load in the same WebView and follow the same auth/cookie rules as `/app/lesson`.

## Not Covered in Phase 5

- Offline playback
- Background audio when app is backgrounded (OS may suspend WebView audio)
- Native deep links into mid-lesson steps
- File upload / OSS upload demos inside WebView
- Full parity with desktop browser devtools debugging

## Recommended Production Setup

- Serve web and API under the same site (`https://ai-fun-talk.com`) to simplify cookie scope.
- Use EAS dev/production builds (not Expo Go) for microphone and cookie manager validation.
