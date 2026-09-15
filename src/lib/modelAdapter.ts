/**
 * ML-ready seam.
 *
 * `runDetection` is what the UI calls. Today it "calls" a mocked model
 * adapter (placeholder for a future ML model / backend API) and ALWAYS
 * falls back to the deterministic rule-based engine if that call fails.
 * No API keys are used or required anywhere.
 */
import {
  predictLeakCondition,
  type PredictionResult,
  type RawSensorReading,
} from "./leakDetectionEngine";

let simulateModelOutage = false;

export function setSimulatedModelOutage(value: boolean) {
  simulateModelOutage = value;
}

export function isModelOutageSimulated() {
  return simulateModelOutage;
}

/** PLACEHOLDER: replace with a real fetch() to an ML inference endpoint. */
async function callMockModel(_reading: RawSensorReading): Promise<PredictionResult> {
  if (simulateModelOutage) throw new Error("Model service unavailable (simulated)");
  throw new Error("No model configured");
}

export interface DetectionOutcome extends PredictionResult {
  modelFallbackUsed: boolean;
  modelError: string | null;
}

export async function runDetection(reading: RawSensorReading): Promise<DetectionOutcome> {
  try {
    const modelResult = await callMockModel(reading);
    return { ...modelResult, source: "model-adapter", modelFallbackUsed: false, modelError: null };
  } catch (error) {
    const fallback = predictLeakCondition(reading);
    return {
      ...fallback,
      source: "rule-engine (model fallback)",
      modelFallbackUsed: true,
      modelError: error instanceof Error ? error.message : "Unknown model error",
    };
  }
}

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
