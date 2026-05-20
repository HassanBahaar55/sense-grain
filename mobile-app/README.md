# Sense Grain Mobile App

React Native application for field operations, device setup, grain readings, alerts, and mobile-first monitoring.

## Commands

```sh
npm install
npm --workspace mobile-app run start
npm --workspace mobile-app run android
```

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
