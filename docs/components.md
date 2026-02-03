# Supported Components (v1)

Each component has canonical pin names. Pin validation errors list valid pins.

Battery:
- type: `battery`
- pins: `pos`, `neg`
- props:
  - `voltage` number, unit volts (unitless allowed)

Current Source:
- type: `current_source`
- pins: `pos`, `neg`
- props:
  - `current` number, unit amps (unitless allowed)

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

Diode:
- type: `diode`
- pins: `anode`, `cathode`
- props (optional, defaults provided):
  - `is` saturation current (amps)
  - `n` emission coefficient (unitless)
  - `vt` thermal voltage (volts)

LED:
- type: `led`
- pins: `anode`, `cathode`
- props (optional, defaults provided):
  - `is` saturation current (amps)
  - `n` emission coefficient (unitless)
  - `vt` thermal voltage (volts)

Gate AND:
- type: `gate_and`
- pins: `in1`, `in2`, `out`

Gate OR:
- type: `gate_or`
- pins: `in1`, `in2`, `out`

Gate NOT:
- type: `gate_not`
- pins: `in1`, `out`

Notes:
- Closed switch is modeled as a resistor with configurable `Ron` (default 1e-3).
- Open switch is treated as no connection.
