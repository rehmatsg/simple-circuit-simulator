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

CMOS NOT (expands to MOSFET stack):
- type: `cmos_not`
- pins: `in1`, `out`

CMOS NAND (expands to MOSFET stack):
- type: `cmos_nand`
- pins: `in1`, `in2`, `out`

CMOS NOR (expands to MOSFET stack):
- type: `cmos_nor`
- pins: `in1`, `in2`, `out`

CMOS AND (expands via NAND + NOT):
- type: `cmos_and`
- pins: `in1`, `in2`, `out`

CMOS OR (expands via NOR + NOT):
- type: `cmos_or`
- pins: `in1`, `in2`, `out`

CMOS XOR (expands via NAND network):
- type: `cmos_xor`
- pins: `in1`, `in2`, `out`

CMOS Half Adder (sum + carry):
- type: `cmos_half_adder`
- pins: `a`, `b`, `sum`, `carry`

CMOS Full Adder (sum + carry out):
- type: `cmos_full_adder`
- pins: `a`, `b`, `cin`, `sum`, `cout`

Capacitor:
- type: `capacitor`
- pins: `a`, `b`
- props:
  - `capacitance` number, unit farads (unitless allowed)

Inductor:
- type: `inductor`
- pins: `a`, `b`
- props:
  - `inductance` number, unit henries (unitless allowed)

MOSFET (NMOS):
- type: `mosfet_n`
- pins: `d`, `g`, `s`, optional `b`
- props (optional, defaults provided):
  - `vth` threshold voltage (volts)
  - `ron` on resistance (ohms)
  - `roff` off resistance (ohms)

MOSFET (PMOS):
- type: `mosfet_p`
- pins: `d`, `g`, `s`, optional `b`
- props (optional, defaults provided):
  - `vth` threshold voltage (volts)
  - `ron` on resistance (ohms)
  - `roff` off resistance (ohms)

Notes:
- Closed switch is modeled as a resistor with configurable `Ron` (default 1e-3).
- Open switch is treated as no connection.
- CMOS gate components (`cmos_*`) are expanded into MOSFET stacks via `expandCmosGates` before DC solving.
- MOSFET threshold uses `Vgb`/`Vbg` when a body pin is provided; otherwise `Vgs`/`Vsg`.
- Internal nets created by CMOS expansion use the `__int_` prefix (for visualization filtering).
- Expanded MOSFETs include `meta` fields: `gate`, `gateType`, `role`, `stack`, optional `stackIndex`.
