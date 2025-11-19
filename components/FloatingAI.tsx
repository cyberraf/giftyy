import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, StyleSheet, useWindowDimensions, Animated, PanResponder, Modal, TextInput, Text, Image, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as FileSystem from 'expo-file-system/legacy';
import { useAISection } from '@/contexts/AISectionContext';

export default function FloatingAI() {
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [promptOpen, setPromptOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputHeight, setInputHeight] = useState(44);
  const suggestions = [
    'Birthday gift for mom under $50',
    'Romantic gift for girlfriend',
    'Techie gift for boyfriend $100',
    'Relaxing spa set for mother',
  ];
  const sRef = useRef<ScrollView | null>(null);
  const sOffsets = useRef<number[]>([]);
  const [sIdx, setSIdx] = useState(0);
  useEffect(() => {
    if (!promptOpen) return;
    const id = setInterval(() => {
      setSIdx((i) => {
        const next = (i + 1) % suggestions.length;
        const off = sOffsets.current[next] ?? 0;
        sRef.current?.scrollTo({ x: Math.max(0, off - 6), animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [promptOpen, suggestions.length]);
  const { aiSectionVisibleOnHome, isHomeMounted } = useAISection();
  const hidden = useMemo(() => {
    // Auto-hide on camera/recorder-like routes
    if (!pathname) return false;
    return pathname.includes('/checkout/video') || pathname.includes('/video-message');
  }, [pathname]);

  const { width, height } = useWindowDimensions();
  const initialBottom = Math.max(92, bottom + 56);
  const pan = useRef(new Animated.ValueXY({ x: width - 54 - 18, y: height - initialBottom - 54 })).current;
  const last = useRef({ x: width - 54 - 18, y: height - initialBottom - 54 });
  const moved = useRef(false);
  const POS_FILE = FileSystem.documentDirectory + 'giftyy_ai_pos.json';
  const [dismissed, setDismissed] = useState(false);

  const clamp = (x: number, y: number) => {
    const margin = 8;
    const w = 54;
    const h = 54;
    return {
      x: Math.min(Math.max(x, margin), width - w - margin),
      y: Math.min(Math.max(y, margin), height - initialBottom - margin),
    };
  };

  // Load saved position
  useEffect(() => {
    (async () => {
      try {
        const data = await FileSystem.readAsStringAsync(POS_FILE);
        const pos = JSON.parse(data);
        if (typeof pos?.x === 'number' && typeof pos?.y === 'number') {
          const cl = clamp(pos.x, pos.y);
          last.current = cl;
          pan.setValue(cl);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 3,
      onPanResponderGrant: () => {
        moved.current = false;
      },
      onPanResponderMove: (_, g) => {
        const { dx, dy } = g;
        if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
        const pos = clamp(last.current.x + dx, last.current.y + dy);
        pan.setValue(pos);
      },
      onPanResponderRelease: async (_, g) => {
        const pos = clamp(last.current.x + g.dx, last.current.y + g.dy);
        last.current = pos;
        Animated.spring(pan, { toValue: pos, useNativeDriver: false, bounciness: 8 }).start();
        try {
          await FileSystem.writeAsStringAsync(POS_FILE, JSON.stringify(pos));
        } catch {}
        // Reset so next tap is treated as a click
        moved.current = false;
      },
    })
  ).current;

  // Subtle pulse animation
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  // Only show on Home if the AI section is scrolled out; on other pages, always show.
  const onHome = isHomeMounted; // rely on context from Home mount
  if (hidden || dismissed || (onHome && aiSectionVisibleOnHome)) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {!promptOpen && (
        <Animated.View style={[styles.btn, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]} {...responder.panHandlers}>
          {/* Pulse ring */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulseRing,
              {
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
              },
            ]}
          />
          {/* Close badge */}
          <Pressable onPress={() => setDismissed(true)} style={styles.closeBadge} accessibilityRole="button" accessibilityLabel="Dismiss Giftyy AI">
            <IconSymbol name="xmark" size={14} color="white" />
          </Pressable>
          <Pressable
            onPress={() => { if (!moved.current) setPromptOpen(true); }}
            style={styles.touch}
            accessibilityRole="button"
            accessibilityLabel="Open Giftyy AI"
          >
            <Image source={require('@/assets/images/logo.png')} style={{ width: 34, height: 34, borderRadius: 7 }} resizeMode="contain" />
            <View style={styles.pulseDot} />
          </Pressable>
        </Animated.View>
      )}

      {/* Floating dialog with full AI card */}
      <Modal visible={promptOpen} transparent animationType="fade" onRequestClose={() => setPromptOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPromptOpen(false)} />
        <View style={styles.dialog}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={require('@/assets/images/logo.png')} style={{ width: 24, height: 24, borderRadius: 6 }} resizeMode="contain" />
              <Text style={{ fontWeight: '900', fontSize: 16 }}>Giftyy AI</Text>
            </View>
            <Pressable onPress={() => setPromptOpen(false)} style={styles.closeBadgeRight}>
              <IconSymbol name="xmark" size={14} color="white" />
            </Pressable>
          </View>
          <View style={{ height: 10 }} />
          <View style={styles.popInput}>
            <TextInput
              value={aiText}
              onChangeText={setAiText}
              placeholder="Describe who you’re gifting..."
              placeholderTextColor="#9ba1a6"
              multiline
              onContentSizeChange={(e) => {
                const h = Math.min(120, Math.max(44, Math.ceil(e.nativeEvent.contentSize.height)));
                setInputHeight(h);
              }}
              style={{ flex: 1, color: '#111', height: inputHeight }}
            />
            <Pressable
              onPress={() => {
                if (!aiText.trim()) return;
                setLoading(true);
                setTimeout(() => {
                  setPromptOpen(false);
                  router.replace({ pathname: '/(buyer)/(tabs)/home', params: { ai: aiText.trim() } });
                  setAiText('');
                  setLoading(false);
                }, 500);
              }}
              style={styles.popFind}
              disabled={loading || !aiText.trim()}
            >
              {loading ? <ActivityIndicator size="small" color="white" /> : <IconSymbol name="magnifyingglass" color="white" size={18} />}
            </Pressable>
          </View>
          <ScrollView ref={sRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center', paddingRight: 6 }} style={{ marginTop: 8 }}>
            {suggestions.map((s, i) => (
              <Pressable key={s} onPress={() => setAiText(s)} onLayout={(e) => { sOffsets.current[i] = e.nativeEvent.layout.x; }} style={styles.suggestionChip}>
                <Text style={{ color: '#111', fontWeight: '400', fontSize: 13 }}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eeeeee',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'visible',
  },
  touch: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pulseDot: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: 'white',
  },
  pulseRing: {
    position: 'absolute',
    left: -5,
    top: -5,
    right: -5,
    bottom: -5,
    borderRadius: 32,
    backgroundColor: '#f75507',
  },
  closeBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 2,
  },
  closeBadgeRight: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 2,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  dialog: { position: 'absolute', left: 16, right: 16, top: '20%', backgroundColor: 'white', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, elevation: 8 },
  popInput: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 8, backgroundColor: '#F9FAFB' },
  popFind: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f75507', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  suggestionChip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: '#F4F5F6', borderWidth: 1, borderColor: '#e5e7eb' },
});


