import { getPreference, savePreference } from '@/services/storageService';

const POSITIONS_KEY = 'player:positions';

export const RESUME_THRESHOLD_SECONDS = 15;
export const NEAR_END_FRACTION = 0.95;

export interface StoredPosition {
  position: number;
  duration: number;
  updatedAt: number;
}

export type PositionsMap = Record<string, StoredPosition>;

export async function readPositions(): Promise<PositionsMap> {
  const raw = await getPreference(POSITIONS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function writePositions(map: PositionsMap): Promise<void> {
  await savePreference(POSITIONS_KEY, JSON.stringify(map));
}

export async function getAllPositions(): Promise<PositionsMap> {
  return readPositions();
}

export async function deletePosition(contentId: string): Promise<void> {
  const map = await readPositions();
  if (map[contentId]) {
    delete map[contentId];
    await writePositions(map);
  }
}
