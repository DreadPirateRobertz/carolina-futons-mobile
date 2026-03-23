/**
 * Stub accessories catalog — cf-ymo
 *
 * Static list of available avatar accessories. In production this would
 * come from the Wix CMS; for Phase 6 MVP we ship a fixed set.
 */

export type AccessoryType = 'hat' | 'badge' | 'background';

export interface Accessory {
  id: string;
  name: string;
  type: AccessoryType;
  /** 0 = free (available to all tiers), >0 = points cost to unlock */
  pointsCost: number;
  /** Emoji placeholder until lottie/image assets land */
  emoji: string;
}

export const ACCESSORIES: Accessory[] = [
  { id: 'hat-crown', name: 'Crown', type: 'hat', pointsCost: 0, emoji: '👑' },
  { id: 'hat-cowboy', name: 'Cowboy Hat', type: 'hat', pointsCost: 500, emoji: '🤠' },
  { id: 'hat-party', name: 'Party Hat', type: 'hat', pointsCost: 250, emoji: '🎉' },
  { id: 'badge-star', name: 'Gold Star', type: 'badge', pointsCost: 0, emoji: '⭐' },
  { id: 'badge-fire', name: 'Fire Badge', type: 'badge', pointsCost: 300, emoji: '🔥' },
  { id: 'badge-heart', name: 'Heart Badge', type: 'badge', pointsCost: 200, emoji: '❤️' },
  { id: 'bg-mountain', name: 'Blue Ridge', type: 'background', pointsCost: 0, emoji: '🏔️' },
  { id: 'bg-sunset', name: 'Sunset', type: 'background', pointsCost: 750, emoji: '🌅' },
  { id: 'bg-cozy', name: 'Cozy Cabin', type: 'background', pointsCost: 600, emoji: '🏡' },
];

export function getAccessoryById(id: string): Accessory | undefined {
  return ACCESSORIES.find((a) => a.id === id);
}
