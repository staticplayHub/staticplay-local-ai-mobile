import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        headerStyle: { backgroundColor: '#0b111d' },
        headerTintColor: '#e9f1ff',
        tabBarButton: HapticTab,
        tabBarStyle: { backgroundColor: '#0b111d', borderTopColor: '#1a2940' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Missfits Chat',
          tabBarIcon: ({ color }) => <Ionicons size={22} name="chatbubbles" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons size={22} name="settings" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dms"
        options={{
          title: 'DMs',
          tabBarIcon: ({ color }) => <Ionicons size={22} name="mail" color={color} />,
        }}
      />
    </Tabs>
  );
}
