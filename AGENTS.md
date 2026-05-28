# Repository Guidelines

## Expo Version Rule

Expo HAS CHANGED. Before writing Expo, React Native, or Expo Router code, read the exact versioned docs for this app at:

https://docs.expo.dev/versions/v54.0.0/

Do not rely on older Expo assumptions when changing APIs, config, router behavior, native modules, or build tooling.

## Project Structure & Module Organization

This repository is the Expo mobile client for Fun Talk.

- `src/app/`: Expo Router routes and route-group layouts.
  - `src/app/(auth)/`: authentication screens.
  - `src/app/(app)/`: signed-in app screens.
- `src/features/`: feature-owned UI and state modules such as auth, courses, and lesson flows.
- `src/lib/`: app infrastructure such as API client, auth/session storage, device IDs, env helpers, and asset URL handling.
- `src/shared/`: pure shared logic with Node test coverage.
- `src/components/`: reusable UI components.
- `src/constants/`: app-wide constants such as theme values.
- `assets/`: bundled Expo assets.
- `scripts/`: maintenance scripts.

Keep code in the narrowest domain folder that owns it. Prefer pure helpers in `src/shared` or `src/lib` when logic needs direct unit tests.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run start`: run Expo dev server on port `19002`.
- `npm run ios`: start Expo for iOS on port `19002`.
- `npm run android`: start Expo for Android on port `19002`.
- `npm run web`: start Expo web on port `19002`.
- `npm run lint`: run Expo lint.
- `npm run typecheck`: run TypeScript with `tsc --noEmit`.
- `npm test`: run Node test files through `tsx`.

The backend development default is `EXPO_PUBLIC_API_HOST=http://localhost:9000`. The web lesson embed default is `EXPO_PUBLIC_WEB_BASE_URL=http://localhost:19001`.

## Coding Style & Naming Conventions

- Use TypeScript and functional React components.
- Use 2-space indentation in TypeScript/TSX.
- Use `PascalCase` for components and types.
- Use `camelCase` for functions, variables, hooks, and helpers.
- Keep route files focused on route composition; move reusable logic into `features`, `lib`, or `shared`.
- Keep storage, auth, and API boundaries explicit. Do not hide persistence side effects inside presentational components.
- Prefer Expo and React Native APIs that are documented for SDK 54.

## Testing Guidelines

- Add or update focused tests for pure logic in `src/shared` and `src/lib`.
- Use the existing Node test harness pattern:

```bash
npm test
```

- Run `npm run typecheck` after TypeScript changes.
- Run `npm run lint` before opening a PR when code changes touch app, component, feature, or lib paths.
- For route/UI changes, include manual verification steps for iOS, Android, or web as applicable.

## Environment & Configuration

- Use `.env.example` as the source of safe public placeholders.
- Expo public values must use the `EXPO_PUBLIC_` prefix.
- Do not commit secrets, local credentials, private certificates, generated logs, or machine-specific files.
- Keep app scheme, universal links, and native plugin config in `app.json` aligned with Expo SDK 54 docs.

## Commit & Pull Request Guidelines

- Use focused imperative commit subjects, such as `Add mobile session storage tests` or `Update lesson route guard`.
- Keep each commit to one logical change.
- PRs should include goal, impacted paths, config/env changes, test evidence, and manual device/simulator evidence when UI or native behavior changes.
