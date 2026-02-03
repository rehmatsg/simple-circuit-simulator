# Simple Circuit Simulator

UI-agnostic TypeScript library for simulating electrical circuits using real circuit laws. v1 focuses on deterministic DC analysis for small circuits.

## Features (v1)
- JSON circuit import/export with schema versioning
- Circuit validation with structured diagnostics
- Component registry with canonical pin naming
- DC solver using Modified Nodal Analysis (MNA)
- Deterministic results with golden tests

## Usage
```ts
import { createDefaultRegistry, importCircuit, solveDC } from "./index.js";

const registry = createDefaultRegistry();

const doc = {
  schemaVersion: 1,
  sim: { mode: "dc" },
  groundNet: "GND",
  components: [
    { name: "B1", type: "battery", pins: { pos: "VCC", neg: "GND" }, props: { voltage: "9V" } },
    { name: "R1", type: "resistor", pins: { a: "VCC", b: "GND" }, props: { resistance: "1k" } }
  ]
};

const imported = importCircuit(doc, { registry });
if (!imported.ok) {
  console.error(imported.errors);
} else {
  const result = solveDC(imported.circuit, { registry });
  console.log(result.nodeVoltages, result.componentCurrents);
}
```

## Documentation
See `docs/README.md` for the full v1 documentation set.
