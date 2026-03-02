// Mock for react-native-reanimated with SharedTransition support
// Used via moduleNameMapper in jest.config.js
const { View, Text, Image, Animated: AnimatedRN } = require('react-native');

const NOOP = () => {};
const IDENTITY = (v) => v;
const NOOP_NODE = { addListener: NOOP, removeListener: NOOP, removeAllListeners: NOOP };

const SharedTransitionMock = {
  custom: () => SharedTransitionMock,
  duration: () => SharedTransitionMock,
  progressAnimation: () => SharedTransitionMock,
  defaultTransitionType: () => SharedTransitionMock,
  reduceMotion: () => SharedTransitionMock,
};

module.exports = {
  __esModule: true,
  default: {
    View,
    Text,
    Image,
    ScrollView: AnimatedRN.ScrollView,
    FlatList: AnimatedRN.FlatList,
    createAnimatedComponent: (comp) => comp,
    addWhitelistedNativeProps: NOOP,
    addWhitelistedUIProps: NOOP,
  },

  // Animated components
  View,
  Text,
  Image,
  ScrollView: AnimatedRN.ScrollView,
  FlatList: AnimatedRN.FlatList,
  createAnimatedComponent: (comp) => comp,

  // Hooks
  useSharedValue: (init) => ({ value: init }),
  useAnimatedStyle: () => ({}),
  useDerivedValue: (fn) => ({ value: typeof fn === 'function' ? fn() : fn }),
  useAnimatedScrollHandler: () => NOOP,
  useAnimatedRef: () => ({ current: null }),
  useAnimatedGestureHandler: () => ({}),
  useAnimatedProps: () => ({}),
  useAnimatedReaction: NOOP,
  useEvent: () => NOOP,
  useHandler: () => ({ context: {} }),
  useWorkletCallback: (fn) => fn,
  useReducedMotion: () => false,

  // Animation functions
  withSpring: IDENTITY,
  withTiming: IDENTITY,
  withDecay: IDENTITY,
  withDelay: (_, v) => v,
  withRepeat: IDENTITY,
  withSequence: (...args) => args[0],
  cancelAnimation: NOOP,

  // Interpolation / easing
  interpolate: () => 0,
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Easing: {
    linear: IDENTITY,
    ease: IDENTITY,
    bezier: () => IDENTITY,
    bezierFn: () => IDENTITY,
    in: IDENTITY,
    out: IDENTITY,
    inOut: IDENTITY,
    poly: () => IDENTITY,
    exp: IDENTITY,
    circle: IDENTITY,
    sin: IDENTITY,
    elastic: () => IDENTITY,
    bounce: IDENTITY,
    back: () => IDENTITY,
    steps: () => IDENTITY,
  },

  // Layout animations
  FadeIn: { duration: () => ({ delay: () => ({}) }) },
  FadeOut: { duration: () => ({ delay: () => ({}) }) },
  FadeInDown: { duration: () => ({ delay: () => ({}) }) },
  FadeInUp: { duration: () => ({ delay: () => ({}) }) },
  FadeOutDown: { duration: () => ({ delay: () => ({}) }) },
  FadeOutUp: { duration: () => ({ delay: () => ({}) }) },
  SlideInRight: { duration: () => ({}) },
  SlideOutRight: { duration: () => ({}) },
  SlideInLeft: { duration: () => ({}) },
  SlideOutLeft: { duration: () => ({}) },
  Layout: { springify: () => ({}), duration: () => ({}) },
  LinearTransition: { duration: () => ({}) },
  SequencedTransition: { duration: () => ({}) },
  ZoomIn: { duration: () => ({}) },
  ZoomOut: { duration: () => ({}) },

  // Shared transitions
  SharedTransition: SharedTransitionMock,
  SharedTransitionType: { ANIMATION: 'animation', PROGRESS_ANIMATION: 'progressAnimation' },

  // Enums / constants
  SensorType: {},
  IOSReferenceFrame: {},
  InterfaceOrientation: {},
  KeyboardState: {},
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  LayoutAnimationType: {},

  // Measure
  measure: () => ({ x: 0, y: 0, width: 0, height: 0, pageX: 0, pageY: 0 }),
  scrollTo: NOOP,

  // Utils
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  makeMutable: (init) => ({ value: init }),
  isSharedValue: () => false,
  setGestureState: NOOP,
  getRelativeCoords: () => ({ x: 0, y: 0 }),

  // Keyboard
  useAnimatedKeyboard: () => ({ state: { value: 0 }, height: { value: 0 } }),
  useScrollViewOffset: () => ({ value: 0 }),
};
