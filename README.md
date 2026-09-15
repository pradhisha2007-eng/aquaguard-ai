# AquaGuard AI

# APP"A"THON — Water Pipeline Leak Detection

### Theme: "Code the Edge, Master the Exceptions"

---

## 1. BRIEF SOLUTION ARCHITECTURE

**Concept:** An AI-assisted Water Pipeline Leak Detection dashboard that ingests sensor readings (pressure, flow rate, vibration, acoustic) — either manually entered, uploaded as CSV, or pulled from a labeled demo dataset — and classifies pipeline condition into **Normal / Minor Leak / Moderate Leak / Major Leak**, while treating data-quality problems as first-class citizens rather than afterthoughts.

**High-level architecture:**

```

┌─────────────────────────────────────────────────────────────┐

│                        FRONTEND (Lovable)                    │

│  React + Tailwind + shadcn/ui + Recharts                     │

│                                                                │

│  ┌───────────┐ ┌───────────┐ ┌──────────────┐ ┌────────────┐ │

│  │ Dashboard │ │ Manual     │ │ Zone Map /   │ │ Edge Case  │ │

│  │  (Home)   │ │ Input Page │ │ Visualization│ │ Model Page │ │

│  └───────────┘ └───────────┘ └──────────────┘ └────────────┘ │

│                        │                                      │

│              ┌─────────▼─────────┐                            │

│              │  Validation Layer  │  ← sanitizes/flags input   │

│              └─────────┬─────────┘                            │

│                        │                                      │

│              ┌─────────▼─────────┐                            │

│              │ Rule-Based Engine  │  ← deterministic thresholds│

│              │ (ML-ready adapter) │  ← swappable for real model│

│              └─────────┬─────────┘                            │

│                        │                                      │

│              ┌─────────▼─────────┐                            │

│              │ Explanation Engine │  ← "why" reasoning text    │

│              └─────────┬─────────┘                            │

│                        │                                      │

│              ┌─────────▼─────────┐                            │

│              │ Recommendation     │  ← severity → action map   │

│              │ Engine             │                            │

│              └────────────────────┘                            │

└─────────────────────────────────────────────────────────────┘

```

**Why rule-based-first, ML-ready:** Hackathon time is short. A transparent, explainable threshold/statistical engine (z-score deviation + weighted scoring across 4 sensors) can be built and demoed reliably in hours. It's wrapped behind a single `predictLeak(sensorReading)` function/interface so a real ML model (e.g., an anomaly-detection model or a trained classifier via an API call) can be swapped in later without touching the UI — this is the "ML/AI-ready" seam.

**Data flow states to always account for:** empty → loading → validating → valid-result → error/invalid → insufficient-data → sensor-failure. Every screen must render something sensible for each state — never a blank screen, never a silent fallback to "Normal."

---

## 2. EDGE CASES IDENTIFIED (and how the system must respond)

| # | Edge Case | Required System Behavior |

|---|-----------|---------------------------|

| 1 | Missing sensor value (field absent) | Flag as "Incomplete Data," never default to 0 or "Normal" |

| 2 | Null value | Treat same as missing; show "Sensor data unavailable" |

| 3 | Empty input / empty form submit | Block submission, show inline validation error, no result generated |

