import { supabase } from '@/lib/supabase';
import { onReconnect } from '@/contexts/NetworkContext';
import { dequeue, incrementRetry, pruneExpired, QueuedOperation } from './queue';

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

type OperationHandler = (payload: Record<string, any>) => Promise<void>;

/**
 * Registry of operation handlers keyed by operation type.
 */
const handlers: Record<string, OperationHandler> = {
  mark_notification_read: async (payload) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', payload.notificationId);
    if (error) throw error;
  },

  mark_all_notifications_read: async (payload) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', payload.userId)
      .eq('is_read', false);
    if (error) throw error;
  },

  update_profile: async (payload) => {
    const { userId, ...updates } = payload;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    if (error) throw error;
  },

  save_recipient_preferences: async (payload) => {
    const { error } = await supabase
      .from('recipient_preferences')
      .upsert(payload.data, { onConflict: 'recipient_profile_id' });
    if (error) throw error;
  },
};

/**
 * Process a single queued operation with retry logic.
 */
async function processOperation(op: QueuedOperation): Promise<boolean> {
  const handler = handlers[op.type];
  if (!handler) {
    console.warn(`[SyncManager] No handler for operation type: ${op.type}, discarding`);
    await dequeue(op.id);
    return true;
  }

  try {
    await handler(op.payload);
    await dequeue(op.id);
    console.log(`[SyncManager] Successfully synced: ${op.type}`);
    return true;
  } catch (err) {
    if (op.retryCount >= MAX_RETRIES - 1) {
      console.warn(`[SyncManager] Max retries reached for ${op.type}, discarding:`, err);
      await dequeue(op.id);
      return true;
    }

    await incrementRetry(op.id);
    const delay = BACKOFF_BASE_MS * Math.pow(2, op.retryCount);
    console.log(`[SyncManager] Retry ${op.retryCount + 1}/${MAX_RETRIES} for ${op.type} in ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return false;
  }
}

let isSyncing = false;

/**
 * Process all queued operations sequentially.
 * Called automatically when connectivity is restored.
 */
export async function syncQueue(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const queue = await pruneExpired();
    if (queue.length === 0) return;

    console.log(`[SyncManager] Syncing ${queue.length} queued operation(s)...`);

    for (const op of queue) {
      const done = await processOperation(op);
      if (!done) {
        // Retry failed — try once more inline
        const retried = await processOperation({ ...op, retryCount: op.retryCount + 1 });
        if (!retried) {
          // Still failing, skip remaining and wait for next reconnect
          console.log('[SyncManager] Stopping sync due to persistent failure');
          break;
        }
      }
    }

    console.log('[SyncManager] Sync complete');
  } catch (err) {
    console.error('[SyncManager] Unexpected sync error:', err);
  } finally {
    isSyncing = false;
  }
}

/**
 * Initialize the sync manager. Call once at app startup.
 * Registers a reconnect listener that triggers queue sync.
 */
export function initSyncManager(): () => void {
  const unsubscribe = onReconnect(() => {
    syncQueue();
  });

  // Also sync on init in case there are leftover operations from a previous session
  syncQueue();

  return unsubscribe;
}
