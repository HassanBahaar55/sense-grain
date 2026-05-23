type GoogleServicesClient = {
  oauth_client?: Array<{
    client_id?: string;
    client_type?: number;
  }>;
  services?: {
    appinvite_service?: {
      other_platform_oauth_client?: Array<{
        client_id?: string;
        client_type?: number;
      }>;
    };
  };
};

type GoogleServicesConfig = {
  client?: GoogleServicesClient[];
};

function readGoogleServicesConfig(): GoogleServicesConfig | null {
  try {
    return require('../../../android/app/google-services.json') as GoogleServicesConfig;
  } catch {
    return null;
  }
}

export function getGoogleWebClientId(): string {
  const config = readGoogleServicesConfig();
  if (!config?.client?.length) {
    return '';
  }

  for (const client of config.client) {
    const directClient = client.oauth_client?.find((item) => item.client_type === 3)?.client_id;
    if (directClient) {
      return directClient;
    }

    const inviteClient = client.services?.appinvite_service?.other_platform_oauth_client?.find(
      (item) => item.client_type === 3,
    )?.client_id;
    if (inviteClient) {
      return inviteClient;
    }
  }

  return '';
}
