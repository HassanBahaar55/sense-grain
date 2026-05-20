type RuntimeEnv = Record<string, string | undefined>;

declare const process: {env?: RuntimeEnv} | undefined;

const runtimeEnv: RuntimeEnv =
  typeof process === 'undefined' ? {} : process.env ?? {};

export const env = {
  appEnv: runtimeEnv.SENSE_GRAIN_APP_ENV ?? 'development',
  firebase: {
    apiKey: runtimeEnv.SENSE_GRAIN_FIREBASE_API_KEY ?? '',
    authDomain: runtimeEnv.SENSE_GRAIN_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: runtimeEnv.SENSE_GRAIN_FIREBASE_PROJECT_ID ?? '',
    storageBucket: runtimeEnv.SENSE_GRAIN_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: runtimeEnv.SENSE_GRAIN_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: runtimeEnv.SENSE_GRAIN_FIREBASE_APP_ID ?? '',
  },
  hardwareGatewayUrl: runtimeEnv.SENSE_GRAIN_HARDWARE_GATEWAY_URL ?? '',
};
