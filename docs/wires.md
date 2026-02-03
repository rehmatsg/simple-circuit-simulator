# Wire Layout & Currents

Wires and junctions are optional UI layout data. They do not change the electrical solve.
They enable per-segment current values for canvas rendering.

## Data Model
- `junctions[]` define named points on a net.
- `wires[]` define directed segments between endpoints (pin or junction).

Each wire belongs to a net. Endpoints must reference pins or junctions on the same net.

## Currents
Use `computeWireCurrents(circuit, result)` to obtain:
- `wireCurrents[wireId]`: signed current for each wire segment
- optional `netFlowMagnitude[net]`: quick magnitude for net-level glow

**Sign convention:** positive current flows from `wire.from` → `wire.to`.

## Example
```json
{
  "schemaVersion": 1,
  "sim": { "mode": "dc" },
  "groundNet": "GND",
  "components": [
    { "name": "B1", "type": "battery", "pins": { "pos": "VCC", "neg": "GND" }, "props": { "voltage": "9V" } },
    { "name": "S1", "type": "switch", "pins": { "a": "VCC", "b": "N1" }, "props": { "state": "closed" } },
    { "name": "L1", "type": "bulb", "pins": { "a": "N1", "b": "GND" }, "props": { "resistance": "100" } }
  ],
  "junctions": [
    { "id": "J1", "net": "VCC" },
    { "id": "J2", "net": "N1" }
  ],
  "wires": [
    { "id": "W1", "net": "VCC", "from": { "kind": "pin", "component": "B1", "pin": "pos" }, "to": { "kind": "junction", "id": "J1" } },
    { "id": "W2", "net": "VCC", "from": { "kind": "junction", "id": "J1" }, "to": { "kind": "pin", "component": "S1", "pin": "a" } },
    { "id": "W3", "net": "N1",  "from": { "kind": "pin", "component": "S1", "pin": "b" }, "to": { "kind": "junction", "id": "J2" } },
    { "id": "W4", "net": "N1",  "from": { "kind": "junction", "id": "J2" }, "to": { "kind": "pin", "component": "L1", "pin": "a" } },
    { "id": "W5", "net": "GND", "from": { "kind": "pin", "component": "L1", "pin": "b" }, "to": { "kind": "pin", "component": "B1", "pin": "neg" } }
  ]
}
```

## UI Usage Snippet
```ts
const result = solveDC(circuit, { registry });
const wires = computeWireCurrents(circuit, result);

if (wires.errors.length === 0) {
  const current = wires.wireCurrents["W1"] ?? 0;
  const isFlowing = Math.abs(current) > 1e-6;
}
```
