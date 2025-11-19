import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Lightweight full-screen AI access. It navigates back to Home with ?ai= prompt.
export default function GiftyyAIScreen() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const [prompt, setPrompt] = React.useState('');

  React.useEffect(() => {
    console.log('[GiftyyAI Screen] ========================================');
    console.log('[GiftyyAI Screen] Screen mounted/launched');
    console.log('[GiftyyAI Screen] This screen redirects to Home with AI prompt');
    console.log('[GiftyyAI Screen] ========================================');
    return () => {
      console.log('[GiftyyAI Screen] Screen unmounted');
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingTop: top + 6 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <IconSymbol name="chevron.left" size={20} color="#111" />
        </Pressable>
        <Text style={styles.title}>Giftyy AI</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Reuse home’s AI by redirecting with query param so filters apply there */}
      <View style={{ padding: 16 }}>
        <Text style={{ color: '#6b7280' }}>Type your prompt on Home to get instant results.</Text>
        <Pressable
          onPress={() => {
            const examplePrompt = 'Romantic gift for girlfriend under $50';
            console.log('[GiftyyAI Screen] User clicked example prompt');
            console.log('[GiftyyAI Screen] Navigating to home with AI prompt:', examplePrompt);
            router.replace({ pathname: '/(buyer)/(tabs)/home', params: { ai: examplePrompt } });
          }}
          style={{ marginTop: 12, borderRadius: 10, backgroundColor: '#f3f4f6', padding: 12 }}
        >
          <Text style={{ fontWeight: '800' }}>Try an example →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '900' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee' },
});


