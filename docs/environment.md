# Environment Structure

Real environment files must stay local. Commit only example files.

## Root

```text
.env.example
.env
```

Root variables describe workspace-level settings.

## Mobile App

```text
mobile-app/.env.example
mobile-app/.env
```

Recommended mobile variables:

```text
SENSE_GRAIN_APP_ENV=development
SENSE_GRAIN_FIREBASE_API_KEY=
SENSE_GRAIN_FIREBASE_AUTH_DOMAIN=
SENSE_GRAIN_FIREBASE_PROJECT_ID=
SENSE_GRAIN_FIREBASE_STORAGE_BUCKET=
SENSE_GRAIN_FIREBASE_MESSAGING_SENDER_ID=
SENSE_GRAIN_FIREBASE_APP_ID=
SENSE_GRAIN_HARDWARE_GATEWAY_URL=
```

## Web App

```text
web-app/.env.local.example
web-app/.env.local
```

Recommended web variables:

```text
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_HARDWARE_GATEWAY_URL=
```

## Firebase Functions

```text
firebase/functions/.env.example
firebase/functions/.env
```

Recommended function variables:

```text
FIREBASE_PROJECT_ID=
HARDWARE_WEBHOOK_SECRET=
TELEMETRY_ALLOWED_DEVICE_TYPES=
```
