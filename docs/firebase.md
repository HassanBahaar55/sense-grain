# Firebase Setup

The `firebase` folder is prepared for Firebase Hosting, Firestore, Storage, Cloud Functions, and emulators.

## Files

- `firebase/firebase.json`: Firebase services and emulator configuration.
- `firebase/.firebaserc.example`: Project alias template.
- `firebase/firestore.rules`: Firestore security rules placeholder.
- `firebase/firestore.indexes.json`: Firestore index placeholder.
- `firebase/storage.rules`: Cloud Storage security rules placeholder.
- `firebase/functions`: Cloud Functions TypeScript source structure.

## Setup Steps

1. Install the Firebase CLI.
2. Authenticate with Firebase.
3. Copy `.firebaserc.example` to `.firebaserc`.
4. Replace project ids with real Firebase project ids.
5. Copy environment example files to local environment files.
6. Start emulators from the repository root:

```bash
npm run firebase:emulators
```

## Security Notes

- Keep service account files out of git.
- Keep production secrets in Firebase environment configuration or a secret manager.
- Treat Firestore and Storage rules as product code.
- Test rules locally before deployment.
