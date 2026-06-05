# Native Lesson Manual QA Checklist

Use this checklist for phase 11 release sign-off. Record device, date, app build, backend commit, network condition, and result for every run.

## Required Devices

- iPad or tablet simulator, landscape, complete lesson run.
- Phone simulator or physical phone, portrait, basic lesson completion.

## Baseline Setup

- Set `EXPO_PUBLIC_LESSON_RENDERER=native` or `EXPO_PUBLIC_NATIVE_LESSON_ENABLED=true`.
- Confirm backend is reachable from the device at `EXPO_PUBLIC_API_HOST`.
- Log in through the mobile login screen and verify the backend issues a valid auth token.
- Start from course map and enter lesson `413` or the current target lesson.
- Keep WebView fallback available for every error state.

## Full Flow

- Course map opens native lesson, not WebView.
- Lesson definition loads with title, background, and current step count.
- Story media displays and advances only once after media completion.
- Teaching prompt displays with readable subtitle text.
- Challenge options are tappable with at least 44 px target height.
- Wrong answer shows feedback and allows retry.
- Speech/text answer can be submitted once without duplicate transition.
- Free chat accepts recording or manual progression when realtime is unavailable.
- End state calls course progress completion and returns to the course map.
- Course map reflects completed progress after return.

## Polish Checks

- Tablet landscape layout visually matches the web shell: media centered, speech card below, bottom controls not overlapping.
- Phone portrait layout can scroll horizontally without clipped controls or hidden exit/fallback actions.
- Subtitles wrap without covering answer options, avatars, or feedback.
- Bottom status text truncates cleanly and never pushes controls off screen.
- Pause overlay appears centered and resumes without changing step.
- WebView fallback route preserves lesson params and records fallback reason/category.

## Media And Audio

- Background and option images load after step changes without flashing stale content.
- Video unloads when leaving or switching steps; replay does not trigger duplicate completion.
- Recording starts only after microphone permission.
- A single noisy metering spike does not start VAD speech.
- Silence after speech auto-stops recording.
- Max recording duration auto-stops and leaves a recorded file ready to submit.
- App backgrounding during recording stops and unloads the recording.

## Resilience

- Weak network during load shows retry/exit/fallback, not a blank screen.
- Realtime disconnect retries with backoff and then shows a recoverable error.
- Exit during loading, recording, media playback, and progress save does not crash.
- Rotate tablet landscape to portrait and back; layout recomputes and controls remain reachable.
- Re-enter after exit starts from a fresh native session or server snapshot, not stale local UI.

## Evidence To Attach

- Tablet landscape screenshot.
- Phone portrait screenshot.
- Course completion/progress screenshot.
- Backend log snippet for lesson start and completion.
- Notes for every failed item with fallback reason and reproduction steps.
