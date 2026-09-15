/**
 * SIMULATED DEMO DATASET — prototype demonstration purposes only.
 * No real sensors are connected.
 */
import type { RawSensorReading } from "./leakDetectionEngine";
import { PIPELINE_ZONES } from "./pipelineZones";

export interface DemoReading extends RawSensorReading {
  pipelineId: string;
  zoneName: string;
  timestamp: string;
  expectedLabel: string;
}

const ts = (offsetMin: number) =>
  new Date(Date.UTC(2026, 8, 15, 6, 0) - offsetMin * 60000).toISOString();

export const DEMO_READINGS: DemoReading[] = [
  {
    pipelineId: "PL-A-001",
    zoneName: "Zone A - Main Street Line",
    timestamp: ts(4),
    pressure: 75,
    flowRate: 280,
    vibration: 1.2,
    acoustic: 42,
    expectedLabel: "Normal",
  },
  {
    pipelineId: "PL-B-002",
    zoneName: "Zone B - Riverside Junction",
    timestamp: ts(8),
    pressure: 40,
    flowRate: 120,
    vibration: 4,
    acoustic: 75,
    expectedLabel: "Minor Leak",
  },
  {
    pipelineId: "PL-C-003",
    zoneName: "Zone C - Hillcrest Distribution",
    timestamp: ts(12),
    pressure: 25,
    flowRate: 70,
    vibration: 6,
    acoustic: 90,
    expectedLabel: "Moderate Leak",
  },
  {
    pipelineId: "PL-D-004",
    zoneName: "Zone D - Industrial Park Feed",
    timestamp: ts(16),
    pressure: 8,
    flowRate: 25,
    vibration: 8.5,
    acoustic: 110,
    expectedLabel: "Major Leak",
  },
  {
    pipelineId: "PL-E-005",
    zoneName: "Zone E - North Reservoir Link",
    timestamp: ts(20),
    pressure: 0,
    flowRate: 0,
    vibration: 0,
    acoustic: 0,
    expectedLabel: "Sensor Failure",
  },
  {
    pipelineId: "PL-F-006",
    zoneName: "Zone F - Old Town Pipeline",
    timestamp: ts(24),
    pressure: 72,
    flowRate: null,
    vibration: null,
    acoustic: 44,
    expectedLabel: "Insufficient Data",
  },
  {
    pipelineId: "PL-G-007",
    zoneName: "Zone G - Airport Road Line",
    timestamp: ts(28),
    pressure: 70,
    flowRate: 10,
    vibration: 1,
    acoustic: 82,
    expectedLabel: "Conflicting Data",
  },
  {
    pipelineId: "PL-H-008",
    zoneName: "Zone H - Suburb Heights Loop",
    timestamp: ts(32),
    pressure: -12,
    flowRate: 260,
    vibration: 1.4,
    acoustic: 47,
    expectedLabel: "Invalid Data",
  },
];

export function getDemoReading(pipelineId: string): DemoReading | undefined {
  return DEMO_READINGS.find((r) => r.pipelineId === pipelineId);
}

/** Deterministic pseudo-random simulated 7-reading history for a zone. */
export function simulatedHistory(pipelineId: string) {
  const current = getDemoReading(pipelineId);
  const seedBase = pipelineId.charCodeAt(3) || 65;
  const num = (v: unknown, fallback: number) => (typeof v === "number" && v >= 0 ? v : fallback);
  const p = num(current?.pressure, 70);
  const f = num(current?.flowRate, 270);
  const v = num(current?.vibration, 1);
  const a = num(current?.acoustic, 40);

  return Array.from({ length: 7 }, (_, i) => {
    const wobble = Math.sin((seedBase + i) * 1.7) * 0.08;
    const drift = (i - 6) / 6; // older readings closer to baseline
    return {
      label: `T-${6 - i}`,
      pressure: +(p + (70 - p) * -drift * 0.6 + p * wobble).toFixed(1),
      flowRate: +(f + (270 - f) * -drift * 0.6 + f * wobble).toFixed(0),
      vibration: +Math.max(0, v + (1 - v) * -drift * 0.6 + v * wobble).toFixed(2),
      acoustic: +(a + (40 - a) * -drift * 0.6 + a * wobble).toFixed(1),
    };
  });
}

export const CSV_HEADER = "pipelineId,zoneName,timestamp,pressure,flowRate,vibration,acoustic";

export function buildSampleCsv(): string {
  const rows = DEMO_READINGS.map((r) =>
    [
      r.pipelineId,
      `"${r.zoneName}"`,
      r.timestamp,
      r.pressure ?? "",
      r.flowRate ?? "",
      r.vibration ?? "",
      r.acoustic ?? "",
    ].join(","),
  );
  // Deliberately messy rows so the batch parser's error handling is visible.
  rows.push(`PL-C-003,"Zone C - Hillcrest Distribution",${ts(12)},25,70,6,90`); // duplicate
  rows.push(`PL-Z-999,"Unknown Zone",${ts(40)},70,250,1,45`); // unknown zone
  rows.push(`PL-A-001,"Zone A - Main Street Line",${ts(44)},abc,250,1,45`); // non-numeric
  rows.push(`PL-B-002,"Zone B - Riverside Junction",${ts(48)},70,250`); // malformed / short row
  return [CSV_HEADER, ...rows].join("\n");
}

/** Generates a large simulated batch for the "Large Batch" edge case. */
export function generateLargeBatch(count = 50): RawSensorReading[] {
  return Array.from({ length: count }, (_, i) => {
    const zone = PIPELINE_ZONES[i % PIPELINE_ZONES.length]!;
    const wob = Math.sin(i * 2.3);
    const broken = i % 11 === 0;
    return {
      pipelineId: broken && i > 0 ? "PL-X-777" : zone.pipelineId,
      zoneName: zone.zoneName,
      timestamp: ts(60 + i),
      pressure: +(70 + wob * 45).toFixed(1),
      flowRate: i % 7 === 3 ? null : +(260 + wob * 180).toFixed(0),
      vibration: +Math.abs(1.5 + wob * 4).toFixed(2),
      acoustic: +(45 + Math.abs(wob) * 55).toFixed(1),
    };
  });
}
