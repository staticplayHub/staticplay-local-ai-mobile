export type Room = {
  description: string;
  id: string;
  isAdult: boolean;
  name: string;
};

export type ChatMessage = {
  id: string;
  imageDataUrl?: string;
  roomId: string;
  sender: string;
  sentAt: string;
  text: string;
};

export type ThemePreference = {
  messageBoxColor: string;
  messageTextColor: string;
};

export type DmThread = {
  id: string;
  otherAlias: string;
  updatedAt: string;
};

type ApiConfig = {
  appKey: string;
  baseUrl: string;
  userId: string;
};

type JsonValue = Record<string, unknown>;

async function request<T>(config: ApiConfig, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-staticplay-app-key': config.appKey,
      'x-staticplay-user-id': config.userId,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

export async function getHealth(config: ApiConfig) {
  return request<{ ok: boolean; service: string; timestamp: string }>(config, '/v1/health');
}

export async function getMe(config: ApiConfig) {
  return request<{ is18Verified: boolean; userId: string }>(config, '/v1/me');
}

export async function getRooms(config: ApiConfig) {
  const payload = await request<{ rooms: Room[] }>(config, '/v1/rooms');
  return payload.rooms;
}

export async function getMessages(config: ApiConfig, roomId: string) {
  const payload = await request<{ messages: ChatMessage[] }>(config, `/v1/rooms/${roomId}/messages`);
  return payload.messages;
}

export async function sendMessage(
  config: ApiConfig,
  roomId: string,
  sender: string,
  text: string,
  imageDataUrl?: string
) {
  const body: JsonValue = { sender, text, imageDataUrl };
  return request<{ message: ChatMessage }>(config, `/v1/rooms/${roomId}/messages`, {
    body: JSON.stringify(body),
    method: 'POST',
  });
}

export async function completeMockVerification(config: ApiConfig) {
  return request<{ is18Verified: boolean }>(config, '/v1/verify18/mock-complete', {
    body: JSON.stringify({ provider: 'sumsub-mock' }),
    method: 'POST',
  });
}

export async function getTheme(config: ApiConfig) {
  const payload = await request<{ theme: ThemePreference }>(config, '/v1/theme');
  return payload.theme;
}

export async function saveTheme(config: ApiConfig, theme: ThemePreference) {
  const payload = await request<{ theme: ThemePreference }>(config, '/v1/theme', {
    body: JSON.stringify(theme),
    method: 'POST',
  });
  return payload.theme;
}

export async function openDmThread(config: ApiConfig, selfAlias: string, otherAlias: string) {
  const payload = await request<{ thread: DmThread }>(config, '/v1/dms/threads/open', {
    body: JSON.stringify({ otherAlias, selfAlias }),
    method: 'POST',
  });
  return payload.thread;
}

export async function getDmThreads(config: ApiConfig, selfAlias: string) {
  const payload = await request<{ threads: DmThread[] }>(
    config,
    `/v1/dms/threads?selfAlias=${encodeURIComponent(selfAlias)}`
  );
  return payload.threads;
}

export async function getDmMessages(config: ApiConfig, threadId: string) {
  const payload = await request<{ messages: ChatMessage[] }>(config, `/v1/dms/threads/${threadId}/messages`);
  return payload.messages;
}

export async function sendDmMessage(
  config: ApiConfig,
  threadId: string,
  sender: string,
  text: string,
  imageDataUrl?: string
) {
  const body: JsonValue = { sender, text, imageDataUrl };
  return request<{ message: ChatMessage }>(config, `/v1/dms/threads/${threadId}/messages`, {
    body: JSON.stringify(body),
    method: 'POST',
  });
}
