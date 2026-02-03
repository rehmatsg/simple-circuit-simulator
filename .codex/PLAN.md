# Roadmap Plan (v2+)

High-level overview:
This plan takes the existing v1 DC solver and expands the library into a broader circuit simulator that supports current sources, nonlinear devices (diodes/LEDs), basic digital mode, and transient analysis with capacitors/inductors. It also strengthens diagnostics, performance, and developer ergonomics. The work is split into five phases with explicit deliverables and test expectations.

## Phase 1 — v2 Core Extensions (Current Source + Registry Enhancements)
Overview: Extend the component registry and netlist/solver interfaces to support a current source and prepare for nonlinear components without breaking v1.

Deliverables:
- Add `current_source` component type with canonical pins `pos`, `neg`.
- Extend component registry prop definitions for current sources.
- Update netlist element types to include `current_source`.
- MNA stamping support for current sources.
- Update validation to cover current source props and pins.
- Update docs: components, schema, cookbook example.

Tests:
- Unit tests for current source validation.
- Netlist builder tests for current source elements.
- Solver tests for circuits with current sources (e.g., current source into resistor to ground).
- Golden test for current source behavior.

## Phase 2 — Nonlinear Devices (Diode/LED v2)
Overview: Introduce nonlinear devices with a solver loop (Newton-Raphson) and update result formatting for nonlinear iterations.

Deliverables:
- Add `diode` and `led` components with `anode`, `cathode` pins.
- Implement nonlinear stamping interface and Newton-Raphson solver.
- Add convergence controls (max iterations, tolerance).
- Add device models (Shockley parameters, LED forward voltage defaults).
- Add diagnostics for non-convergence.

Tests:
- Unit tests for diode value parsing and validation.
- Solver tests for diode I-V curve in a simple circuit.
- Nonlinear convergence tests (success + fail cases).
- Golden tests for diode/LED forward bias examples.

## Phase 3 — Digital Mode v2
Overview: Add a basic digital simulation mode with truth-table evaluation for gates, plus hybrid expansion hooks.

Deliverables:
- Add `gate_*` component types (e.g., `gate_and`, `gate_or`, `gate_not`).
- Implement digital solver with tick-based evaluation.
- Define pin conventions (`in1`, `in2`, `out`, optional `vcc`, `gnd`).
- Add mode handling in simulation API for `digital`.
- Add optional expansion hook to map gates to subcircuits.

Tests:
- Unit tests for gate truth tables.
- Digital solver tests for combinational circuits.
- Validation tests for missing gate pins.
- Golden tests for simple logic chains.

## Phase 4 — Transient Solver v3 (Capacitors/Inductors)
Overview: Add time-domain simulation with capacitors and inductors using time stepping.

Deliverables:
- Add `capacitor` and `inductor` components.
- Implement transient solver with fixed timestep integration.
- Add state serialization for transient simulation.
- Extend API with `stepTransient` and `simulateTransient`.
- Add transient diagnostics and debug stats.

Tests:
- Unit tests for capacitor/inductor stamping.
- Transient solver tests for RC/RL step responses.
- Stability tests for time step selection.
- Golden transient snapshots for expected waveforms.

## Phase 5 — Performance, Diagnostics, and UX Polish
Overview: Harden the system for larger circuits, improve error messages, and stabilize public APIs for long-term use.

Deliverables:
- Add sparse matrix option for large circuits.
- Improve diagnostics with net/component path context.
- Add deterministic serialization for solver results.
- Expand docs with best practices and troubleshooting.
- Add benchmark suite and CI performance checks.

Tests:
- Performance regression tests for 200+ components.
- Determinism tests across randomized ordering.
- Error message snapshot tests for common failures.

## Todo
- [ ] Phase 1: Add `current_source` component and MNA stamping.
- [ ] Phase 1: Update netlist element types and validation rules.
- [ ] Phase 1: Add current source docs and golden tests.
- [ ] Phase 2: Implement nonlinear solver loop (Newton-Raphson).
- [ ] Phase 2: Add diode/LED models and convergence diagnostics.
- [ ] Phase 2: Add diode/LED golden tests.
- [ ] Phase 3: Implement digital mode and truth-table gates.
- [ ] Phase 3: Add digital solver tests and gate examples.
- [ ] Phase 4: Implement transient solver with capacitors/inductors.
- [ ] Phase 4: Add RC/RL transient tests and API.
- [ ] Phase 5: Add sparse solver option.
- [ ] Phase 5: Expand diagnostics and performance benchmarks.
