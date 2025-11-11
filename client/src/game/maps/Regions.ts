import { REGION_PROGRESSION, TRACK_LENGTH_METERS } from '@sperm-odyssey/shared';

export interface RegionSegment {
  id: string;
  start: number;
  end: number;
  label: string;
}

export const REGION_SEGMENTS: RegionSegment[] = REGION_PROGRESSION.map((id, index) => {
  const segmentLength = TRACK_LENGTH_METERS / REGION_PROGRESSION.length;
  return {
    id,
    start: index * segmentLength,
    end: (index + 1) * segmentLength,
    label: id.replace(/(^|-)\w/g, (m) => m.toUpperCase()),
  };
});
