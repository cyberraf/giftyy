import * as React from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';

export function createAnimatedComponent<T extends React.ComponentType<any>>(
  Component: T
): T {
  // @ts-expect-error - we intentionally return the same component type
  return Component;
}

export const Animated = {
  View: createAnimatedComponent(View),
  Text: createAnimatedComponent(Text),
  ScrollView: createAnimatedComponent(ScrollView),
  Pressable: createAnimatedComponent(Pressable),
  Image: createAnimatedComponent(Image),
};

// Very lightweight shim to keep the app compiling and running
// without native react-native-reanimated installed.
// Chainable, no-op animation presets so calls like FadeInDown.delay(100)
// don't crash.
const createAnimationPreset = () => {
  const preset: any = {};
  const chain = () => preset;
  preset.delay = chain;
  preset.duration = chain;
  preset.springify = chain;
  preset.damping = chain;
  preset.withCallback = chain;
  return preset;
};

// Commonly used animation / layout placeholders
export const FadeInDown: any = createAnimationPreset();
export const FadeInUp: any = createAnimationPreset();
export const FadeInRight: any = createAnimationPreset();
export const FadeIn: any = createAnimationPreset();
export const FadeOut: any = createAnimationPreset();
export const Layout: any = createAnimationPreset();

// Hooks / helpers as no-ops
export const useSharedValue = <T,>(initial: T) => ({ value: initial });
export const useAnimatedStyle = (_worklet: any) => ({});
export const withTiming = <T,>(
  value: T,
  _config?: any,
  callback?: () => void
) => {
  if (typeof callback === 'function') {
    // Run callback immediately in shim so visibility toggles still fire.
    callback();
  }
  return value;
};
export const withSpring = <T,>(value: T) => value;
export const runOnJS = <T extends (...args: any[]) => any>(fn: T) => fn;

export const Easing = {
  out: (fn: any) => fn,
  in: (fn: any) => fn,
  inOut: (fn: any) => fn,
  linear: (t: number) => t,
};

export const interpolate = (
  value: number,
  inputRange: number[],
  outputRange: number[]
) => {
  if (!Array.isArray(inputRange) || !Array.isArray(outputRange) || inputRange.length < 2 || outputRange.length < 2) {
    return value;
  }
  const [inMin, inMax] = [inputRange[0], inputRange[inputRange.length - 1]];
  const [outMin, outMax] = [outputRange[0], outputRange[outputRange.length - 1]];
  if (inMax === inMin) return outMin;
  const t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
};

export const withRepeat = (animation: any, _count?: number, _reverse?: boolean) => animation;
export const withSequence = (...animations: any[]) =>
  animations.length ? animations[animations.length - 1] : undefined;

// Shim for gesture-handler's Reanimated.useEvent integration
export const useEvent = (handler: any, _argMapping?: any) => handler;

export default Animated;

