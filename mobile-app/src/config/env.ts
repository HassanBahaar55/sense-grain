type RuntimeEnv = Record<string, string | undefined>;

declare const process: {env?: RuntimeEnv} | undefined;

const runtimeEnv: RuntimeEnv =
  typeof process === 'undefined' ? {} : process.env ?? {};

export const env = {
  appEnv: runtimeEnv.SENSE_GRAIN_APP_ENV ?? 'development',
  hardwareGatewayUrl: runtimeEnv.SENSE_GRAIN_HARDWARE_GATEWAY_URL ?? '',
};
