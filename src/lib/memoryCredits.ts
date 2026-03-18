export const MEMORY_CREDIT_BUNDLES: Record<string, { credits: number; label: string; price: number }> = {
  'price_1TCSSCE7ubUhvDtetkb8wbXU': { credits: 600, label: 'Starter', price: 2.99 },
  'price_1TCSY7E7ubUhvDteJpKlA8eB': { credits: 1000, label: 'Standard', price: 4.99 },
  'price_1TCSYiE7ubUhvDtec7fAwd57': { credits: 2100, label: 'Value', price: 9.99 },
}

export const CREDITS_PER_QUERY = 1
export const AUTO_RELOAD_THRESHOLD = 100
export const AUTO_RELOAD_PRICE_ID = 'price_1TCSY7E7ubUhvDteJpKlA8eB'
export const AUTO_RELOAD_CREDITS = 1000

export function calculateCreditsUsed(inputTokens: number, outputTokens: number): number {
  const rawCost = (inputTokens * 0.00025 + outputTokens * 0.00125) / 1000
  const markup = 6
  const creditsUsed = (rawCost * markup) / 0.005
  return Math.max(1, Math.ceil(creditsUsed * 100) / 100)
}
