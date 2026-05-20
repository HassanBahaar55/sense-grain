# Hardware Integration

Sense Grain is structured for future hardware integration without coupling device protocols to app screens or dashboard pages.

## Recommended Flow

```text
Sensor device
  -> gateway or direct network transport
  -> Firebase Function webhook or ingestion endpoint
  -> telemetry normalization
  -> Firestore grainReadings and devices collections
  -> mobile and web subscriptions
```

## Code Locations

- Mobile hardware clients: `mobile-app/src/services/hardware`
- Web hardware administration: `web-app/src/services/hardware`
- Backend telemetry ingestion: `firebase/functions/src/modules/hardware`
- Domain documentation: `docs/hardware-integration.md`

## Suggested Device Fields

- `deviceId`
- `deviceType`
- `firmwareVersion`
- `storageBinId`
- `lastSeenAt`
- `batteryLevel`
- `signalStrength`
- `calibrationProfile`

## Suggested Telemetry Fields

- `readingId`
- `deviceId`
- `storageBinId`
- `capturedAt`
- `moisture`
- `temperature`
- `humidity`
- `grainType`
- `qualityScore`
- `rawPayload`
