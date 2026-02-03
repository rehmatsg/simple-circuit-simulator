# Simple Circuit Simulator

UI-agnostic TypeScript library for simulating electrical circuits using real circuit laws. The focus is deterministic DC analysis, a stable JSON data model, and extensibility for future transient and nonlinear support.

## Features
- JSON circuit import/export with schema versioning
- Circuit validation with structured diagnostics
- Component registry with canonical pin naming
- DC solver using Modified Nodal Analysis (MNA)
- Nonlinear elements (diode/LED) and MOSFET switch-level modeling
- CMOS gate stacks with expansion (NOT/NAND/NOR) and composite logic (AND/OR/XOR/adders)
- Deterministic results with golden tests
- LLM-friendly Zod schema and prompt templates
- Optional wire layout with per-segment current computation

## Installation
This repo is intended for local development and embedding:
```
npm install
```

## Quick Start
```ts
import {
  createDefaultRegistry,
  importCircuit,
  solveDC,
  expandCmosGates,
} from "./index.js";

const registry = createDefaultRegistry();

const doc = {
  schemaVersion: 1,
  sim: { mode: "dc" },
  groundNet: "GND",
  components: [
    { name: "B1", type: "battery", pins: { pos: "VDD", neg: "GND" }, props: { voltage: "5V" } },
    { name: "INV1", type: "cmos_not", pins: { in1: "A", out: "Y" } },
  ],
};

const expanded = expandCmosGates(doc);
const imported = importCircuit(expanded, { registry });
if (!imported.ok) {
  console.error(imported.errors);
} else {
  const result = solveDC(imported.circuit, { registry });
  console.log(result.nodeVoltages, result.componentCurrents);
}
```

## Wire Currents (Optional)
If you provide `wires` and `junctions` in the JSON, you can compute per-segment currents:
```ts
import { computeWireCurrents } from "./index.js";

const wireResult = computeWireCurrents(imported.circuit, result);
console.log(wireResult.wireCurrents);
```

## LLM Authoring Support
We provide a Zod schema and prompt templates to help LLMs emit valid circuit JSON:
- `CircuitDocumentSchema` in `src/llm/schema.ts`
- Prompts in `src/llm/prompts.ts`
- Guide in `docs/llm.md`

## CMOS Logic Notes
- Use `cmos_*` components for transistor-level logic in `dc` mode.
- Run `expandCmosGates` to convert CMOS gates into MOSFET stacks before DC solving.
- Internal expansion nets use the `__int_` prefix for easy filtering in UI layers.

## Documentation
See `docs/README.md` for the full v1 documentation set.

## Development
- `npm run lint` — TypeScript type check
- `npm run build` — compile to `dist/`
- `npm test` — run unit + golden tests
