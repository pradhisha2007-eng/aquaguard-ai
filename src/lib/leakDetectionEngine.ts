/**
 * AquaGuard AI — leak detection engine (rule-based, ML-ready).
 *
 * ALL detection logic lives here behind `predictLeakCondition(reading)`.
 * A real ML model / backend API can replace `runModelAdapter` (see
 * ./modelAdapter.ts) without touching any UI code.
 *
 * Safety rules baked in:
 *  - missing / invalid data is NEVER classified as "Normal"
 *  - all-zero sensors are NEVER "No Leak" -> "Sensor Failure"
 *  - insufficient data returns an explicit refusal, never a guess
 */
import { PIPELINE_ID_PATTERN, findZone } from "./pipelineZones";

export type SensorKey = "pressure" | "flowRate" | "vibration" | "acoustic";

export type LeakStatus =
  | "Normal"
  | "Minor Leak"
  | "Moderate Leak"
  | "Major Leak"
  | "Sensor Failure"
  | "Insufficient Data"
  | "Invalid Data"
  | "Conflicting Data";

export interface SensorReading {
  pipelineId: string;
  zoneName: string;
  timestamp: string;
  pressure: number | null;
  flowRate: number | null;
  vibration: number | null;
  acoustic: number | null;
}

/** Untrusted shape: anything can arrive here (form input, CSV cell, JSON). */
export interface RawSensorReading {
  pipelineId?: unknown;
  zoneName?: unknown;
  timestamp?: unknown;
  pressure?: unknown;
  flowRate?: unknown;
  vibration?: unknown;
  acoustic?: unknown;
}

export interface PredictionResult {
  status: LeakStatus;
  /** 0-100, or null when a confident score is not applicable. */
  confidence: number | null;
  score: number | null;
  affectedZone: string;
  pipelineId: string;
  reasoning: string[];
  recommendedAction: string[];
  flags: string[];
  /** Per-sensor values actually used (null = excluded/unavailable). */
  values: Record<SensorKey, number | null>;
  /** How the result was produced — mock model vs. rule-based fallback. */
  source: "rule-engine" | "model-adapter" | "rule-engine (model fallback)";
  isSimulated: true;
}

export interface SensorMeta {
  key: SensorKey;
  label: string;
  unit: string;
  baselineMin: number;
  baselineMax: number;
  hardMin: number;
  hardMax: number;
}

export const SENSOR_META: Record<SensorKey, SensorMeta> = {
  pressure: {
    key: "pressure",
    label: "Pressure",
    unit: "psi",
    baselineMin: 60,
    baselineMax: 90,
    hardMin: 0,
    hardMax: 150,
  },
  flowRate: {
    key: "flowRate",
    label: "Flow Rate",
    unit: "L/min",
    baselineMin: 200,
    baselineMax: 350,
    hardMin: 0,
    hardMax: 500,
  },
  vibration: {
    key: "vibration",
    label: "Vibration",
    unit: "g",
    baselineMin: 0,
    baselineMax: 2,
    hardMin: 0,
    hardMax: 10,
  },
  acoustic: {
    key: "acoustic",
    label: "Acoustic",
    unit: "dB",
    baselineMin: 30,
    baselineMax: 50,
    hardMin: 0,
    hardMax: 120,
  },
};

export const SENSOR_KEYS: SensorKey[] = ["pressure", "flowRate", "vibration", "acoustic"];

const WEIGHTS: Record<SensorKey, number> = {
  pressure: 0.3,
  flowRate: 0.3,
  vibration: 0.2,
  acoustic: 0.2,
};

const FLAG_SUFFIX: Record<SensorKey, string> = {
  pressure: "PRESSURE",
  flowRate: "FLOW_RATE",
  vibration: "VIBRATION",
  acoustic: "ACOUSTIC",
};

type SensorIssue = "MISSING" | "INVALID_TYPE" | "NEGATIVE_VALUE" | "OUT_OF_RANGE";

interface SensorCheck {
  value: number | null;
  issue: SensorIssue | null;
  raw: unknown;
}

