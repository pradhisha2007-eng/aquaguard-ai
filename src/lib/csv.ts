import type { RawSensorReading } from "./leakDetectionEngine";
import { CSV_HEADER } from "./demoData";

export interface CsvRowError {
  rowNumber: number;
  raw: string;
  reason: string;
}

export interface CsvParseResult {
  rows: Array<RawSensorReading & { rowNumber: number }>;
  errors: CsvRowError[];
}

const EXPECTED = CSV_HEADER.split(",");

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Parses a CSV client-side. Malformed rows are skipped individually. */
export function parseSensorCsv(text: string): CsvParseResult {
  const rows: CsvParseResult["rows"] = [];
  const errors: CsvRowError[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");

  if (lines.length === 0) {
    return { rows, errors: [{ rowNumber: 0, raw: "", reason: "The file is empty." }] };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.includes("pipelineid");
  if (!hasHeader) {
    return {
      rows,
      errors: [
        {
          rowNumber: 1,
          raw: lines[0],
          reason: `Header row not recognised. Expected columns: ${EXPECTED.join(", ")}.`,
        },
      ],
    };
  }
  const index = (name: string) => header.indexOf(name.toLowerCase());

  lines.slice(1).forEach((line, i) => {
    const rowNumber = i + 2;
    const cells = splitCsvLine(line);
    if (cells.length < 4) {
      errors.push({
        rowNumber,
        raw: line,
        reason: `Malformed row — expected ${EXPECTED.length} columns, found ${cells.length}. Row skipped, remaining rows still processed.`,
      });
      return;
    }
    const cell = (name: string) => {
      const idx = index(name);
      return idx >= 0 ? cells[idx] : undefined;
    };
    rows.push({
      rowNumber,
      pipelineId: cell("pipelineId") ?? "",
      zoneName: cell("zoneName") ?? "",
      timestamp: cell("timestamp") ?? "",
      pressure: cell("pressure"),
      flowRate: cell("flowRate"),
      vibration: cell("vibration"),
      acoustic: cell("acoustic"),
    });
  });

  return { rows, errors };
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
