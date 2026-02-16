import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppState } from '@/context/app-state';
import { getHealth, getMe, getTheme, saveTheme } from '@/services/chat-api';

export default function SettingsTab() {
  const {
    appKey,
    baseUrl,
    displayName,
    isUnlocked,
    messageBoxColor,
    messageTextColor,
    setBaseUrl,
    setMessageBoxColor,
    setMessageTextColor,
    userId,
  } = useAppState();
  const [draftBaseUrl, setDraftBaseUrl] = useState(baseUrl);
  const [draftMessageTextColor, setDraftMessageTextColor] = useState(messageTextColor);
  const [draftMessageBoxColor, setDraftMessageBoxColor] = useState(messageBoxColor);
  const [status, setStatus] = useState('No checks run yet.');
  const [busy, setBusy] = useState(false);
  const config = useMemo(() => ({ appKey, baseUrl, userId }), [appKey, baseUrl, userId]);

  async function onCheckServer() {
    setBusy(true);
    try {
      const [health] = await Promise.all([getHealth(config), getMe(config)]);
      setStatus(`${health.service} online at ${new Date(health.timestamp).toLocaleString()}`);
    } catch (error: unknown) {
      setStatus(`Health check failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function onApplyBaseUrl() {
    const trimmed = draftBaseUrl.trim().replace(/\/+$/, '');
    if (!trimmed) {
      return;
    }
    setBaseUrl(trimmed);
    setStatus(`Server URL updated to ${trimmed}`);
  }

  function normalizeColor(input: string) {
    const color = input.trim();
    if (!/^#([0-9a-fA-F]{6})$/.test(color)) {
      return '';
    }
    return color.toLowerCase();
  }

  function onApplyThemeLocal() {
    const textColor = normalizeColor(draftMessageTextColor);
    const boxColor = normalizeColor(draftMessageBoxColor);
    if (!textColor || !boxColor) {
      setStatus('Use valid HEX colors like #e9f1ff and #101a2c');
      return;
    }
    setMessageTextColor(textColor);
    setMessageBoxColor(boxColor);
    setStatus('Theme applied locally.');
  }

  async function onSaveTheme() {
    const textColor = normalizeColor(draftMessageTextColor);
    const boxColor = normalizeColor(draftMessageBoxColor);
    if (!textColor || !boxColor) {
      setStatus('Use valid HEX colors like #e9f1ff and #101a2c');
      return;
    }
    setBusy(true);
    try {
      const theme = await saveTheme(config, { messageBoxColor: boxColor, messageTextColor: textColor });
      setMessageTextColor(theme.messageTextColor);
      setMessageBoxColor(theme.messageBoxColor);
      setStatus('Theme saved to server.');
    } catch (error: unknown) {
      setStatus(`Theme save failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onLoadTheme() {
    setBusy(true);
    try {
      const theme = await getTheme(config);
      setDraftMessageTextColor(theme.messageTextColor);
      setDraftMessageBoxColor(theme.messageBoxColor);
      setMessageTextColor(theme.messageTextColor);
      setMessageBoxColor(theme.messageBoxColor);
      setStatus('Theme loaded from server.');
    } catch (error: unknown) {
      setStatus(`Theme load failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function onApplyPreset(textColor: string, boxColor: string) {
    setDraftMessageTextColor(textColor);
    setDraftMessageBoxColor(boxColor);
    setMessageTextColor(textColor);
    setMessageBoxColor(boxColor);
    setStatus('Preset applied.');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Theme</Text>
          <View style={styles.presetRow}>
            <Pressable style={[styles.presetButton, { backgroundColor: '#0db0ff' }]} onPress={() => onApplyPreset('#e9f1ff', '#101a2c')}>
              <Text style={styles.presetText}>Default</Text>
            </Pressable>
            <Pressable style={[styles.presetButton, { backgroundColor: '#e7ff7a' }]} onPress={() => onApplyPreset('#0c1b3b', '#fff6a9')}>
              <Text style={[styles.presetText, { color: '#203100' }]}>Sun</Text>
            </Pressable>
            <Pressable style={[styles.presetButton, { backgroundColor: '#59ffcf' }]} onPress={() => onApplyPreset('#02221a', '#b4ffec')}>
              <Text style={[styles.presetText, { color: '#033324' }]}>Mint</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>Message text color (HEX)</Text>
          <TextInput
            value={draftMessageTextColor}
            onChangeText={setDraftMessageTextColor}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="#e9f1ff"
            placeholderTextColor="#6f85a5"
          />
          <Text style={styles.label}>Message box color (HEX)</Text>
          <TextInput
            value={draftMessageBoxColor}
            onChangeText={setDraftMessageBoxColor}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="#101a2c"
            placeholderTextColor="#6f85a5"
          />
          <Pressable style={styles.button} onPress={onApplyThemeLocal}>
            <Text style={styles.buttonText}>Apply Theme</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.secondary]} onPress={onSaveTheme} disabled={busy}>
            <Text style={styles.buttonText}>Save Theme</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.tertiary]} onPress={onLoadTheme} disabled={busy}>
            <Text style={styles.buttonText}>Load Theme</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Server</Text>
          <Text style={styles.label}>API Base URL</Text>
          <TextInput
            value={draftBaseUrl}
            onChangeText={setDraftBaseUrl}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={styles.button} onPress={onApplyBaseUrl}>
            <Text style={styles.buttonText}>Apply URL</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.secondary]} onPress={onCheckServer} disabled={busy}>
            <Text style={styles.buttonText}>Check Server</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Identity</Text>
          <Text style={styles.meta}>User ID: {userId}</Text>
          <Text style={styles.meta}>App Key: {appKey}</Text>
          <Text style={styles.meta}>Pseudo name: {displayName || '-'}</Text>
          <Text style={styles.meta}>Access status: {isUnlocked ? 'granted' : 'locked'}</Text>
        </View>

        <Text style={styles.status}>{status}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#0db0ff',
    borderRadius: 10,
    marginTop: 10,
    paddingVertical: 11,
  },
  buttonText: { color: '#041223', fontWeight: '700', textAlign: 'center' },
  card: {
    backgroundColor: '#101a2c',
    borderColor: '#1e2d45',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  container: { backgroundColor: '#060d19', flex: 1, padding: 16 },
  input: {
    backgroundColor: '#09111e',
    borderColor: '#1d2b43',
    borderRadius: 10,
    borderWidth: 1,
    color: '#e9f1ff',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  label: { color: '#9fb0ca', marginBottom: 6 },
  meta: { color: '#d8e4f7', marginBottom: 5 },
  presetButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  presetText: { color: '#07131e', fontWeight: '700' },
  scrollContent: { paddingBottom: 20 },
  secondary: { backgroundColor: '#00d084' },
  tertiary: { backgroundColor: '#7a89a3' },
  status: { color: '#9fb0ca', marginTop: 4, textAlign: 'center' },
  title: { color: '#f3f8ff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
});
