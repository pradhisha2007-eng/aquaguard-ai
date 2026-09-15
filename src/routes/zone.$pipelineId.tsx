import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultCard } from "@/components/ResultCard";
import { getDemoReading, simulatedHistory } from "@/lib/demoData";
import { predictLeakCondition } from "@/lib/leakDetectionEngine";
import { ArrowLeft, SearchX } from "lucide-react";

export const Route = createFileRoute("/zone/$pipelineId")({
  head: () => ({
    meta: [
      { title: "Zone Detail — AquaGuard AI Pipeline Reading" },
      {
        name: "description",
        content:
          "Full simulated sensor reading, classification reasoning and trend history for a single AquaGuard AI pipeline zone.",
      },
      { property: "og:title", content: "Zone Detail — AquaGuard AI Pipeline Reading" },
      {
        property: "og:description",
        content:
          "Classification, reasoning, recommended action and simulated 7-reading trend for one pipeline zone.",
      },
    ],
  }),
  component: ZoneDetail,
});

function ZoneDetail() {
  const { pipelineId } = Route.useParams();
  const reading = getDemoReading(pipelineId);
  const result = useMemo(() => (reading ? predictLeakCondition(reading) : null), [reading]);
  const history = useMemo(() => simulatedHistory(pipelineId), [pipelineId]);

  if (!reading || !result) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CardContent className="space-y-4 pt-8">
          <SearchX className="mx-auto h-10 w-10 text-status-issue" aria-hidden />
          <h1 className="text-xl font-semibold">Zone not recognised</h1>
          <p className="text-sm text-muted-foreground">
            No demo zone matches <span className="font-mono">{pipelineId}</span>. Pick a zone from
            the dashboard to see its reading.
          </p>
          <Button asChild>
            <Link to="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Reading timestamp (simulated): {new Date(reading.timestamp).toLocaleString()}
        </p>
      </div>

      <ResultCard result={result} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Simulated historical trend</CardTitle>
          <p className="text-sm text-muted-foreground">
            Last 7 synthetic readings for this zone — illustrative only, generated locally.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pressure"
                  name="Pressure (psi)"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="flowRate"
                  name="Flow rate (L/min)"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="acoustic"
                  name="Acoustic (dB)"
                  stroke="var(--color-chart-4)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="vibration"
                  name="Vibration (g)"
                  stroke="var(--color-chart-3)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
