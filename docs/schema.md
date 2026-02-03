# Circuit JSON Schema (v1)

All circuits are represented as a single JSON document. The library accepts and emits this format.

Required fields:
- `schemaVersion: number`
- `sim: { mode: "dc" | "transient" | "digital" | "hybrid" }`
- `groundNet: string`
- `components: Component[]`

Optional fields:
- `title?: string`
- `params?: Record<string, number | string | boolean>`
- `meta?: Record<string, string>`
- `junctions?: Junction[]` optional UI wire junctions
- `wires?: Wire[]` optional wire segments for UI

Component:
- `name: string` unique within the circuit
- `type: string` registered component type
- `pins: Record<string, string>` pin name to net name
- `props?: Record<string, ValueExpr>` component properties
- `model?: string` future model identifier
- `meta?: Record<string, string>` optional metadata (visualization, annotations)

Junction:
- `id: string` unique junction identifier
- `net: string` net name this junction belongs to
- `meta?: Record<string, string>` optional UI metadata (position, labels)

Wire:
- `id: string` unique wire identifier
- `net: string` net name this wire belongs to
- `from: WireEndpoint`
- `to: WireEndpoint`
- `meta?: Record<string, string>` optional UI metadata (path, selection id)

WireEndpoint:
- `{ kind: "pin", component: string, pin: string }`
- `{ kind: "junction", id: string }`

ValueExpr:
- number, e.g. `1000`
- engineering string, e.g. `"1k"`, `"2.2u"`, `"9V"`
- parameter reference, e.g. `"$R_BULB"`

Example:
```json
{
  "schemaVersion": 1,
  "sim": { "mode": "dc" },
  "groundNet": "GND",
  "components": [
    {
      "name": "B1",
      "type": "battery",
      "pins": { "pos": "VCC", "neg": "GND" },
      "props": { "voltage": "9V" }
    },
    {
      "name": "R1",
      "type": "resistor",
      "pins": { "a": "VCC", "b": "GND" },
      "props": { "resistance": "1k" }
    }
  ]
}
```

Versioning and migration:
- `schemaVersion` must be numeric.
- v1 migrates from v0 by copying fields and updating the version.
- Unsupported versions return an error.