/** Validates a single raw sensor cell. Never coerces silently. */
export function checkSensor(key: SensorKey, raw: unknown): SensorCheck {
  const meta = SENSOR_META[key];

  if (raw === null || raw === undefined) return { value: null, issue: "MISSING", raw };
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "" || /^(n\/?a|null|undefined|nan|-)$/i.test(trimmed)) {
      return { value: null, issue: trimmed === "" ? "MISSING" : "INVALID_TYPE", raw };
    }
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return { value: null, issue: "INVALID_TYPE", raw };
    const parsed = Number(trimmed);
    return classifyNumber(key, parsed, raw);
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { value: null, issue: "INVALID_TYPE", raw };
    return classifyNumber(key, raw, raw);
  }
  return { value: null, issue: "INVALID_TYPE", raw };

  function classifyNumber(k: SensorKey, n: number, original: unknown): SensorCheck {
    if (n < 0) return { value: n, issue: "NEGATIVE_VALUE", raw: original };
    if (n > meta.hardMax) return { value: n, issue: "OUT_OF_RANGE", raw: original };
    return { value: n, issue: null, raw: original };
  }
}

/** Normalised 0-100 distance outside the zone baseline range. */
export function deviationScore(key: SensorKey, value: number): number {
  const { baselineMin, baselineMax, hardMax } = SENSOR_META[key];
  if (value >= baselineMin && value <= baselineMax) return 0;
  if (value < baselineMin) {
    const span = baselineMin - SENSOR_META[key].hardMin || 1;
    return Math.min(100, ((baselineMin - value) / span) * 100);
  }
  const span = hardMax - baselineMax || 1;
  return Math.min(100, ((value - baselineMax) / span) * 100);
}

function statusFromScore(score: number): LeakStatus {
  if (score <= 20) return "Normal";
  if (score <= 45) return "Minor Leak";
  if (score <= 70) return "Moderate Leak";
  return "Major Leak";
}

export const RECOMMENDED_ACTIONS: Record<LeakStatus, string[]> = {
  Normal: ["Continue routine monitoring. No action required."],
  "Minor Leak": [
    "Schedule a non-urgent inspection within 7 days.",
    "Monitor the trend over the next 24-48 hours.",
  ],
  "Moderate Leak": [
    "Schedule inspection within 24 hours.",
    "Notify the maintenance team.",
    "Consider a localized pressure test.",
  ],
  "Major Leak": [
    "URGENT: Dispatch emergency repair crew immediately.",
    "Consider isolating / shutting off the affected zone valve.",
  ],
  "Sensor Failure": [
    "Dispatch a technician to check sensor hardware and connectivity.",
    "Do not assume the pipeline is safe until sensors are restored.",
  ],
  "Insufficient Data": [
    "Resolve the data quality issue before relying on this reading for operational decisions.",
  ],
  "Invalid Data": [
    "Resolve the data quality issue before relying on this reading for operational decisions.",
  ],
  "Conflicting Data": [
    "Resolve the data quality issue before relying on this reading for operational decisions.",
    "Request a manual field verification of the affected zone.",
  ],
};

const emptyValues = (): Record<SensorKey, number | null> => ({
  pressure: null,
  flowRate: null,
  vibration: null,
  acoustic: null,
});

function issueSentence(key: SensorKey, issue: SensorIssue, raw: unknown): string {
  const meta = SENSOR_META[key];
  const shown = raw === null || raw === undefined || raw === "" ? "(blank)" : String(raw);
  switch (issue) {
    case "MISSING":
      return `${meta.label} sensor data unavailable — the value was missing or null, so it was excluded instead of being treated as 0.`;
    case "INVALID_TYPE":
      return `${meta.label} received a non-numeric value "${shown}" — rejected rather than silently coerced.`;
    case "NEGATIVE_VALUE":
      return `${meta.label} reported ${shown} ${meta.unit}, which is physically impossible. Sensor recalibration is suggested.`;
    case "OUT_OF_RANGE":
      return `${meta.label} reported ${shown} ${meta.unit}, outside the realistic range of ${meta.hardMin}-${meta.hardMax} ${meta.unit} (sensor fault suspected).`;
  }
}

/**
 * MAIN ENTRY POINT — swap this body for an ML model call and keep the shape.
 */
