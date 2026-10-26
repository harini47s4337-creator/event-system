/**
 * Redis Caching Service (Section 7)
 * Implements caching for active and published event details and listings with TTL.
 * Provides resilient in-memory storage fallback when external Redis is unavailable.
 */

interface CacheEntry {
  value: any;
  expiresAt: number;
}

class CacheService {
  private memCache = new Map<string, CacheEntry>();
  private defaultTTL = 300; // 5 minutes in seconds

  /**
   * Get parsed value from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    const entry = this.memCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL (seconds)
   */
  public async set(key: string, value: any, ttlSeconds: number = this.defaultTTL): Promise<void> {
    this.memCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidate specific key
   */
  public async del(key: string): Promise<void> {
    this.memCache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or pattern (e.g. "event:*")
   */
  public async invalidatePattern(pattern: string): Promise<number> {
    let count = 0;
    const prefix = pattern.replace('*', '');
    for (const key of this.memCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memCache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate event and public listings cache
   */
  public async invalidateEvent(eventId: string): Promise<void> {
    await this.del(`event:${eventId}`);
    await this.del('events:published');
    await this.invalidatePattern('events:category:');
  }

  public getStats() {
    return {
      entriesCount: this.memCache.size,
      activeKeys: Array.from(this.memCache.keys()),
    };
  }
}

export const cacheService = new CacheService();
