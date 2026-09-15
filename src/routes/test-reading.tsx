import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResultCard } from "@/components/ResultCard";
import { DEMO_READINGS } from "@/lib/demoData";
import { PIPELINE_ZONES, findZone } from "@/lib/pipelineZones";
import { SENSOR_KEYS, SENSOR_META, checkSensor, type SensorKey } from "@/lib/leakDetectionEngine";
import { runDetection, type DetectionOutcome } from "@/lib/modelAdapter";
import { AlertCircle, Dice5, Eraser, Play } from "lucide-react";

export const Route = createFileRoute("/test-reading")({
  head: () => ({
    meta: [
      { title: "Test a Sensor Reading — AquaGuard AI" },
      {
        name: "description",
        content:
          "Enter pressure, flow, vibration and acoustic values — or leave fields blank — and see how AquaGuard AI validates and classifies the reading.",
      },
      { property: "og:title", content: "Test a Sensor Reading — AquaGuard AI" },
      {
        property: "og:description",
        content:
          "Inline validation for negative, non-numeric, missing and out-of-range sensor values before any classification runs.",
      },
    ],
  }),
  component: TestReadingPage,
});

const CUSTOM = "__custom__";

type FormState = Record<SensorKey, string> & {
  pipelineId: string;
  customId: string;
  zoneName: string;
};

const EMPTY: FormState = {
  pipelineId: "",
  customId: "",
  zoneName: "",
  pressure: "",
  flowRate: "",
  vibration: "",
  acoustic: "",
};

function fieldError(key: SensorKey, value: string): string | null {
  if (value.trim() === "") return null; // blank = intentionally missing sensor
  const check = checkSensor(key, value);
  const meta = SENSOR_META[key];
  switch (check.issue) {
    case "INVALID_TYPE":
      return "Must be a number — text, symbols and “N/A” are rejected.";
    case "NEGATIVE_VALUE":
      return `${meta.label} cannot be negative. Sensor recalibration suggested.`;
    case "OUT_OF_RANGE":
      return `Above the realistic maximum of ${meta.hardMax} ${meta.unit} — sensor fault suspected.`;
    default:
      return null;
  }
}

function TestReadingPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "validating" | "analyzing">("idle");
  const [outcome, setOutcome] = useState<DetectionOutcome | null>(null);

  const effectiveId = form.pipelineId === CUSTOM ? form.customId : form.pipelineId;
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const errors = SENSOR_KEYS.reduce<Partial<Record<SensorKey, string | null>>>((acc, key) => {
    acc[key] = fieldError(key, form[key]);
    return acc;
  }, {});
  const hasFieldError = SENSOR_KEYS.some((k) => errors[k]);
  const allBlank = SENSOR_KEYS.every((k) => form[k].trim() === "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!effectiveId.trim()) {
      setFormError("Select or enter a Pipeline ID before running detection.");
      toast.error("Pipeline ID is required.");
      return;
    }
    if (allBlank) {
      setFormError(
        "Empty submission blocked: enter at least one sensor value. No result is generated from an empty form.",
      );
      toast.error("Nothing to analyse — the form is empty.");
      return;
    }
    if (hasFieldError) {
      setFormError("Fix the highlighted sensor fields — the reading was not submitted.");
      toast.error("Validation failed. Reading not submitted.");
      return;
    }

    setOutcome(null);
    setStage("validating");
    await new Promise((r) => setTimeout(r, 450));
    setStage("analyzing");
    const result = await runDetection({
      pipelineId: effectiveId.trim().toUpperCase(),
      zoneName: form.zoneName || findZone(effectiveId)?.zoneName || "",
      timestamp: new Date().toISOString(),
      pressure: form.pressure.trim() === "" ? null : form.pressure,
      flowRate: form.flowRate.trim() === "" ? null : form.flowRate,
      vibration: form.vibration.trim() === "" ? null : form.vibration,
      acoustic: form.acoustic.trim() === "" ? null : form.acoustic,
    });
    await new Promise((r) => setTimeout(r, 550));
    setStage("idle");
    setOutcome(result);
    toast.success(`Detection complete: ${result.status}`);
  }

  function loadRandom() {
    const pick = DEMO_READINGS[Math.floor(Math.random() * DEMO_READINGS.length)]!;
    setForm({
      pipelineId: pick.pipelineId,
      customId: "",
      zoneName: pick.zoneName,
      pressure: pick.pressure === null ? "" : String(pick.pressure),
      flowRate: pick.flowRate === null ? "" : String(pick.flowRate),
      vibration: pick.vibration === null ? "" : String(pick.vibration),
      acoustic: pick.acoustic === null ? "" : String(pick.acoustic),
    });
    setFormError(null);
    toast(`Loaded simulated reading for ${pick.zoneName}`);
  }

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Test a reading</h1>
        <p className="mt-3 text-muted-foreground">
          Submit a single simulated sensor reading. Fields are validated before anything is
          classified — leave a field blank to simulate a missing sensor.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Sensor input</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="pipelineId">Pipeline ID</Label>
                <Select
                  value={form.pipelineId}
                  onValueChange={(v) => set({ pipelineId: v, customId: "" })}
                >
                  <SelectTrigger id="pipelineId">
                    <SelectValue placeholder="Select a pipeline zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_ZONES.map((z) => (
                      <SelectItem key={z.pipelineId} value={z.pipelineId}>
                        {z.pipelineId} — {z.zoneName}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM}>Custom ID (test an unknown zone)</SelectItem>
                  </SelectContent>
                </Select>
                {form.pipelineId === CUSTOM && (
                  <Input
                    placeholder="e.g. PL-Z-999"
                    value={form.customId}
                    onChange={(e) => set({ customId: e.target.value })}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zoneName">Zone name (optional)</Label>
                <Input
                  id="zoneName"
                  value={form.zoneName}
                  onChange={(e) => set({ zoneName: e.target.value })}
                  placeholder="Auto-filled from the pipeline ID when known"
                />
              </div>

              {SENSOR_KEYS.map((key) => {
                const meta = SENSOR_META[key];
                const error = errors[key];
                return (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key}>
                      {meta.label} ({meta.unit})
                    </Label>
                    <Input
                      id={key}
                      inputMode="decimal"
                      value={form[key]}
                      aria-invalid={!!error}
                      onChange={(e) => set({ [key]: e.target.value } as Partial<FormState>)}
                      placeholder={`Valid range ${meta.hardMin}-${meta.hardMax}`}
                      className={error ? "border-destructive" : undefined}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Baseline {meta.baselineMin}-{meta.baselineMax} {meta.unit} · leave blank to
                      simulate a missing sensor
                    </p>
                    {error && (
                      <p className="flex items-start gap-1.5 text-[11px] text-destructive">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}

              {formError && (
                <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    <strong className="block">What went wrong</strong>
                    {formError}
                  </span>
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" disabled={stage !== "idle"}>
                  <Play className="h-4 w-4" aria-hidden />
                  {stage === "idle" ? "Run detection" : "Working…"}
                </Button>
                <Button type="button" variant="outline" onClick={loadRandom}>
                  <Dice5 className="h-4 w-4" aria-hidden /> Load random demo reading
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setForm(EMPTY);
                    setOutcome(null);
                    setFormError(null);
                  }}
                >
                  <Eraser className="h-4 w-4" aria-hidden /> Clear form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div>
          {stage !== "idle" ? (
            <Card>
              <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 pt-6 text-sm text-muted-foreground">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                {stage === "validating" ? "Validating input…" : "Analyzing sensor patterns…"}
              </CardContent>
            </Card>
          ) : outcome ? (
            <ResultCard
              result={outcome}
              modelFallbackUsed={outcome.modelFallbackUsed}
              modelError={outcome.modelError}
            />
          ) : (
            <Card>
              <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 pt-6 text-center text-sm text-muted-foreground">
                <p>No reading analysed yet.</p>
                <p className="max-w-sm text-xs">
                  Fill in the form or load a random simulated reading, then run detection to see the
                  classification, reasoning and recommended action.
                </p>
                <Button variant="outline" onClick={loadRandom}>
                  Load a demo reading
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