export function predictLeakCondition(raw: RawSensorReading): PredictionResult {
  const pipelineIdRaw = typeof raw.pipelineId === "string" ? raw.pipelineId.trim() : "";
  const zone = pipelineIdRaw ? findZone(pipelineIdRaw) : undefined;
  const zoneNameRaw = typeof raw.zoneName === "string" ? raw.zoneName.trim() : "";
  const affectedZone = zone?.zoneName || zoneNameRaw || "Unknown";

  const base = {
    pipelineId: pipelineIdRaw || "Unknown",
    affectedZone,
    values: emptyValues(),
    source: "rule-engine" as const,
    isSimulated: true as const,
    score: null,
  };

  // STEP 1a — pipeline / zone identity validation
  if (!pipelineIdRaw) {
    return {
      ...base,
      status: "Invalid Data",
      confidence: null,
      reasoning: [
        "Pipeline ID not recognized: no pipeline identifier was supplied with this reading.",
        "A reading cannot be attributed to a zone without a valid pipeline ID, so no classification was attempted.",
      ],
      recommendedAction: RECOMMENDED_ACTIONS["Invalid Data"],
      flags: ["MISSING_PIPELINE_ID"],
    };
  }
  if (!PIPELINE_ID_PATTERN.test(pipelineIdRaw.toUpperCase())) {
    return {
      ...base,
      status: "Invalid Data",
      confidence: null,
      reasoning: [
        `Pipeline ID "${pipelineIdRaw}" does not match the required format PL-<LETTER>-<3 digits> (e.g. PL-A-001).`,
        "Validation ran before any processing, so no prediction was generated.",
      ],
      recommendedAction: RECOMMENDED_ACTIONS["Invalid Data"],
      flags: ["INVALID_PIPELINE_ID_FORMAT"],
    };
  }
  if (!zone) {
    return {
      ...base,
      status: "Invalid Data",
      confidence: null,
      reasoning: [
        `Pipeline ID not recognized: "${pipelineIdRaw}" is not a known pipeline zone.`,
        "Zone could not be resolved, so the reading was rejected instead of being scored against an assumed baseline.",
      ],
      recommendedAction: RECOMMENDED_ACTIONS["Invalid Data"],
      flags: ["UNKNOWN_ZONE"],
    };
  }

  // STEP 1b — per-sensor validation
  const checks = SENSOR_KEYS.map((key) => ({ key, ...checkSensor(key, raw[key]) }));
  const flags: string[] = [];
  const problems: string[] = [];
  const values = emptyValues();

  for (const c of checks) {
    if (c.issue) {
      flags.push(`${c.issue}_${FLAG_SUFFIX[c.key]}`);
      problems.push(issueSentence(c.key, c.issue, c.raw));
    } else {
      values[c.key] = c.value;
    }
  }

  const valid = checks.filter((c) => !c.issue);
  const invalidCount = checks.length - valid.length;
  const allBlank = checks.every((c) => c.issue === "MISSING");

  if (allBlank) {
    return {
      ...base,
      status: "Invalid Data",
      confidence: null,
      reasoning: [
        "No sensor values were supplied at all — an empty reading cannot be classified.",
        "The system refuses empty submissions rather than defaulting to a 'Normal' result.",
      ],
      recommendedAction: RECOMMENDED_ACTIONS["Invalid Data"],
      flags: flags.length ? flags : ["EMPTY_INPUT"],
      values,
      affectedZone: zone.zoneName,
    };
  }

  // Hard-invalid readings (negative / non-numeric / out-of-range) are surfaced
  // as Invalid Data when they dominate, never smoothed over.
  const hardInvalid = checks.filter(
    (c) => c.issue === "NEGATIVE_VALUE" || c.issue === "INVALID_TYPE",
  );
  if (hardInvalid.length > 0 && invalidCount >= 1 && valid.length < 3) {
    return {
      ...base,
      status: "Invalid Data",
      confidence: null,
      reasoning: [
        ...problems,
        "Because the reading contains values that cannot be trusted, it was rejected instead of being classified as Normal.",
      ],
      recommendedAction: RECOMMENDED_ACTIONS["Invalid Data"],
      flags,
      values,
      affectedZone: zone.zoneName,
    };
  }
  if (hardInvalid.length > 0 && valid.length >= 3) {
    return {
      ...base,
      status: "Invalid Data",
      confidence: null,
      reasoning: [
        ...problems,
        "An impossible or non-numeric sensor value invalidates this reading; a partial score is not reported to avoid a misleading conclusion.",
      ],
      recommendedAction: RECOMMENDED_ACTIONS["Invalid Data"],
      flags,
      values,
      affectedZone: zone.zoneName,
    };
  }

  if (invalidCount >= 2) {
    return {
      ...base,
      status: "Insufficient Data",
      confidence: null,
      reasoning: [
        "Not enough valid sensor data to generate a reliable prediction. At least 3 of 4 sensor readings are required.",
        ...problems,
      ],
      recommendedAction: RECOMMENDED_ACTIONS["Insufficient Data"],
      flags,
      values,
      affectedZone: zone.zoneName,
    };
  }

  // STEP 2 — special cases
  const allZero = valid.length === 4 && valid.every((c) => c.value === 0);
  if (allZero) {
    return {
      ...base,
      status: "Sensor Failure",
      confidence: null,
      reasoning: [
        "All four sensors are reporting exactly zero simultaneously, which is physically implausible during normal operation.",
        "This pattern most likely indicates sensor disconnection or power failure — not the absence of a leak.",
      ],
      recommendedAction: RECOMMENDED_ACTIONS["Sensor Failure"],
      flags: [...flags, "ALL_SENSORS_ZERO", "SENSOR_DISCONNECTION_SUSPECTED"],
      values,
      affectedZone: zone.zoneName,
    };
  }

  const flow = values.flowRate;
  const acoustic = values.acoustic;
  const flowFloor = SENSOR_META.flowRate.baselineMax * 0.05; // 5% of expected baseline
  if (flow !== null && acoustic !== null && flow < flowFloor && acoustic > 70) {
    return {
      ...base,
      status: "Conflicting Data",
      confidence: null,
      reasoning: [
        `Flow rate of ${flow} L/min is below 5% of the expected baseline while the acoustic sensor reports ${acoustic} dB.`,
        "Low flow with a high acoustic signature is contradictory — a genuine leak normally still moves water past the sensor.",
        "Recommend manual verification before acting on this reading.",
      ],
      recommendedAction: RECOMMENDED_ACTIONS["Conflicting Data"],
      flags: [...flags, "CONFLICTING_FLOW_ACOUSTIC"],
      values,
      affectedZone: zone.zoneName,
    };
  }

  // STEP 3 — weighted severity scoring across valid sensors only
  let weighted = 0;
  let weightSum = 0;
  const deviations: Partial<Record<SensorKey, number>> = {};
  for (const c of valid) {
    const dev = deviationScore(c.key, c.value as number);
    deviations[c.key] = dev;
    weighted += dev * WEIGHTS[c.key];
    weightSum += WEIGHTS[c.key];
  }
  const score = weightSum > 0 ? Math.round(weighted / weightSum) : 0;
  const status = statusFromScore(score);
  const confidence = Math.max(0, 100 - invalidCount * 10);

  // STEP 4 — reasoning
  const reasoning: string[] = [...problems];
  for (const c of valid) {
    const meta = SENSOR_META[c.key];
    const v = c.value as number;
    const dev = deviations[c.key] ?? 0;
    if (dev === 0) continue;
    if (v < meta.baselineMin) {
      const pct = Math.round(((meta.baselineMin - v) / meta.baselineMin) * 100);
      reasoning.push(
        `${meta.label} of ${v} ${meta.unit} is ${pct}% below the expected baseline (${meta.baselineMin}-${meta.baselineMax} ${meta.unit}) for ${zone.zoneName}.`,
      );
    } else {
      reasoning.push(
        `${meta.label} of ${v} ${meta.unit} exceeds the normal range (${meta.baselineMin}-${meta.baselineMax} ${meta.unit}).`,
      );
    }
  }
  if (
    values.flowRate !== null &&
    values.acoustic !== null &&
    values.flowRate < SENSOR_META.flowRate.baselineMin &&
    values.acoustic > SENSOR_META.acoustic.baselineMax
  ) {
    reasoning.push(
      "Flow rate reduced while the acoustic signature increased — a pattern consistent with fluid escaping at a pipe joint.",
    );
  }
  if (status === "Normal" && reasoning.length === 0) {
    reasoning.push(
      "All available sensor readings sit inside their expected baseline ranges for this zone.",
      `Composite anomaly score of ${score}/100 falls in the Normal band (0-20).`,
    );
  } else {
    reasoning.push(`Composite weighted anomaly score: ${score}/100 → ${status}.`);
  }
  if (invalidCount === 1) {
    reasoning.push(
      "Confidence reduced because one sensor was excluded from scoring; treat this as a low-confidence read.",
    );
  }

  return {
    ...base,
    status,
    confidence,
    score,
    reasoning: reasoning.slice(0, 5),
    recommendedAction: RECOMMENDED_ACTIONS[status],
    flags,
    values,
    affectedZone: zone.zoneName,
  };
}

/** De-duplicates a batch on pipelineId + timestamp, keeping the LATEST row. */
export function dedupeReadings<T extends RawSensorReading>(
  rows: T[],
): { rows: T[]; duplicates: number } {
  const seen = new Map<string, number>();
  rows.forEach((row, i) => {
    const key = `${String(row.pipelineId ?? "")}|${String(row.timestamp ?? "")}`;
    seen.set(key, i);
  });
  const keep = new Set(seen.values());
  return {
    rows: rows.filter((_, i) => keep.has(i)),
    duplicates: rows.length - keep.size,
  };
}
