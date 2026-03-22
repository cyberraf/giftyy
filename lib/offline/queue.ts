import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@giftyy:offline_queue';
const MAX_QUEUE_SIZE = 50;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type QueuedOperation = {
  id: string;
  type: string;
  payload: Record<string, any>;
  createdAt: number;
  retryCount: number;
};

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Load all queued operations from AsyncStorage.
 */
export async function getQueue(): Promise<QueuedOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedOperation[];
  } catch (err) {
    console.warn('[OfflineQueue] Failed to read queue:', err);
    return [];
  }
}

async function saveQueue(queue: QueuedOperation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[OfflineQueue] Failed to save queue:', err);
  }
}

/**
 * Add an operation to the offline queue.
 * Drops the oldest operation if the queue exceeds MAX_QUEUE_SIZE.
 */
export async function enqueue(type: string, payload: Record<string, any>): Promise<void> {
  const queue = await getQueue();

  const op: QueuedOperation = {
    id: generateId(),
    type,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
  };

  queue.push(op);

  // Drop oldest if over limit
  while (queue.length > MAX_QUEUE_SIZE) {
    queue.shift();
  }

  await saveQueue(queue);
  console.log(`[OfflineQueue] Enqueued: ${type} (${queue.length} total)`);
}

/**
 * Remove a specific operation from the queue by ID.
 */
export async function dequeue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((op) => op.id !== id);
  await saveQueue(filtered);
}

/**
 * Increment retry count for an operation.
 */
export async function incrementRetry(id: string): Promise<void> {
  const queue = await getQueue();
  const op = queue.find((o) => o.id === id);
  if (op) {
    op.retryCount += 1;
    await saveQueue(queue);
  }
}

/**
 * Remove expired operations (older than TTL_MS).
 * Returns the cleaned queue.
 */
export async function pruneExpired(): Promise<QueuedOperation[]> {
  const queue = await getQueue();
  const now = Date.now();
  const valid = queue.filter((op) => now - op.createdAt < TTL_MS);

  if (valid.length !== queue.length) {
    console.log(`[OfflineQueue] Pruned ${queue.length - valid.length} expired operation(s)`);
    await saveQueue(valid);
  }

  return valid;
}

/**
 * Clear the entire queue.
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
