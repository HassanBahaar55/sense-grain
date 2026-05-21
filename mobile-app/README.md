# Sense Grain Mobile App

React Native application for field operations, device setup, grain readings, alerts, and mobile-first monitoring.

## Commands

```sh
npm install
npm --workspace mobile-app run start
npm --workspace mobile-app run android
```

## Firebase

Firebase access is isolated in `src/services/firebase`. The app initializes
Firebase only when `SENSE_GRAIN_FIREBASE_API_KEY`,
`SENSE_GRAIN_FIREBASE_PROJECT_ID`, and `SENSE_GRAIN_FIREBASE_APP_ID` are set,
so local builds without credentials continue to render safely.

## Structure

```text
android/     Native Android project
ios/         Native iOS project
src/
  app/          App bootstrap
  assets/       Images, icons, and fonts
  components/   Reusable mobile UI components
  config/       Runtime configuration
  features/     Domain features
  hooks/        Shared React hooks
  navigation/   Navigation setup
  screens/      Screen-level views
  services/     Firebase, hardware, and API clients
  state/        Client state management
  theme/        Shared design token adapters
  types/        TypeScript types
  utils/        Utility functions
```
