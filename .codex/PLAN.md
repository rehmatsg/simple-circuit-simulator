# CMOS Transistor Stacks Roadmap

High-level overview:
Build a teaching-first CMOS transistor stack system on top of the existing circuit simulator. This starts with a switch-level MOSFET model (threshold + Ron/Roff), then introduces CMOS gate stacks (NOT/NAND/NOR), then composes higher-level gates for adder/ALU teaching, and finally adds visualization metadata. The plan is scoped to stay deterministic and avoid full SPICE complexity.

## Phase 1 — MOSFET Core Model (DC, Switch-Level)
Overview: Add minimal MOSFET models that behave like voltage-controlled switches so we can assemble CMOS gate stacks.

Deliverables:
- New components `mosfet_n` and `mosfet_p` with pins `d`, `g`, `s`, optional `b`.
- Params: `vth`, `ron`, `roff` with defaults tuned for teaching.
- Voltage-controlled switch behavior:
  - NMOS on when `Vgs > vth`.
  - PMOS on when `Vsg > vth` (or `Vgs < -vth`).
- MNA stamping for MOSFETs as resistive branches (Ron/Roff).
- Validation rules for pin names and parameter parsing.
- Documentation updates for MOSFETs and pin conventions.

Tests:
- MOSFET on/off behavior with gate tied to VDD/GND.
- Threshold edge cases.
- Determinism of solver outputs.

## Phase 2 — CMOS Gate Stack Builder
Overview: Implement canonical CMOS transistor stacks for NOT/NAND/NOR using real MOSFET networks.

Deliverables:
- Gate expansion templates producing transistor subcircuits.
- Inverter, NAND, NOR stacks.
- Export expanded circuits for inspection and UI rendering.

Tests:
- Truth tables for NOT/NAND/NOR derived from transistor networks.
- Netlist expansion counts and expected node connections.

## Phase 3 — Gate Compositions for Teaching
Overview: Build XOR, AND, OR, and multi-bit adders from CMOS stacks.

Deliverables:
- Composite gates built from NAND/NOR/inverters.
- Half-adder and full-adder CMOS networks.
- Example circuits for teaching with expected outputs.

Tests:
- Truth tables for XOR/AND/OR.
- Half-adder and full-adder correctness.

## Phase 4 — Visualization Metadata
Overview: Add structure and metadata to support visualization of pull-up/pull-down networks.

Deliverables:
- Annotated subcircuits (role tags, gate name, internal nodes).
- Net labeling conventions (VDD/GND/internal).

Tests:
- Metadata validation and deterministic ordering.

## Phase 5 — Optional Physical Upgrade
Overview: Optionally improve MOSFET modeling while keeping determinism.

Deliverables:
- Simple IV MOSFET model (Shichman-Hodges) in DC.
- Body effect and threshold adjustments.

Tests:
- Transfer curves and monotonicity checks.
- Convergence and determinism.

## Todo
- [ ] Phase 1: Add MOSFET components and parameters.
- [ ] Phase 1: Implement switch-level stamping for MOSFETs.
- [ ] Phase 1: Add MOSFET validation + tests.
- [ ] Phase 1: Document MOSFETs and pin conventions.
- [ ] Phase 2: Build CMOS NOT/NAND/NOR stacks.
- [ ] Phase 2: Add truth-table tests from transistor networks.
- [ ] Phase 3: Build XOR/AND/OR + adders.
- [ ] Phase 3: Add half/full-adder tests.
- [ ] Phase 4: Add visualization metadata.
- [ ] Phase 5: Optional IV MOSFET model.
