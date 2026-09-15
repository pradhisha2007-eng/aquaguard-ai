import type { LeakStatus } from "@/lib/leakDetectionEngine";
import { cn } from "@/lib/utils";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  PlugZap,
  ShieldAlert,
  Ban,
} from "lucide-react";

export const STATUS_STYLE: Record<
  LeakStatus,
  { chip: string; dot: string; text: string; icon: typeof CheckCircle2 }
> = {
  Normal: {
    chip: "bg-status-normal/12 text-status-normal border-status-normal/30",
    dot: "bg-status-normal",
    text: "text-status-normal",
    icon: CheckCircle2,
  },
  "Minor Leak": {
    chip: "bg-status-minor/15 text-status-minor border-status-minor/40",
    dot: "bg-status-minor",
    text: "text-status-minor",
    icon: AlertTriangle,
  },
  "Moderate Leak": {
    chip: "bg-status-moderate/15 text-status-moderate border-status-moderate/40",
    dot: "bg-status-moderate",
    text: "text-status-moderate",
    icon: ShieldAlert,
  },
  "Major Leak": {
    chip: "bg-status-major/12 text-status-major border-status-major/35",
    dot: "bg-status-major",
    text: "text-status-major",
    icon: AlertOctagon,
  },
  "Sensor Failure": {
    chip: "bg-status-issue/12 text-status-issue border-status-issue/30",
    dot: "bg-status-issue",
    text: "text-status-issue",
    icon: PlugZap,
  },
  "Insufficient Data": {
    chip: "bg-status-issue/12 text-status-issue border-status-issue/30",
    dot: "bg-status-issue",
    text: "text-status-issue",
    icon: HelpCircle,
  },
  "Invalid Data": {
    chip: "bg-status-issue/12 text-status-issue border-status-issue/30",
    dot: "bg-status-issue",
    text: "text-status-issue",
    icon: Ban,
  },
  "Conflicting Data": {
    chip: "bg-status-issue/12 text-status-issue border-status-issue/30",
    dot: "bg-status-issue",
    text: "text-status-issue",
    icon: AlertTriangle,
  },
};

export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: LeakStatus;
  size?: "sm" | "lg";
  className?: string;
}) {
  const style = STATUS_STYLE[status];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium",
        style.chip,
        size === "lg" ? "px-4 py-2 text-base" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <Icon className={size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5"} aria-hidden />
      {status}
    </span>
  );
}
