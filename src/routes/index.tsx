import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, STATUS_STYLE } from "@/components/StatusBadge";
import { DEMO_READINGS } from "@/lib/demoData";
import { predictLeakCondition, type LeakStatus } from "@/lib/leakDetectionEngine";
import { delay } from "@/lib/modelAdapter";
import { Activity, AlertTriangle, Gauge, PlayCircle, PlugZap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AquaGuard AI — Water Pipeline Leak Detection Dashboard" },
      {
        name: "description",
        content:
          "Prototype leak-detection dashboard classifying simulated pressure, flow, vibration and acoustic readings across eight pipeline zones.",
      },
      { property: "og:title", content: "AquaGuard AI — Water Pipeline Leak Detection Dashboard" },
      {
        property: "og:description",
        content:
          "Simulated pipeline zones classified as Normal, Minor, Moderate or Major leak — with explicit handling of missing, invalid and conflicting sensor data.",
      },
    ],
  }),
  component: Dashboard;
});

const LEAK_STATUSES: LeakStatus[] = ["Minor Leak", "Moderate Leak", "Major Leak"];
const ISSUE_STATUSES: LeakStatus[] = [
  "Sensor Failure",
  "Insufficient Data",
  "Invalid Data",
  "Conflicting Data",
];

function Dashboard() {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const results = useMemo(
    () => DEMO_READINGS.map((reading) => ({ reading, result: predictLeakCondition(reading) })),
    [],
  );

  const counts = useMemo(() => {
    const byStatus = new Map<LeakStatus, number>();
    for (const { result } of results) {
      byStatus.set(result.status, (byStatus.get(result.status) ?? 0) + 1);
    }
    return byStatus;
  }, [results]);

  const total = results.length;
  const normal = counts.get("Normal") ?? 0;
  const leaks = LEAK_STATUSES.reduce((sum, s) => sum + (counts.get(s) ?? 0), 0);
  const issues = ISSUE_STATUSES.reduce((sum, s) => sum + (counts.get(s) ?? 0), 0);

  const pieData = [...counts.entries()].map(([status, value]) => ({ name: status, value }));

  async function runDemoScenario() {
    setRunning(true);
    for (const { reading, result } of results) {
      setAnalyzing(reading.pipelineId);
      await delay(700);
      toast(`${reading.zoneName}: ${result.status}`, {
        description:
          result.confidence === null
            ? "Data-quality issue — no severity scored."
            : `Confidence ${result.confidence}%`,
      });
    }
    setAnalyzing(null);
    setRunning(false);
  }

  const summary = [
    { label: "Zones monitored", value: total, icon: Gauge, tone: "text-primary" },
    { label: "Zones normal", value: normal, icon: Activity, tone: "text-status-normal" },
    { label: "Leak alerts", value: leaks, icon: AlertTriangle, tone: "text-status-moderate" },
    { label: "Sensor / data issues", value: issues, icon: PlugZap, tone: "text-status-issue" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-3">
            Simulated Demo Dataset — prototype demonstration purposes only
          </Badge>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Pipeline condition <span className="text-gradient-aqua">overview</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Eight simulated pipeline zones scored from pressure, flow rate, vibration and acoustic
            readings. Data-quality problems are reported as their own outcome — never smoothed into
            a &quot;Normal&quot; result.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={runDemoScenario} disabled={running}>
            <PlayCircle className="h-4 w-4" aria-hidden />
            {running ? "Analyzing sensor data…" : "Run demo scenario"}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/test-reading">Test a reading</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-semibold">{card.value}</p>
              </div>
              <card.icon className={`h-8 w-8 ${card.tone}`} aria-hidden />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simulated demo zones</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a zone to open its full reading detail and simulated trend.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Pipeline ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map(({ reading, result }) => (
                    <TableRow
                      key={reading.pipelineId}
                      tabIndex={0}
                      role="link"
                      onClick={() =>
                        navigate({
                          to: "/zone/$pipelineId",
                          params: { pipelineId: reading.pipelineId },
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          navigate({
                            to: "/zone/$pipelineId",
                            params: { pipelineId: reading.pipelineId },
                          });
                      }}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{reading.zoneName}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {reading.pipelineId}
                      </TableCell>
                      <TableCell>
                        {analyzing === reading.pipelineId ? (
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Skeleton className="h-4 w-24" /> Analyzing…
                          </span>
                        ) : (
                          <StatusBadge status={result.status} />
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {result.confidence === null ? "N/A" : `${result.confidence}%`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Zones per classification.</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={`var(--color-status-${statusToken(entry.name as LeakStatus)})`}
                      />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1 text-xs">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <span className={STATUS_STYLE[d.name as LeakStatus].text}>{d.name}</span>
                  <span className="font-mono">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function statusToken(status: LeakStatus) {
  switch (status) {
    case "Normal":
      return "normal";
    case "Minor Leak":
      return "minor";
    case "Moderate Leak":
      return "moderate";
    case "Major Leak":
      return "major";
    default:
      return "issue";
  }
}
