import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How AquaGuard AI Works — Architecture & Approach" },
      {
        name: "description",
        content:
          "Architecture, rule-based detection logic and exception-handling approach behind the AquaGuard AI water pipeline leak detection prototype.",
      },
      { property: "og:title", content: "How AquaGuard AI Works — Architecture & Approach" },
      {
        property: "og:description",
        content:
          "Input, validation, detection engine, explanation and recommendation layers of the AquaGuard AI leak detection prototype.",
      },
    ],
  }),
  component: AboutPage,
});

const STACK = [
  "React 19",
  "TypeScript",
  "TanStack Router",
  "Tailwind CSS",
  "shadcn/ui",
  "Recharts",
  "Client-side state",
];

const GUARDRAILS = [
  "Missing, null or invalid sensor data is never classified as Normal.",
  "All-zero sensor readings always route to Sensor Failure, never to No Leak.",
  "Insufficient data returns an explicit refusal instead of a guess.",
  "No text anywhere implies live or real-time sensor hardware.",
  "No API keys or secrets exist in the frontend — the model call is a local mock.",
  "If the model adapter fails, the rule-based engine takes over so the UI never dead-ends.",
];

const PIPELINE_STEPS = [
  { title: "Input", body: "Manual form, CSV batch upload, or the simulated demo dataset." },
  { title: "Validation", body: "Type, range, null, duplicate and zone-identity checks." },
  { title: "Detection engine", body: "Weighted deviation scoring against per-zone baselines." },
  { title: "Explanation", body: "Plain-language reasoning for every conclusion." },
  { title: "Recommendation", body: "Severity-mapped operational action list." },
];

function AboutPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">How AquaGuard AI works</h1>
        <p className="mt-3 text-muted-foreground">
          Water utilities lose enormous volumes of treated water every year to undetected pipeline
          leaks. AquaGuard AI is a prototype decision-support dashboard that ingests pressure, flow
          rate, vibration and acoustic readings from pipeline zones and classifies the likely
          condition as Normal, Minor Leak, Moderate Leak or Major Leak — while explicitly detecting
          and explaining abnormal, missing or corrupted sensor data instead of silently guessing.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-1 items-center gap-3">
                <div className="flex-1 rounded-xl border bg-secondary/40 p-4">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{step.body}</p>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <ArrowRight
                    className="hidden h-4 w-4 shrink-0 text-muted-foreground lg:block"
                    aria-hidden
                  />
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            All detection logic sits in a single module behind{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              predictLeakCondition(reading)
            </code>
            . A real ML model or inference API can replace the mock adapter without touching any UI
            code — that is the ML-ready seam.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Safety guardrails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {GUARDRAILS.map((g) => (
                <li key={g} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {g}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Why rule-based first</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              A transparent threshold and deviation engine is explainable, testable by hand, and
              never fabricates a conclusion. Weighted scoring uses pressure 30%, flow rate 30%,
              vibration 20% and acoustic 20% of the composite anomaly score, mapped to Normal (0-20),
              Minor (21-45), Moderate (46-70) and Major (71-100).
            </p>
            <div className="flex flex-wrap gap-2">
              {STACK.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
            <p className="rounded-lg border bg-muted/50 p-3 text-xs">
              This is a hackathon prototype using simulated data. No real sensors are connected. The
              architecture is designed to be ML/API-ready for future integration.
            </p>
            <Button asChild>
              <Link to="/exceptions">See the exception playground</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
