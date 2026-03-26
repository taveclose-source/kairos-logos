// Conversation bundles — Price IDs match Stripe dashboard (products edited in place)
export const CONVERSATION_BUNDLES: Record<string, { conversations: number; label: string; price: number }> = {
  'price_1TCSSCE7ubUhvDtetkb8wbXU': { conversations: 10, label: 'Starter', price: 1.99 },
  'price_1TCSY7E7ubUhvDteJpKlA8eB': { conversations: 30, label: 'Standard', price: 4.99 },
  'price_1TCSYiE7ubUhvDtec7fAwd57': { conversations: 100, label: 'Value', price: 14.99 },
}

// Legacy alias for Stripe webhook backward compat
export const MEMORY_CREDIT_BUNDLES = CONVERSATION_BUNDLES

// Monthly free allocation for Scholar+ tiers
export const FREE_MONTHLY_CONVERSATIONS = 30

// Each Pastor query costs 1 conversation
export const CONVERSATIONS_PER_QUERY = 1

// Auto-reload when purchased balance drops to 5
export const AUTO_RELOAD_THRESHOLD = 5
export const AUTO_RELOAD_PRICE_ID = 'price_1TCSY7E7ubUhvDteJpKlA8eB'
export const AUTO_RELOAD_CONVERSATIONS = 30

// Tier allocations (for admin Restore button)
export const TIER_CONVERSATIONS: Record<string, number> = {
  free: 0,
  scholar: 30,
  ministry: 60,
  missions: 30,
}

// Legacy exports (kept for any remaining references)
export const CREDITS_PER_QUERY = CONVERSATIONS_PER_QUERY
export const AUTO_RELOAD_CREDITS = AUTO_RELOAD_CONVERSATIONS

export function calculateCreditsUsed(): number {
  // Simplified: 1 conversation per query
  return 1
}
