import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import { DEMO_READINGS, getDemoReading } from "@/lib/demoData";
import { PIPELINE_SEGMENTS, PIPELINE_ZONES } from "@/lib/pipelineZones";
import {
  SENSOR_KEYS,
  SENSOR_META,
  predictLeakCondition,
  type LeakStatus,
} from "@/lib/leakDetectionEngine";

export const Route = createFileRoute("/zone-map")({
  head: () => ({
    meta: [
      { title: "Pipeline Zone Map — AquaGuard AI" },
      {
        name: "description",
        content:
          "Illustrative schematic of eight simulated pipeline zones, colour-coded by leak severity and sensor data quality.",
      },
      { property: "og:title", content: "Pipeline Zone Map — AquaGuard AI" },
      {
        property: "og:description",
        content:
          "Click any node in the illustrative pipeline layout to inspect that zone's latest simulated reading.",
      },
    ],
  }),
  component: ZoneMapPage,
});

function token(status: LeakStatus) {
  switch (status) {
    case "Normal":
      return "var(--color-status-normal)";
    case "Minor Leak":
      return "var(--color-status-minor)";
    case "Moderate Leak":
      return "var(--color-status-moderate)";
    case "Major Leak":
      return "var(--color-status-major)";
    default:
      return "var(--color-status-issue)";
  }
}

function ZoneMapPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const statuses = useMemo(() => {
    const map = new Map<string, LeakStatus>();
    for (const reading of DEMO_READINGS) {
      map.set(reading.pipelineId, predictLeakCondition(reading).status);
    }
    return map;
  }, []);

  const selectedReading = selected ? getDemoReading(selected) : undefined;
  const selectedResult = selectedReading ? predictLeakCondition(selectedReading) : null;

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Pipeline zone map</h1>
        <p className="mt-3 text-muted-foreground">
          Illustrative pipeline layout — for demo purposes only. No GIS or real network topology is
          used. Select a node to inspect its latest simulated reading.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Schematic network view</CardTitle>
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            {(
              [
                ["Normal", "normal"],
                ["Minor", "minor"],
                ["Moderate", "moderate"],
                ["Major", "major"],
                ["Data / sensor issue", "issue"],
              ] as const
            ).map(([label, key]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: `var(--color-status-${key})` }}
                />
                {label}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <svg viewBox="0 0 100 90" className="h-[26rem] w-full" role="img" aria-label="Illustrative pipeline schematic">
            {PIPELINE_SEGMENTS.map(([from, to]) => {
              const a = PIPELINE_ZONES.find((z) => z.pipelineId === from);
              const b = PIPELINE_ZONES.find((z) => z.pipelineId === to);
              if (!a || !b) return null;
              return (
                <line
                  key={`${from}-${to}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--color-border)"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              );
            })}
            {PIPELINE_ZONES.map((zone) => {
              const status = statuses.get(zone.pipelineId) ?? "Insufficient Data";
              const isActive = selected === zone.pipelineId;
              return (
                <g
                  key={zone.pipelineId}
                  className="cursor-pointer"
                  onClick={() => setSelected(zone.pipelineId)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${zone.zoneName}: ${status}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSelected(zone.pipelineId);
                  }}
                >
                  <circle
                    cx={zone.x}
                    cy={zone.y}
                    r={isActive ? 4.6 : 3.6}
                    fill={token(status)}
                    stroke="var(--color-surface)"
                    strokeWidth={1}
                  />
                  <text
                    x={zone.x}
                    y={zone.y + 8}
                    textAnchor="middle"
                    style={{ fontSize: 2.6, fill: "var(--color-muted-foreground)" }}
                  >
                    {zone.pipelineId}
                  </text>
                  <text
                    x={zone.x}
                    y={zone.y + 11.4}
                    textAnchor="middle"
                    style={{ fontSize: 2.3, fill: "var(--color-foreground)" }}
                  >
                    {zone.zoneName.replace(/^Zone \w+ - /, "")}
                  </text>
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selectedReading && selectedResult && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedReading.zoneName}</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <StatusBadge status={selectedResult.status} size="lg" />
                <p className="font-mono text-xs text-muted-foreground">
                  {selectedReading.pipelineId} · simulated reading{" "}
                  {new Date(selectedReading.timestamp).toLocaleString()}
                </p>
                <div className="space-y-1.5 text-sm">
                  {SENSOR_KEYS.map((key) => (
                    <div key={key} className="flex justify-between border-b py-1.5">
                      <span className="text-muted-foreground">{SENSOR_META[key].label}</span>
                      <span className="font-mono">
                        {selectedResult.values[key] === null
                          ? "unavailable"
                          : `${selectedResult.values[key]} ${SENSOR_META[key].unit}`}
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold">Why this result?</p>
                  <ul className="mt-1.5 space-y-1.5 text-xs text-muted-foreground">
                    {selectedResult.reasoning.slice(0, 3).map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
                <Button asChild className="w-full">
                  <Link to="/zone/$pipelineId" params={{ pipelineId: selectedReading.pipelineId }}>
                    View full detail
                  </Link>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
