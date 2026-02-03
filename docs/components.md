# Supported Components (v1)

Each component has canonical pin names. Pin validation errors list valid pins.

Battery:
- type: `battery`
- pins: `pos`, `neg`
- props:
  - `voltage` number, unit volts (unitless allowed)

Resistor:
- type: `resistor`
- pins: `a`, `b`
- props:
  - `resistance` number, unit ohms (unitless allowed)

Bulb (resistor model):
- type: `bulb`
- pins: `a`, `b`
- props:
  - `resistance` number, unit ohms (unitless allowed)

Switch:
- type: `switch`
- pins: `a`, `b`
- props:
  - `state` enum: `open` or `closed`

Notes:
- Closed switch is modeled as a resistor with configurable `Ron` (default 1e-3).
- Open switch is treated as no connection.
