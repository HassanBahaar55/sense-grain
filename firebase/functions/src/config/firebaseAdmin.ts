export function getFirebaseAdminApp() {
  return {
    project: process.env.FIREBASE_PROJECT_ID ?? 'sense-grain-dev',
  };
}