| 4 | Negative values (pressure/flow/vibration/acoustic can't be negative) | Reject as "Invalid Reading," suggest sensor recalibration |

| 5 | Non-numeric values ("abc", "N/A", emojis) | Reject with type-validation error, do not attempt to coerce silently |

| 6 | Zero values from **all** sensors simultaneously | Do NOT report "No Leak" — flag as **"Possible Sensor Failure / Disconnection"** |

| 7 | Extremely high / out-of-range values (e.g., pressure > realistic max) | Flag as "Sensor Fault / Out-of-Range," exclude from confident classification |

| 8 | Duplicate sensor readings (same timestamp/zone submitted twice) | De-duplicate, warn user, use latest only |

| 9 | Malformed input (broken CSV row, wrong JSON shape) | Catch at parse layer, show row-level error, skip only that row, continue others |

| 10 | Incomplete input (e.g., 2 of 4 sensors present) | Mark as "Insufficient Data for Full Prediction," give partial/low-confidence read if possible |

| 11 | Conflicting sensor readings (e.g., flow=0 but acoustic=high) | Flag as "Conflicting Sensor Data," explain the conflict, request re-check |

| 12 | Sensor failure/disconnection status flag | Detect via zero/null/stale-timestamp pattern, show dedicated "Sensor Offline" state |

| 13 | Unknown pipeline zone ID | Reject with "Zone not recognized," list valid demo zones |

| 14 | Invalid pipeline ID (non-existent, wrong format) | Validation error before processing |

| 15 | Out-of-range values per sensor type | Per-sensor min/max bounds table, reject/flag outside bounds |

| 16 | Large-scale sensor data (bulk CSV upload, hundreds of rows) | Batch process with progress indicator, paginated results table |

| 17 | Insufficient data for prediction (too few readings/history) | Explicit message: "Not enough data to generate a reliable prediction" — never guess |

**Golden safety rules baked into every prediction path:**

- Invalid/missing data → never "Normal."

- All-zero sensors → "Possible Sensor Failure," not "No Leak."

- Insufficient data → explicit refusal message, not a guess.

- All data is clearly labeled **Simulated/Demo Data** — no claim of live/real-time sensors.

---

## 3. COMPLETE LOVABLE MASTER PROMPT

*(Copy everything below into Lovable exactly as-is)*

```

PROJECT NAME: AquaGuard AI — Water Pipeline Leak Detection System

CONTEXT:

Build a complete, working hackathon prototype web application for a hackathon

themed "Code the Edge, Master the Exceptions." The app is called "AquaGuard AI"

and solves the problem statement: "Water Pipeline Leak Detection." This is a

DEMO/PROTOTYPE application using SIMULATED sensor data — it must never claim

to show real, live, or real-time sensor readings anywhere in the UI. All

demo/simulated data must be clearly labeled with a "Simulated Data" badge.

PROBLEM DESCRIPTION (show this on an About/Home section):

Water utilities lose enormous volumes of treated water every year to

undetected pipeline leaks. AquaGuard AI is a prototype decision-support

dashboard that ingests pressure, flow rate, vibration, and acoustic sensor

readings from pipeline zones and classifies the likely condition as Normal,

Minor Leak, Moderate Leak, or Major Leak — while explicitly detecting and

explaining abnormal, missing, or corrupted sensor data instead of silently

guessing. It is built to be robust against messy, incomplete, and

adversarial real-world sensor data ("mastering the exceptions").

======================================================================

TECH STACK

======================================================================

- React + TypeScript

- Tailwind CSS + shadcn/ui components

- Recharts for charts/graphs

- Client-side state management (React state/context — no backend required

  for the hackathon demo; structure the code so an API/ML backend could be

  plugged in later)

- All "AI/ML" logic must live in a clearly separated module

  (e.g. /lib/leakDetectionEngine.ts) behind a single function:

      predictLeakCondition(reading: SensorReading): PredictionResult

  so it can be swapped for a real ML model/API later without touching UI code.

- NEVER hardcode or request any API keys in the UI. If an AI/model API call

  is simulated, mock it locally with a clearly commented placeholder function

  and a fallback path that always works even if that call "fails."

======================================================================

CORE DATA MODEL

======================================================================

SensorReading {

  pipelineId: string

  zoneName: string

  timestamp: string

  pressure: number | null      // valid range: 0 - 150 psi

  flowRate: number | null      // valid range: 0 - 500 L/min

  vibration: number | null     // valid range: 0 - 10 (g / arbitrary unit)

  acoustic: number | null      // valid range: 0 - 120 dB

}

PredictionResult {

  status: "Normal" | "Minor Leak" | "Moderate Leak" | "Major Leak"

        | "Sensor Failure" | "Insufficient Data" | "Invalid Data" | "Conflicting Data"

  confidence: number (0-100), null if not applicable

  affectedZone: string | "Unknown"

  reasoning: string[]           // human-readable "why" bullet points

  recommendedAction: string[]   // action list based on severity

  flags: string[]               // e.g. ["MISSING_VIBRATION", "OUT_OF_RANGE_PRESSURE"]

  isSimulated: true              // always true in this build

}

======================================================================

LEAK DETECTION LOGIC (rule-based engine — implement exactly this logic)

======================================================================

STEP 1 — VALIDATION (run before any classification):

  - If pipelineId is empty/missing/not in the known demo zone list → return

    "Invalid Data" with message "Pipeline ID not recognized."

  - For each of the 4 sensor fields:

      - If missing, null, undefined, empty string → flag "MISSING_<SENSOR>"

      - If non-numeric (fails Number() parse or is NaN) → flag "INVALID_TYPE_<SENSOR>"

      - If negative → flag "NEGATIVE_VALUE_<SENSOR>"

      - If outside realistic max bound (pressure>150, flowRate>500,

        vibration>10, acoustic>120) → flag "OUT_OF_RANGE_<SENSOR>"

  - If 2 or more sensor fields are missing/invalid → return "Insufficient Data"

    with message: "Not enough valid sensor data to generate a reliable

    prediction. At least 3 of 4 sensor readings are required."

  - If ANY single field is missing/invalid but 3 are present → proceed to

    classification using only valid fields, but mark result confidence as

    "Low" and explicitly list which sensor was excluded and why.

  - If duplicate readings detected (same pipelineId + timestamp submitted

    twice in one batch) → keep only the latest, show a non-blocking warning.

STEP 2 — SPECIAL CASES (checked after basic validation passes):

  - If pressure == 0 AND flowRate == 0 AND vibration == 0 AND acoustic == 0

    (all four are exactly zero) → return "Sensor Failure" with reasoning:

    "All sensors reporting zero simultaneously is physically implausible

    during normal operation and most likely indicates sensor disconnection

    or power failure, not the absence of a leak." Recommended action:

    "Dispatch technician to inspect sensor connectivity before assuming

    pipeline is leak-free."

  - Conflict check: if flowRate is very low (<5% of expected baseline) but

    acoustic reading is high (>70 dB) simultaneously → return

    "Conflicting Data": "Low flow with high acoustic signature is

    contradictory — recommend manual verification before acting."

STEP 3 — SEVERITY SCORING (only if data passed validation):

  Calculate a composite anomaly score (0-100) using weighted deviation from

  the zone's normal baseline (use baseline ranges below):

    Normal baseline (per zone, demo defaults):

      pressure: 60-90 psi | flowRate: 200-350 L/min

      vibration: 0-2 | acoustic: 30-50 dB

    score = (pressureDeviationWeight * 0.3)

          + (flowDeviationWeight * 0.3)

          + (vibrationDeviationWeight * 0.2)

          + (acousticDeviationWeight * 0.2)

    Deviation for each sensor = how far outside baseline range, normalized

    0-100 (e.g., 0 = within baseline, 100 = at/over the max out-of-range bound).

  Map final score to severity:

    0 - 20   → "Normal"

    21 - 45  → "Minor Leak"

    46 - 70  → "Moderate Leak"

    71 - 100 → "Major Leak"

  Confidence = 100 minus (10 points per missing/excluded sensor).

STEP 4 — REASONING (always generate 2-4 bullet points, e.g.):

  "Pressure dropped 22% below expected baseline for Zone B."

  "Acoustic reading of 78dB exceeds normal threshold (30-50dB), consistent

  with fluid escaping under pressure."

  "Flow rate reduced while acoustic signature increased — pattern consistent

  with a pipe joint leak."

STEP 5 — RECOMMENDED ACTIONS (by severity):

  Normal        → "Continue routine monitoring. No action required."

  Minor Leak    → "Schedule a non-urgent inspection within 7 days. Monitor

                   trend over next 24-48 hours."

  Moderate Leak → "Schedule inspection within 24 hours. Notify maintenance

                   team. Consider localized pressure test."

  Major Leak    → "URGENT: Dispatch emergency repair crew immediately.

                   Consider isolating/shutting off the affected zone valve."

  Sensor Failure→ "Dispatch technician to check sensor hardware/connectivity.

                   Do not assume pipeline is safe until sensors are restored."

  Insufficient/Invalid/Conflicting → "Resolve data quality issue before

                   relying on this reading for operational decisions."

======================================================================

DEMO / LOCAL DATASET (hardcode this exactly as sample data)

======================================================================

Create a local JSON array of 8-10 demo pipeline zones with realistic labeled

readings covering EVERY status type at least once, e.g.:

  - Zone A - Main Street Line       → Normal

  - Zone B - Riverside Junction     → Minor Leak

  - Zone C - Hillcrest Distribution → Moderate Leak

  - Zone D - Industrial Park Feed   → Major Leak

  - Zone E - North Reservoir Link   → Sensor Failure (all-zero demo case)

  - Zone F - Old Town Pipeline      → Insufficient Data (2 sensors missing)

  - Zone G - Airport Road Line      → Conflicting Data (low flow + high acoustic)

  - Zone H - Suburb Heights Loop    → Invalid Data (negative pressure demo)

Label this dataset clearly in the UI as "Simulated Demo Dataset — for

prototype demonstration purposes only."

======================================================================

PAGES REQUIRED

======================================================================

1. HOME / DASHBOARD PAGE

   - App name, theme tagline, "Simulated Data" badge always visible in header

   - Summary cards: Total Zones Monitored, Zones Normal, Zones with Leak

     Alerts, Zones with Sensor Issues (counts from demo dataset)

   - Table/grid of all demo pipeline zones with status badges (color-coded:

     green=Normal, yellow=Minor, orange=Moderate, red=Major, gray=Sensor

     Failure/Invalid/Insufficient)

   - "Run Demo Scenario" button that cycles through demo zones with a

     simulated 1-2 second "Analyzing sensor data..." loading state

   - Click any zone row → navigate to Zone Detail page

2. MANUAL SENSOR INPUT PAGE ("Test a Reading")

   - Form fields: Pipeline ID (dropdown of valid demo IDs + "Custom ID"

     option), Zone Name, Pressure, Flow Rate, Vibration, Acoustic

   - Each numeric field has inline validation (reject negative, non-numeric,

     out-of-range with helper text showing valid range)

   - "Leave blank to simulate missing sensor" helper text under each field

   - Buttons: "Run Detection," "Load Random Demo Reading," "Clear Form"

   - On submit: show loading spinner ("Validating input..." → "Analyzing

     sensor patterns...") then render the Result Card (see below)

   - If validation fails: show clear inline errors, do NOT submit

3. RESULT / PREDICTION PAGE (or expandable card on same page)

   - Large severity badge (Normal/Minor/Moderate/Major/Sensor

     Failure/Insufficient/Invalid/Conflicting) with color coding

   - Confidence percentage (or "N/A" with explanation if not applicable)

   - "Why this result?" reasoning section (bulleted, plain language)

   - "Recommended Action" section (bulleted, severity-appropriate)

   - "Flags Detected" chips (e.g., MISSING_VIBRATION, OUT_OF_RANGE_PRESSURE)

   - Mini chart comparing submitted values vs. baseline normal range

     (bar chart, Recharts)

   - "Simulated/Demo Prediction" disclaimer footer

4. PIPELINE ZONE MAP / VISUALIZATION PAGE

   - A simple visual layout (grid or simplified schematic diagram, SVG-based

     is fine — no real GIS/maps needed) showing demo Zones A-H as nodes/boxes

     connected by lines representing pipeline segments

   - Each zone node colored by current demo status

   - Clicking a node opens a side panel/modal with that zone's latest reading

     summary and a "View Full Detail" button

   - Clear label: "Illustrative pipeline layout — for demo purposes only"

5. BULK / CSV UPLOAD PAGE ("Batch Analysis")

   - File upload control (accept .csv)

   - On upload: parse client-side, show a progress bar for "large-scale" data

   - Render a results table (paginated if >10 rows) with per-row status,

     and a row-level error column for malformed/incomplete rows

   - Malformed rows are skipped from aggregate stats but listed separately

     under "Rows with Errors" with the specific reason per row

   - Empty state: "Upload a CSV to analyze multiple readings at once. Try

     our sample file." with a "Download Sample CSV" button (generate a

     sample CSV client-side matching the demo dataset)

6. EDGE CASE MODEL PAGE ("Exception Playground") — IMPORTANT, must exist

   - A dedicated page purpose-built to demonstrate "mastering the

     exceptions" for judges

   - Pre-built buttons, one per edge case, each pre-filling the input form

     / running the engine with that exact scenario and showing the result:

       "Missing Value" | "Null Value" | "Empty Input" | "Negative Values"

       | "Non-Numeric Input" | "All-Zero Sensors" | "Extremely High Values"

       | "Duplicate Readings" | "Malformed Input" | "Incomplete Input"

       | "Conflicting Readings" | "Sensor Disconnected" | "Unknown Zone"

       | "Invalid Pipeline ID" | "Out-of-Range Value" | "Large Batch (50 rows)"

       | "Insufficient Data"

   - Each button shows: the raw (bad) input used, the system's actual

     validation/handling behavior, and the safe output produced — this page

     is effectively a live test suite/demo for the judges, so make it visually

     clear ("Input:", "System Response:", "Why this is handled correctly:")

   - This page IS the test logic requirement — implement the actual

     validation functions for real (not just static text) so clicking each

     button really runs the engine against that bad input and shows the

     genuine result.

7. ABOUT / HOW IT WORKS PAGE

   - Problem statement, approach summary, architecture diagram (simple

     boxes: Input → Validation → Detection Engine → Explanation →

     Recommendation), tech stack badges, and a clear statement: "This is a

     hackathon prototype using simulated data. No real sensors are

     connected. Architecture is designed to be ML/API-ready for future

     integration."

======================================================================

USER FLOW

======================================================================

Landing → Dashboard (see overview + demo zones) → user either:

  (a) clicks a zone → Zone Detail/Result page, OR

  (b) goes to Manual Input → fills/loads a reading → Run Detection → Result, OR

  (c) goes to Batch Upload → uploads/loads sample CSV → Batch Results, OR

  (d) goes to Edge Case Model page → clicks scenario buttons → sees handling, OR

  (e) goes to Zone Map → clicks a node → side panel detail

All paths converge on the same Result display component for consistency.

======================================================================

UI / UX REQUIREMENTS

======================================================================

- Fully responsive (mobile, tablet, desktop) using Tailwind breakpoints

- Every button must be functional — no dead/placeholder buttons

- Loading states: skeleton loaders or spinners with short status text for

  every async-feeling action (detection run, CSV parse, page nav)

- Error states: clear, non-technical error messages with an icon, plus a

  "What went wrong" explanation and a way to retry/fix

- Empty states: every list/table/chart has a friendly empty state with a

  call-to-action (e.g., "No readings yet — try the demo dataset")

- Color coding consistent app-wide: green=Normal, yellow=Minor,

  orange=Moderate, red=Major, gray=Sensor/Data issues

- A persistent small badge/header strip reading "DEMO MODE — Simulated

  Data" visible on every page, at all times

- Use shadcn/ui cards, badges, tabs, tables, dialogs, and toasts for

  feedback (e.g., toast on successful CSV parse, toast on validation error)

- Charts (Recharts): 

    - Bar chart comparing a single reading's 4 sensor values vs. baseline

      range (on Result page)

    - Line/trend chart showing a simulated last-7-reading history per zone

      (on Zone Detail page) clearly labeled "Simulated historical trend"

    - Status distribution pie/donut chart on Dashboard (count of zones per

      status)

======================================================================

SAFETY / GUARDRAIL REQUIREMENTS (non-negotiable)

======================================================================

- NEVER classify missing, null, or invalid sensor data as "Normal"

- NEVER auto-classify all-zero sensor readings as "No Leak" — always route

  to "Sensor Failure" handling

- NEVER guess or fabricate a result when data is insufficient — always

  show the explicit "Insufficient Data" message

- NEVER display any text implying live/real-time/actual sensor hardware

  is connected — always label data as simulated/demo

- NEVER hardcode, request, or expose any API key or secret in the frontend

  code or UI

- Keep the detection logic in an isolated, swappable module so a real

  ML/AI model or backend API could replace it later with minimal changes

- If an "AI model call" is simulated/mocked, ALWAYS include a working

  fallback path (the rule-based engine) so the UI never breaks or shows

  a dead-end if that mock "fails" — demonstrate this fallback explicitly

  somewhere in the Edge Case Model page (e.g., a "Simulate AI Model

  Unavailable" button that shows graceful fallback to rule-based result)

======================================================================

DELIVERABLE

======================================================================

Build this as a complete, navigable, working multi-page React application

with all the pages, logic, validation, demo data, and states described

above. Prioritize making the Edge Case Model page and the core detection

engine fully functional and correct over polishing every visual detail —

but keep the UI clean, modern, and demo-ready using shadcn/ui + Tailwind.

```

---

**Quick build-order tip for the hackathon:** implement `leakDetectionEngine.ts` (Steps 1-5 above) and the demo dataset first — everything else (Dashboard, Zone Map, Edge Case page) is just different views into that one function. Get that function's unit-tested-by-hand correct first, and the rest of the app assembles fast around it.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f39dcb64-9716-4a0d-80ab-67397fc2d371).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
