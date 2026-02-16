import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';

import type { ChatMessage, Room } from '@/services/chat-api';

type ChatRoomProps = {
  composeText: string;
  imagePreviewDataUrl?: string;
  isBusy: boolean;
  messageBoxColor?: string;
  messageTextColor?: string;
  messages: ChatMessage[];
  onChangeComposeText: (value: string) => void;
  onClearImage: () => void;
  onPickImage: () => void;
  onPickRoom: (roomId: string) => void;
  onSend: () => void;
  refreshLabel?: string;
  rooms: Room[];
  selectedRoomId?: string;
  title: string;
};

export function ChatRoom({
  composeText,
  imagePreviewDataUrl,
  isBusy,
  messageBoxColor,
  messageTextColor,
  messages,
  onChangeComposeText,
  onClearImage,
  onPickImage,
  onPickRoom,
  onSend,
  refreshLabel,
  rooms,
  selectedRoomId,
  title,
}: ChatRoomProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {refreshLabel ? <Text style={styles.note}>{refreshLabel}</Text> : null}

      <View style={styles.roomRow}>
        {rooms.map((room) => {
          const active = room.id === selectedRoomId;
          return (
            <Pressable
              key={room.id}
              onPress={() => onPickRoom(room.id)}
              style={[styles.roomPill, active && styles.roomPillActive]}>
              <Text style={[styles.roomPillText, active && styles.roomPillTextActive]}>{room.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        style={styles.messageList}
        data={messages}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.messageCard, messageBoxColor ? { backgroundColor: messageBoxColor } : null]}>
            <View style={styles.messageMeta}>
              <Text style={styles.sender}>{item.sender}</Text>
              <Text style={styles.time}>{new Date(item.sentAt).toLocaleTimeString()}</Text>
            </View>
            {item.text ? <Text style={[styles.messageText, messageTextColor ? { color: messageTextColor } : null]}>{item.text}</Text> : null}
            {item.imageDataUrl ? (
              <Image source={{ uri: item.imageDataUrl }} style={styles.messageImage} contentFit="cover" />
            ) : null}
          </View>
        )}
      />

      {imagePreviewDataUrl ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: imagePreviewDataUrl }} style={styles.previewImage} contentFit="cover" />
          <Pressable onPress={onClearImage} style={styles.clearPreviewButton}>
            <Text style={styles.clearPreviewText}>Remove</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composeRow}>
        <TextInput
          value={composeText}
          onChangeText={onChangeComposeText}
          placeholder="Write a message"
          placeholderTextColor="#8393a8"
          style={styles.composeInput}
          editable={!isBusy}
        />
        <Pressable style={styles.imageButton} onPress={onPickImage}>
          <Text style={styles.imageButtonText}>Image</Text>
        </Pressable>
        <Pressable style={[styles.sendButton, isBusy && styles.sendButtonDisabled]} onPress={onSend}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composeInput: {
    backgroundColor: '#0c1423',
    borderColor: '#20324d',
    borderRadius: 10,
    borderWidth: 1,
    color: '#e9f1ff',
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  composeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  container: { flex: 1, padding: 16 },
  clearPreviewButton: {
    backgroundColor: '#243245',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearPreviewText: { color: '#d7e4f8', fontWeight: '600' },
  imageButton: {
    backgroundColor: '#243245',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  imageButtonText: { color: '#d7e4f8', fontWeight: '700' },
  listContent: { gap: 8, paddingBottom: 10 },
  messageList: { flex: 1 },
  messageCard: {
    backgroundColor: '#101a2c',
    borderColor: '#1e2d45',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageText: { color: '#e9f1ff', fontSize: 14 },
  messageImage: {
    borderRadius: 8,
    height: 180,
    marginTop: 8,
    width: '100%',
  },
  note: { color: '#8a9bb2', marginBottom: 10 },
  previewImage: { borderRadius: 10, height: 100, width: 100 },
  previewWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  roomPill: {
    backgroundColor: '#0f1930',
    borderColor: '#20324d',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  roomPillActive: {
    backgroundColor: '#0db0ff',
    borderColor: '#0db0ff',
  },
  roomPillText: { color: '#b3c3d9', fontWeight: '600' },
  roomPillTextActive: { color: '#041223' },
  roomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sendButton: {
    backgroundColor: '#00d084',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sendButtonDisabled: { opacity: 0.7 },
  sendText: { color: '#052516', fontWeight: '700' },
  sender: { color: '#90a6c7', fontSize: 12, fontWeight: '700' },
  time: { color: '#6e7f98', fontSize: 11 },
  title: { color: '#f0f6ff', fontSize: 24, fontWeight: '700', marginBottom: 4 },
});
