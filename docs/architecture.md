# Architecture

Sense Grain is organized as a monorepo with independent application surfaces and shared conventions.

## Applications

- `mobile-app`: React Native app for field operations, grain inspection, sensor setup, alerts, and offline-friendly workflows.
- `web-app`: Next.js dashboard for operations, analytics, inventory views, device administration, and reporting.
- `firebase`: Backend-as-a-service configuration, security rules, emulators, and Cloud Functions.
- `shared-design`: Cross-platform design tokens, brand assets, and UI decisions shared by mobile and web.

## Domain Areas

- `devices`: Registered hardware devices and their lifecycle.
- `telemetry`: Incoming sensor payloads and normalized readings.
- `grainReadings`: Stored grain quality, moisture, temperature, and status measurements.
- `storageBins`: Physical storage locations, silos, bins, or warehouses.
- `alerts`: Threshold events and operational notifications.
- `users`: Roles, permissions, and team access.

## Integration Boundaries

- UI code should call service modules instead of using Firebase directly in screens or pages.
- Firebase Functions should normalize external payloads before writing to Firestore.
- Hardware transport details should stay isolated from product workflows.
- Shared design tokens should be imported by both apps instead of duplicated.
