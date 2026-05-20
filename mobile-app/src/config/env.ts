export const env = {
  appEnv: process.env.SENSE_GRAIN_APP_ENV ?? 'development',
  firebase: {
    apiKey: process.env.SENSE_GRAIN_FIREBASE_API_KEY ?? '',
    authDomain: process.env.SENSE_GRAIN_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.SENSE_GRAIN_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.SENSE_GRAIN_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.SENSE_GRAIN_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.SENSE_GRAIN_FIREBASE_APP_ID ?? '',
  },
  hardwareGatewayUrl: process.env.SENSE_GRAIN_HARDWARE_GATEWAY_URL ?? '',
};
