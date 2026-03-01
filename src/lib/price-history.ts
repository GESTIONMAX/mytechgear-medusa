/**
 * Price History Management Library
 *
 * Stores price history in product variant metadata for audit trail.
 * Uses metadata.price_history array to track all price changes.
 */

import type { PriceHistory } from '../types/pricing';

export interface PriceHistoryEntry {
  timestamp: string;
  currency_code: string;
  old_amount: number | null;
  new_amount: number;
  changed_by?: string;
  reason?: string;
}

const MAX_HISTORY_ENTRIES = 100; // Keep last 100 changes

/**
 * Add price change to variant's history
 */
export async function addPriceHistory(
  productService: any,
  variantId: string,
  entry: Omit<PriceHistoryEntry, 'timestamp'>
): Promise<void> {
  try {
    // Fetch variant with metadata
    const variants = await productService.listVariants(
      { id: variantId },
      { select: ['id', 'metadata'] }
    );

    if (!variants || variants.length === 0) {
      console.error('[Price History] Variant not found:', variantId);
      return;
    }

    const variant = variants[0];
    const metadata = variant.metadata || {};
    const history: PriceHistoryEntry[] = metadata.price_history || [];

    // Add new entry
    const newEntry: PriceHistoryEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    history.unshift(newEntry); // Add to beginning (most recent first)

    // Trim to max entries
    if (history.length > MAX_HISTORY_ENTRIES) {
      history.splice(MAX_HISTORY_ENTRIES);
    }

    // Update variant metadata
    await productService.updateVariants(variantId, {
      metadata: {
        ...metadata,
        price_history: history,
      },
    });

    console.log(`[Price History] Recorded price change for variant ${variantId}:`, newEntry);
  } catch (error) {
    console.error('[Price History] Failed to add history entry:', error);
    // Don't throw - history recording should not block price updates
  }
}

/**
 * Get price history for a variant
 */
export async function getPriceHistory(
  productService: any,
  variantId: string,
  options?: {
    currency_code?: string;
    limit?: number;
  }
): Promise<PriceHistory[]> {
  try {
    const variants = await productService.listVariants(
      { id: variantId },
      { select: ['id', 'metadata'], relations: ['product'] }
    );

    if (!variants || variants.length === 0) {
      return [];
    }

    const variant = variants[0];
    const metadata = variant.metadata || {};
    let history: PriceHistoryEntry[] = metadata.price_history || [];

    // Filter by currency if specified
    if (options?.currency_code) {
      history = history.filter(
        h => h.currency_code === options.currency_code!.toLowerCase()
      );
    }

    // Limit results
    if (options?.limit) {
      history = history.slice(0, options.limit);
    }

    // Convert to PriceHistory format
    return history.map((entry, index) => ({
      id: `history_${variantId}_${index}`,
      variant_id: variantId,
      currency_code: entry.currency_code,
      old_amount: entry.old_amount,
      new_amount: entry.new_amount,
      changed_by: entry.changed_by,
      changed_at: entry.timestamp,
      reason: entry.reason,
    }));
  } catch (error) {
    console.error('[Price History] Failed to get history:', error);
    return [];
  }
}

/**
 * Get price history for multiple variants
 */
export async function getBulkPriceHistory(
  productService: any,
  options?: {
    currency_code?: string;
    days?: number;
    limit?: number;
  }
): Promise<Array<PriceHistory & { variant_title?: string }>> {
  try {
    // Fetch all variants with metadata
    const variants = await productService.listVariants(
      {},
      {
        select: ['id', 'title', 'metadata'],
        take: 1000,
      }
    );

    const allHistory: Array<PriceHistory & { variant_title?: string }> = [];

    for (const variant of variants) {
      const metadata = variant.metadata || {};
      let history: PriceHistoryEntry[] = metadata.price_history || [];

      // Filter by currency if specified
      if (options?.currency_code) {
        history = history.filter(
          h => h.currency_code === options.currency_code!.toLowerCase()
        );
      }

      // Filter by date if specified
      if (options?.days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.days);
        history = history.filter(
          h => new Date(h.timestamp) >= cutoffDate
        );
      }

      // Convert to PriceHistory format and add to results
      for (const [index, entry] of history.entries()) {
        allHistory.push({
          id: `history_${variant.id}_${index}`,
          variant_id: variant.id,
          variant_title: variant.title,
          currency_code: entry.currency_code,
          old_amount: entry.old_amount,
          new_amount: entry.new_amount,
          changed_by: entry.changed_by,
          changed_at: entry.timestamp,
          reason: entry.reason,
        });
      }
    }

    // Sort by timestamp (most recent first)
    allHistory.sort((a, b) =>
      new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
    );

    // Limit results
    if (options?.limit) {
      return allHistory.slice(0, options.limit);
    }

    return allHistory;
  } catch (error) {
    console.error('[Price History] Failed to get bulk history:', error);
    return [];
  }
}
