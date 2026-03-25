export const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? ''

export function isAdmin(userId: string | null): boolean {
  return !!userId && userId === ADMIN_USER_ID
}

/** Admin bypasses all tier restrictions */
export function canUseVoice(tier: string, userId?: string | null) {
  return isAdmin(userId ?? null) || ['scholar', 'ministry', 'missions'].includes(tier)
}

export function canUseUnlimitedAsk(tier: string, userId?: string | null) {
  return isAdmin(userId ?? null) || ['scholar', 'ministry', 'missions'].includes(tier)
}

export function canUsePastorsHelps(tier: string, userId?: string | null) {
  return isAdmin(userId ?? null) || ['scholar', 'ministry', 'missions'].includes(tier)
}

export function canUseNetworking(tier: string, userId?: string | null) {
  return isAdmin(userId ?? null) || ['scholar', 'ministry', 'missions'].includes(tier)
}

export function getMinistrySeats(tier: string, seatCount: number) {
  return tier === 'ministry' ? seatCount : 1
}
