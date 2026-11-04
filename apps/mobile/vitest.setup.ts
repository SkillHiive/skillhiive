import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock React Native
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  StyleSheet: { create: (styles: any) => styles },
  View: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  ScrollView: ({ children }: any) => children,
  TouchableOpacity: ({ children, onPress }: any) => ({ children, onPress }),
  Pressable: ({ children, onPress }: any) => ({ children, onPress }),
  Image: ({ source }: any) => null,
  SafeAreaView: ({ children }: any) => children,
  KeyboardAvoidingView: ({ children }: any) => children,
  FlatList: ({ data, renderItem }: any) => data?.map(renderItem),
  SectionList: ({ sections, renderItem }: any) => sections?.flatMap((s: any) => s.data.map(renderItem)),
  ActivityIndicator: () => null,
  RefreshControl: () => null,
  StatusBar: () => null,
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  PixelRatio: { get: () => 2 },
  NativeModules: {},
  NativeEventEmitter: vi.fn().mockImplementation(() => ({
    addListener: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
}));

// Mock Expo modules
vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children, href }: any) => ({ children, href }),
  Stack: ({ children }: any) => children,
  Tabs: ({ children }: any) => children,
}));

vi.mock("expo-constants", () => ({
  expoConfig: { extra: { supabaseUrl: "https://test.supabase.co", supabaseAnonKey: "test-key" } },
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  getAllKeys: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));