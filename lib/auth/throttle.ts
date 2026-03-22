type ThrottleConfig = {
  maxAttempts: number;
  windowMs: number;
};

const THROTTLE_CONFIGS: Record<string, ThrottleConfig> = {
  login: { maxAttempts: 5, windowMs: 60_000 },
  signup: { maxAttempts: 3, windowMs: 120_000 },
  password_reset: { maxAttempts: 2, windowMs: 120_000 },
};

type AttemptRecord = {
  timestamps: number[];
};

const attempts = new Map<string, AttemptRecord>();

export type ThrottleResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

/**
 * Check if an auth action is throttled. If allowed, records the attempt.
 * Call `resetThrottle(action)` on success to clear the counter.
 */
export function checkThrottle(action: string): ThrottleResult {
  const config = THROTTLE_CONFIGS[action];
  if (!config) return { allowed: true };

  const now = Date.now();
  const record = attempts.get(action) || { timestamps: [] };

  // Remove expired timestamps
  record.timestamps = record.timestamps.filter((t) => now - t < config.windowMs);

  if (record.timestamps.length >= config.maxAttempts) {
    const oldestInWindow = record.timestamps[0];
    const retryAfterMs = config.windowMs - (now - oldestInWindow);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  // Record this attempt
  record.timestamps.push(now);
  attempts.set(action, record);

  return { allowed: true };
}

/**
 * Reset throttle counter for an action (call on successful auth).
 */
export function resetThrottle(action: string): void {
  attempts.delete(action);
}
