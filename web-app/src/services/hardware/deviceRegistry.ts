export type DeviceRegistration = {
  deviceId: string;
  deviceType: string;
  storageBinId?: string;
};

export async function registerDevice(device: DeviceRegistration) {
  return device;
}
