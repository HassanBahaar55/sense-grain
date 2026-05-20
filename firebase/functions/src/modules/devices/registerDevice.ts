export type RegisterDeviceInput = {
  deviceId: string;
  deviceType: string;
  storageBinId?: string;
};

export async function registerDevice(input: RegisterDeviceInput) {
  return {
    ...input,
    registeredAt: new Date().toISOString(),
  };
}
