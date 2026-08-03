import { RoomSpec } from '../types';

/**
 * Automatically distinguishes duplicate room/area names (e.g. Bathroom -> Bathroom 1, Bathroom 2)
 */
export function getUniqueRoomName(existingRooms: RoomSpec[], baseName: string): string {
  if (!baseName) return 'Area 1';
  
  const cleanBase = baseName.replace(/\s*\d+$/i, '').replace(/\s*\(Copy\)$/i, '').trim() || baseName.trim();
  const existingNames = new Set(existingRooms.map(r => (r.name || '').toLowerCase().trim()));

  // If base name isn't taken, return as is
  if (!existingNames.has(baseName.toLowerCase().trim())) {
    return baseName;
  }

  let counter = 1;
  let candidate = `${cleanBase} ${counter}`;
  while (existingNames.has(candidate.toLowerCase())) {
    counter++;
    candidate = `${cleanBase} ${counter}`;
  }
  return candidate;
}
