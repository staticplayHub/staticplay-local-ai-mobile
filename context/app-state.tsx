import React, { createContext, useContext, useMemo, useState } from 'react';

type AppStateValue = {
  appKey: string;
  baseUrl: string;
  displayName: string;
  isUnlocked: boolean;
  messageBoxColor: string;
  messageTextColor: string;
  unlockError: string | null;
  unlockWithKey: (displayName: string, key: string) => boolean;
  setMessageBoxColor: (value: string) => void;
  setMessageTextColor: (value: string) => void;
  setBaseUrl: (value: string) => void;
  userId: string;
};

const INVITE_KEY = 'VVXchat';
const DEFAULT_APP_KEY = process.env.EXPO_PUBLIC_STATICPLAY_APP_KEY ?? 'VVXchat';
const DEFAULT_BASE_URL =
  process.env.EXPO_PUBLIC_STATICPLAY_BASE_URL ?? 'https://stops-recently-chronicle-voters.trycloudflare.com';
const DEFAULT_MESSAGE_TEXT_COLOR = '#e9f1ff';
const DEFAULT_MESSAGE_BOX_COLOR = '#101a2c';

function createUserId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `sp_${random}`;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [displayName, setDisplayName] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [userId] = useState(createUserId);
  const [messageTextColor, setMessageTextColor] = useState(DEFAULT_MESSAGE_TEXT_COLOR);
  const [messageBoxColor, setMessageBoxColor] = useState(DEFAULT_MESSAGE_BOX_COLOR);

  function unlockWithKey(nameInput: string, keyInput: string) {
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setUnlockError('Pseudo name is required.');
      return false;
    }
    if (keyInput.trim() !== INVITE_KEY) {
      setUnlockError('Invalid invite key.');
      return false;
    }
    setDisplayName(trimmedName);
    setIsUnlocked(true);
    setUnlockError(null);
    return true;
  }

  const value = useMemo<AppStateValue>(
    () => ({
      appKey: DEFAULT_APP_KEY,
      baseUrl,
      displayName,
      isUnlocked,
      messageBoxColor,
      messageTextColor,
      unlockError,
      unlockWithKey,
      setMessageBoxColor,
      setMessageTextColor,
      setBaseUrl,
      userId,
    }),
    [baseUrl, displayName, isUnlocked, messageBoxColor, messageTextColor, unlockError, userId]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return context;
}
