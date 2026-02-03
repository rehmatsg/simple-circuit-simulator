# DC Solver (v1)

Method:
- Modified Nodal Analysis (MNA)
- Dense matrix solve with partial pivoting

Supported elements:
- Resistor between nodes `a` and `b`
- Voltage source between `pos` and `neg`
- Switch modeled as open or low-resistance (Ron)

Reference node:
- `groundNet` is mapped to node voltage 0.
- If the ground net has no terminals, the solver reports `floating_reference`.

Outputs:
- Node voltages relative to ground
- Component currents
- Component power
- Structured errors and warnings

Warnings:
- `short_circuit_suspected` is emitted when component current exceeds a threshold.

Limitations:
- Linear DC only (no capacitors, inductors, or nonlinear devices in v1).
- Dense solver is used; no sparse optimization yet.
