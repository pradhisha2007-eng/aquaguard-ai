/**
 * Registry of known (simulated) pipeline zones.
 * In a real deployment this would come from an asset-management API.
 */
export interface PipelineZone {
  pipelineId: string;
  zoneName: string;
  /** Rough x/y position used by the illustrative schematic layout. */
  x: number;
  y: number;
}

export const PIPELINE_ZONES: PipelineZone[] = [
  { pipelineId: "PL-A-001", zoneName: "Zone A - Main Street Line", x: 10, y: 20 },
  { pipelineId: "PL-B-002", zoneName: "Zone B - Riverside Junction", x: 35, y: 12 },
  { pipelineId: "PL-C-003", zoneName: "Zone C - Hillcrest Distribution", x: 62, y: 20 },
  { pipelineId: "PL-D-004", zoneName: "Zone D - Industrial Park Feed", x: 86, y: 34 },
  { pipelineId: "PL-E-005", zoneName: "Zone E - North Reservoir Link", x: 12, y: 55 },
  { pipelineId: "PL-F-006", zoneName: "Zone F - Old Town Pipeline", x: 38, y: 66 },
  { pipelineId: "PL-G-007", zoneName: "Zone G - Airport Road Line", x: 64, y: 58 },
  { pipelineId: "PL-H-008", zoneName: "Zone H - Suburb Heights Loop", x: 88, y: 74 },
];

/** Pipeline segments (pairs of zone ids) for the schematic diagram. */
export const PIPELINE_SEGMENTS: Array<[string, string]> = [
  ["PL-A-001", "PL-B-002"],
  ["PL-B-002", "PL-C-003"],
  ["PL-C-003", "PL-D-004"],
  ["PL-A-001", "PL-E-005"],
  ["PL-E-005", "PL-F-006"],
  ["PL-F-006", "PL-G-007"],
  ["PL-G-007", "PL-H-008"],
  ["PL-C-003", "PL-G-007"],
];

export const PIPELINE_ID_PATTERN = /^PL-[A-Z]-\d{3}$/;

export function findZone(pipelineId: string): PipelineZone | undefined {
  return PIPELINE_ZONES.find((z) => z.pipelineId === pipelineId.trim().toUpperCase());
}
