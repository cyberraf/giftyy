const React = require('react');
const { View, Text, ScrollView, Pressable } = require('react-native');

// Very lightweight shim to keep the app running without native Reanimated.

function createAnimatedComponent(Component) {
  return Component;
}

const Animated = {
  View: createAnimatedComponent(View),
  Text: createAnimatedComponent(Text),
  ScrollView: createAnimatedComponent(ScrollView),
  Pressable: createAnimatedComponent(Pressable),
};

// Commonly used animation / layout placeholders
const FadeInDown = undefined;
const FadeInUp = undefined;
const FadeInRight = undefined;
const FadeIn = undefined;
const FadeOut = undefined;
const Layout = undefined;

// Hooks / helpers as no-ops
const useSharedValue = (initial) => ({ value: initial });
const useAnimatedStyle = () => ({});
const withTiming = (value) => value;
const runOnJS = (fn) => fn;

module.exports = {
  Animated,
  FadeInDown,
  FadeInUp,
  FadeInRight,
  FadeIn,
  FadeOut,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  createAnimatedComponent,
};

