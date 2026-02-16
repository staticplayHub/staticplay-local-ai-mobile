import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';

import { useAppState } from '@/context/app-state';
import {
  getDmMessages,
  getDmThreads,
  openDmThread,
  sendDmMessage,
  type ChatMessage,
  type DmThread,
} from '@/services/chat-api';

export default function DmsTab() {
  const { appKey, baseUrl, displayName, isUnlocked, messageBoxColor, messageTextColor, userId } = useAppState();
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composeText, setComposeText] = useState('');
  const [composeImageDataUrl, setComposeImageDataUrl] = useState<string | undefined>(undefined);
  const [targetAliasInput, setTargetAliasInput] = useState('');
  const [status, setStatus] = useState('DMs ready.');
  const [busy, setBusy] = useState(false);

  const config = useMemo(() => ({ appKey, baseUrl, userId }), [appKey, baseUrl, userId]);

  const loadThreads = useCallback(async () => {
    if (!displayName) {
      return;
    }
    const data = await getDmThreads(config, displayName);
    setThreads(data);
    setSelectedThreadId((current) => current ?? data[0]?.id);
  }, [config, displayName]);

  const loadMessages = useCallback(async (threadId: string) => {
    const data = await getDmMessages(config, threadId);
    setMessages(data);
  }, [config]);

  useEffect(() => {
    if (!isUnlocked || !displayName) {
      return;
    }
    loadThreads().catch((error: unknown) => {
      setStatus(`DM load failed: ${(error as Error).message}`);
    });
  }, [isUnlocked, displayName, loadThreads]);

  useEffect(() => {
    if (!selectedThreadId || !isUnlocked) {
      return;
    }
    loadMessages(selectedThreadId).catch((error: unknown) => {
      setStatus(`Message fetch failed: ${(error as Error).message}`);
    });
  }, [isUnlocked, loadMessages, selectedThreadId]);

  async function onStartDm() {
    if (!displayName) {
      return;
    }
    const alias = targetAliasInput.trim();
    if (!alias) {
      setStatus('Enter a player alias to start DM.');
      return;
    }
    setBusy(true);
    try {
      const thread = await openDmThread(config, displayName, alias);
      await loadThreads();
      setSelectedThreadId(thread.id);
      setStatus(`DM open with ${thread.otherAlias}`);
    } catch (error: unknown) {
      setStatus(`Open DM failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onPickImage() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['image/*'],
      });
      if (picked.canceled || !picked.assets?.[0]) {
        return;
      }
      const asset = picked.assets[0];
      const size = typeof asset.size === 'number' ? asset.size : 0;
      if (size > 3 * 1024 * 1024) {
        setStatus('Image too large. Max 3MB.');
        return;
      }
      const mimeType = asset.mimeType || 'image/jpeg';
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setComposeImageDataUrl(`data:${mimeType};base64,${base64}`);
      setStatus('Image ready to send.');
    } catch (error: unknown) {
      setStatus(`Image pick failed: ${(error as Error).message}`);
    }
  }

  async function onSend() {
    const text = composeText.trim();
    if (!selectedThreadId || (!text && !composeImageDataUrl)) {
      return;
    }
    setBusy(true);
    try {
      await sendDmMessage(config, selectedThreadId, displayName || 'Guest', text, composeImageDataUrl);
      setComposeText('');
      setComposeImageDataUrl(undefined);
      await loadMessages(selectedThreadId);
      await loadThreads();
    } catch (error: unknown) {
      setStatus(`DM send failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Unlock Chat First</Text>
          <Text style={styles.sub}>Enter key in Missfits Chat tab to use DMs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <View style={styles.card}>
          <Text style={styles.title}>Private DMs</Text>
          <View style={styles.row}>
            <TextInput
              value={targetAliasInput}
              onChangeText={setTargetAliasInput}
              style={styles.input}
              placeholder="Player alias"
              placeholderTextColor="#7f93af"
            />
            <Pressable style={[styles.button, styles.createButton]} onPress={onStartDm} disabled={busy}>
              <Text style={styles.buttonText}>Open</Text>
            </Pressable>
          </View>
          <View style={styles.threadRow}>
            {threads.map((thread) => {
              const active = thread.id === selectedThreadId;
              return (
                <Pressable
                  key={thread.id}
                  onPress={() => setSelectedThreadId(thread.id)}
                  style={[styles.threadPill, active && styles.threadPillActive]}>
                  <Text style={[styles.threadText, active && styles.threadTextActive]}>{thread.otherAlias}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.status}>{status}</Text>
        </View>

        <View style={styles.messagesWrap}>
          {messages.map((item) => (
            <View key={item.id} style={[styles.messageCard, messageBoxColor ? { backgroundColor: messageBoxColor } : null]}>
              <View style={styles.metaRow}>
                <Text style={styles.sender}>{item.sender}</Text>
                <Text style={styles.time}>{new Date(item.sentAt).toLocaleTimeString()}</Text>
              </View>
              {item.text ? <Text style={[styles.messageText, messageTextColor ? { color: messageTextColor } : null]}>{item.text}</Text> : null}
              {item.imageDataUrl ? <Image source={{ uri: item.imageDataUrl }} style={styles.image} contentFit="cover" /> : null}
            </View>
          ))}
        </View>

        {composeImageDataUrl ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: composeImageDataUrl }} style={styles.preview} contentFit="cover" />
            <Pressable onPress={() => setComposeImageDataUrl(undefined)} style={styles.removeButton}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.row}>
          <TextInput
            value={composeText}
            onChangeText={setComposeText}
            style={styles.input}
            placeholder="Write DM"
            placeholderTextColor="#7f93af"
            editable={!busy}
          />
          <Pressable style={[styles.button, styles.imageButton]} onPress={onPickImage}>
            <Text style={styles.buttonText}>Image</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.sendButton]} onPress={onSend} disabled={busy}>
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  buttonText: { color: '#d9e4f7', fontWeight: '700' },
  card: {
    backgroundColor: '#101a2c',
    borderColor: '#1e2d45',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  container: { backgroundColor: '#060d19', flex: 1, padding: 14 },
  createButton: { backgroundColor: '#0db0ff' },
  image: { borderRadius: 8, height: 180, marginTop: 8, width: '100%' },
  imageButton: { backgroundColor: '#243245' },
  input: {
    backgroundColor: '#0c1423',
    borderColor: '#20324d',
    borderRadius: 10,
    borderWidth: 1,
    color: '#e9f1ff',
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  keyboardWrap: { flex: 1 },
  messageCard: {
    backgroundColor: '#101a2c',
    borderColor: '#1e2d45',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    padding: 10,
  },
  messagesWrap: { flex: 1, marginBottom: 8 },
  messageText: { color: '#e9f1ff' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  preview: { borderRadius: 10, height: 90, width: 90 },
  previewWrap: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 },
  removeButton: { backgroundColor: '#243245', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  removeButtonText: { color: '#d9e4f7', fontWeight: '700' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sendButton: { backgroundColor: '#00d084' },
  sendButtonText: { color: '#042114', fontWeight: '700' },
  sender: { color: '#9ab0cf', fontSize: 12, fontWeight: '700' },
  status: { color: '#8ca0be', marginTop: 8 },
  sub: { color: '#9bb0cd' },
  threadPill: {
    backgroundColor: '#0f1930',
    borderColor: '#20324d',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  threadPillActive: {
    backgroundColor: '#0db0ff',
    borderColor: '#0db0ff',
  },
  threadRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  threadText: { color: '#b3c3d9', fontWeight: '600' },
  threadTextActive: { color: '#041223' },
  time: { color: '#6e7f98', fontSize: 11 },
  title: { color: '#f0f6ff', fontSize: 21, fontWeight: '700' },
});
