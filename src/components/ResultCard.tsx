import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, STATUS_STYLE } from "@/components/StatusBadge";
import { SENSOR_KEYS, SENSOR_META, type PredictionResult } from "@/lib/leakDetectionEngine";
import { Info, Lightbulb, ListChecks, Wrench } from "lucide-react";

/** Shared result display used by every path in the app (single source of truth). */
export function ResultCard({
  result,
  modelFallbackUsed,
  modelError,
}: {
  result: PredictionResult;
  modelFallbackUsed?: boolean;
  modelError?: string | null;
}) {
  const chartData = SENSOR_KEYS.map((key) => {
    const meta = SENSOR_META[key];
    const value = result.values[key];
    // Normalise each sensor to a % of its own hard max so one chart fits all 4.
    const pct = value === null ? null : Math.min(100, (value / meta.hardMax) * 100);
    return {
      name: meta.label,
      submitted: pct,
      baselineLow: (meta.baselineMin / meta.hardMax) * 100,
      baselineHigh: (meta.baselineMax / meta.hardMax) * 100,
      raw: value,
      unit: meta.unit,
      inBaseline: value !== null && value >= meta.baselineMin && value <= meta.baselineMax,
    };
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4 border-b bg-secondary/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Prediction result
            </p>
            <CardTitle className="mt-1 text-lg">{result.affectedZone}</CardTitle>
            <p className="font-mono text-xs text-muted-foreground">{result.pipelineId}</p>
          </div>
          <StatusBadge status={result.status} size="lg" />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Confidence: </span>
            <span className={`font-semibold ${STATUS_STYLE[result.status].text}`}>
              {result.confidence === null ? "N/A" : `${result.confidence}%`}
            </span>
            {result.confidence === null && (
              <span className="ml-1 text-xs text-muted-foreground">
                (not applicable — data quality issue, no severity was scored)
              </span>
            )}
          </div>
          {result.score !== null && (
            <div>
              <span className="text-muted-foreground">Anomaly score: </span>
              <span className="font-semibold">{result.score}/100</span>
            </div>
          )}
          <Badge variant="outline" className="font-mono text-[11px]">
            engine: {result.source}
          </Badge>
        </div>
        {modelFallbackUsed && (
          <p className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            AI model adapter unavailable{modelError ? ` (${modelError})` : ""} — the deterministic
            rule-based engine produced this result instead. The app never dead-ends on a model
            failure.
          </p>
        )}
      </CardHeader>

      <CardContent className="grid gap-6 pt-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-primary" aria-hidden /> Why this result?
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {result.reasoning.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Wrench className="h-4 w-4 text-primary" aria-hidden /> Recommended action
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {result.recommendedAction.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-foreground/50" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-primary" aria-hidden /> Flags detected
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.flags.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  No data-quality flags raised for this reading.
                </span>
              ) : (
                result.flags.map((flag) => (
                  <Badge key={flag} variant="secondary" className="font-mono text-[11px]">
                    {flag}
                  </Badge>
                ))
              )}
            </div>
          </section>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Submitted values vs. baseline range</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Each sensor is shown as a percentage of its own valid range. The pale band marks the
            normal baseline.
          </p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={-28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip
                  formatter={(value, name, entry) => {
                    if (name === "Reading") {
                      const p = entry.payload as (typeof chartData)[number];
                      return [`${p.raw ?? "unavailable"} ${p.unit}`, "Reading"];
                    }
                    return [`${Math.round(Number(value))}% of range`, String(name)];
                  }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="baselineHigh"
                  name="Baseline max"
                  fill="var(--color-baseline)"
                  radius={[6, 6, 0, 0]}
                />
                <Bar dataKey="submitted" name="Reading" radius={[6, 6, 0, 0]} barSize={18}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.submitted === null
                          ? "var(--color-muted)"
                          : entry.inBaseline
                            ? "var(--color-status-normal)"
                            : "var(--color-status-major)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {SENSOR_KEYS.map((key) => (
              <div key={key} className="flex justify-between">
                <span>{SENSOR_META[key].label}</span>
                <span className="font-mono">
                  {result.values[key] === null
                    ? "unavailable / excluded"
                    : `${result.values[key]} ${SENSOR_META[key].unit}`}{" "}
                  · baseline {SENSOR_META[key].baselineMin}-{SENSOR_META[key].baselineMax}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <div className="border-t bg-muted/40 px-6 py-3 text-xs text-muted-foreground">
        Simulated / demo prediction — generated from synthetic sensor values by a rule-based
        prototype engine. No real sensors are connected.
      </div>
    </Card>
  );
}
