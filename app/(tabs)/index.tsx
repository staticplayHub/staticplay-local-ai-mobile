import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { ChatRoom } from '@/components/chat-room';
import { useAppState } from '@/context/app-state';
import { getMessages, getRooms, getTheme, sendMessage, type ChatMessage, type Room } from '@/services/chat-api';

export default function ChatTab() {
  const {
    appKey,
    baseUrl,
    displayName,
    isUnlocked,
    messageBoxColor,
    messageTextColor,
    setMessageBoxColor,
    setMessageTextColor,
    unlockError,
    unlockWithKey,
    userId,
  } = useAppState();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composeText, setComposeText] = useState('');
  const [composeImageDataUrl, setComposeImageDataUrl] = useState<string | undefined>(undefined);
  const [pseudoNameInput, setPseudoNameInput] = useState('');
  const [inviteKeyInput, setInviteKeyInput] = useState('');
  const [status, setStatus] = useState('Connecting...');
  const [busy, setBusy] = useState(false);

  const config = useMemo(() => ({ appKey, baseUrl, userId }), [appKey, baseUrl, userId]);
  const friendlyRooms = useMemo(() => rooms.filter((room) => !room.isAdult), [rooms]);

  const loadRooms = useCallback(async () => {
    const data = await getRooms(config);
    const safeRooms = data.filter((room) => !room.isAdult);
    setRooms(data);
    setSelectedRoomId((current) => current ?? safeRooms[0]?.id);
    setStatus(`Connected to ${baseUrl}`);
  }, [baseUrl, config]);

  const loadMessages = useCallback(
    async (roomId: string) => {
      const data = await getMessages(config, roomId);
      setMessages(data);
    },
    [config]
  );

  useEffect(() => {
    if (!isUnlocked) {
      return;
    }
    getTheme(config)
      .then((theme) => {
        if (theme.messageBoxColor) {
          setMessageBoxColor(theme.messageBoxColor);
        }
        if (theme.messageTextColor) {
          setMessageTextColor(theme.messageTextColor);
        }
      })
      .catch(() => {});
    loadRooms().catch((error: unknown) => {
      setStatus(`Server error: ${(error as Error).message}`);
    });
  }, [config, isUnlocked, loadRooms, setMessageBoxColor, setMessageTextColor]);

  useEffect(() => {
    if (!selectedRoomId || !isUnlocked) {
      return;
    }
    loadMessages(selectedRoomId).catch((error: unknown) => {
      setStatus(`Message fetch failed: ${(error as Error).message}`);
    });
  }, [isUnlocked, loadMessages, selectedRoomId]);

  async function onSend() {
    const text = composeText.trim();
    if (!selectedRoomId || (!text && !composeImageDataUrl)) {
      return;
    }
    setBusy(true);
    try {
      await sendMessage(config, selectedRoomId, displayName || 'Guest', text, composeImageDataUrl);
      setComposeText('');
      setComposeImageDataUrl(undefined);
      await loadMessages(selectedRoomId);
    } catch (error: unknown) {
      setStatus(`Send failed: ${(error as Error).message}`);
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

  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gateWrap}>
          <Text style={styles.gateTitle}>Missfits Chat Invite-Only</Text>
          <Text style={styles.gateSub}>Enter pseudo name and access key.</Text>
          <TextInput
            value={pseudoNameInput}
            onChangeText={setPseudoNameInput}
            style={styles.gateInput}
            placeholder="Pseudo name"
            placeholderTextColor="#7f93af"
            autoCapitalize="none"
          />
          <TextInput
            value={inviteKeyInput}
            onChangeText={setInviteKeyInput}
            style={styles.gateInput}
            placeholder="Access key"
            placeholderTextColor="#7f93af"
            autoCapitalize="none"
          />
          <Pressable style={styles.gateButton} onPress={() => unlockWithKey(pseudoNameInput, inviteKeyInput)}>
            <Text style={styles.gateButtonText}>Enter Chat</Text>
          </Pressable>
          {unlockError ? <Text style={styles.gateError}>{unlockError}</Text> : null}
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
        <View style={styles.headerRow}>
          <Text style={styles.brand}>Missfit {displayName}</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
        <ChatRoom
          title="Friendly Chat Rooms"
          refreshLabel="Invite-only personal communication rooms."
          rooms={friendlyRooms}
          selectedRoomId={selectedRoomId}
          onPickRoom={setSelectedRoomId}
          messages={messages}
          composeText={composeText}
          imagePreviewDataUrl={composeImageDataUrl}
          onClearImage={() => setComposeImageDataUrl(undefined)}
          onChangeComposeText={setComposeText}
          onPickImage={onPickImage}
          onSend={onSend}
          isBusy={busy}
          messageBoxColor={messageBoxColor}
          messageTextColor={messageTextColor}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brand: { color: '#8cd4ff', fontSize: 18, fontWeight: '700' },
  container: { backgroundColor: '#060d19', flex: 1 },
  gateButton: {
    backgroundColor: '#00d084',
    borderRadius: 10,
    marginTop: 6,
    paddingVertical: 11,
  },
  gateButtonText: { color: '#042114', fontWeight: '700', textAlign: 'center' },
  gateError: { color: '#ff6f91', marginTop: 10, textAlign: 'center' },
  gateInput: {
    backgroundColor: '#0a1220',
    borderColor: '#1a2940',
    borderRadius: 10,
    borderWidth: 1,
    color: '#e9f1ff',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  gateSub: { color: '#9bb0cd', marginBottom: 12 },
  gateTitle: { color: '#ecf4ff', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  gateWrap: {
    backgroundColor: '#0e1626',
    borderColor: '#1e2d45',
    borderRadius: 14,
    borderWidth: 1,
    margin: 18,
    padding: 16,
  },
  headerRow: {
    alignItems: 'baseline',
    borderBottomColor: '#1a2940',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  keyboardWrap: { flex: 1 },
  status: { color: '#7f93af', fontSize: 12, maxWidth: '70%' },
});
