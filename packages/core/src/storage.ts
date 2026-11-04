// Storage abstraction (platform-agnostic interface)
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

export interface StorageProvider {
  local: StorageAdapter;
  session: StorageAdapter;
  secure?: StorageAdapter; // For sensitive data (native only)
}

function createWebStorage(type: "localStorage" | "sessionStorage"): StorageAdapter {
  const storage = type === "localStorage" ? window.localStorage : window.sessionStorage;
  
  return {
    getItem: async (key: string) => storage.getItem(key),
    setItem: async (key: string, value: string) => storage.setItem(key, value),
    removeItem: async (key: string) => storage.removeItem(key),
    clear: async () => storage.clear(),
    getAllKeys: async () => Object.keys(storage),
  };
}

// Web implementation (will be overridden by platform-specific)
export const storage: StorageProvider = {
  local: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    clear: async () => {},
    getAllKeys: async () => [],
  },
  session: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    clear: async () => {},
    getAllKeys: async () => [],
  },
};

if (typeof window !== "undefined") {
  storage.local = createWebStorage("localStorage");
  storage.session = createWebStorage("sessionStorage");
}

// JSON helpers
export async function getJSON<T>(adapter: StorageAdapter, key: string, defaultValue: T): Promise<T> {
  const value = await adapter.getItem(key);
  if (value === null) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

export async function setJSON<T>(adapter: StorageAdapter, key: string, value: T): Promise<void> {
  await adapter.setItem(key, JSON.stringify(value));
}

// Queue helpers (for offline sync)
export interface QueueItem<T = any> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
  retries: number;
}

export async function enqueue<T>(
  adapter: StorageAdapter,
  queueKey: string,
  item: QueueItem<T>
): Promise<void> {
  const queue = await getJSON<QueueItem<T>[]>(adapter, queueKey, []);
  queue.push(item);
  await setJSON(adapter, queueKey, queue);
}

export async function dequeue<T>(
  adapter: StorageAdapter,
  queueKey: string
): Promise<QueueItem<T> | null> {
  const queue = await getJSON<QueueItem<T>[]>(adapter, queueKey, []);
  if (queue.length === 0) return null;
  const item = queue.shift()!;
  await setJSON(adapter, queueKey, queue);
  return item;
}

export async function peekQueue<T>(
  adapter: StorageAdapter,
  queueKey: string
): Promise<QueueItem<T>[]> {
  return getJSON<QueueItem<T>[]>(adapter, queueKey, []);
}

export async function clearQueue(adapter: StorageAdapter, queueKey: string): Promise<void> {
  await adapter.removeItem(queueKey);
}