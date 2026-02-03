# Simple Circuit Simulator Plan

This plan is organized into phases that build a correct, extensible, UI-agnostic TypeScript circuit simulation library. Each phase includes a high-level overview, concrete deliverables, and rigorous tests to validate correctness, determinism, and error handling.

## Phase 0 — Project Baseline
Overview: Establish a stable scaffold, shared types, and test harness so later phases can focus on modeling and solver logic without churn.

Deliverables:
- Define workspace conventions, module layout, and basic build/test scripts.
- Create top-level types for errors, warnings, and results to standardize downstream output.
- Add a deterministic test utilities module (tolerance helpers, stable sorting helpers).

Tests:
- Smoke test that the library builds and can be imported in Node.
- Determinism test for stable sorting helpers and tolerance comparisons.

## Phase 1 — Value Parsing, Units, and Diagnostics Core
Overview: Build the foundation for parsing and validating circuit values and for emitting consistent, structured diagnostics.

Deliverables:
- Value parser for numbers, engineering strings, and parameter references.
- Unit normalization for volts and ohms with common prefixes.
- Diagnostic helpers with consistent codes, messages, and optional component/net references.
- Error catalog documentation structure and initial codes.

Tests:
- Unit tests for numeric, engineering string, and parameter reference parsing.
- Unit tests for prefix handling (p, n, u, m, k, M, G) and units in strings.
- Error cases for invalid values and unknown units.
- Snapshot tests for error payload shape to guarantee stability.

## Phase 2 — Circuit Model and JSON Serialization
Overview: Implement the canonical circuit data model and ensure JSON import/export is stable, versioned, and validated.

Deliverables:
- Circuit model with components, pins, and nets in a normalized internal representation.
- JSON schema v1 with versioned import/export and migration hooks.
- Validation rules for duplicate names, missing pins, unknown pins, missing ground, and unknown types.
- Programmatic Circuit API for add, remove, update props, update pins, import, export.

Tests:
- JSON import/export roundtrip tests for multiple circuits with deterministic ordering.
- Validation tests for missing ground, duplicate component names, invalid pin names, missing required pins, and unknown types.
- Component update tests verifying internal model updates and stable exports.
- Schema migration tests for a simulated v0 to v1 upgrade.

## Phase 3 — Component Registry and Built-in Components (v1)
Overview: Introduce a registry-based component system so solver stamping and validation can be extended without core refactors.

Deliverables:
- Component registry with pin definitions, default props, and validation rules.
- Built-in components: battery, resistor, bulb, switch.
- Pin naming validation for required canonical pins.
- Component property parsing with unit checks and switch state handling.

Tests:
- Registry tests for lookup, duplicate registration prevention, and required pin enforcement.
- Pin validation tests per component type with clear error messages listing valid pins.
- Property parsing tests for voltage, resistance, and switch state in each component.

## Phase 4 — Netlist Builder
Overview: Convert the circuit model into a solver-ready netlist with deterministic node ordering and ground mapping.

Deliverables:
- Netlist builder producing nodes, ground node id, and element list.
- Terminal-to-net resolution and explicit net diagnostics for debugging.
- Deterministic ordering for nodes and elements.

Tests:
- Unit tests verifying correct node list creation for multiple nets and shared terminals.
- Ground mapping tests for missing ground, floating reference, and explicit ground net.
- Determinism tests to ensure netlists are identical across runs.
- Diagnostic tests for net summaries and component-to-net mappings.

## Phase 5 — DC MNA Solver (v1)
Overview: Implement a correct DC solver using Modified Nodal Analysis with a stable interface for future extensions.

Deliverables:
- Dense matrix solver with partial pivoting and numerical tolerance control.
- MNA stamping for resistors and voltage sources.
- Switch handling as open (removed) or closed (Ron resistor).
- Structured solver errors and warnings including singular matrix and short circuit suspected.
- SimulationResult generation with node voltages, currents, and power.

Tests:
- Matrix solver tests for correctness on small known systems.
- Stamping tests for resistor and voltage source contributions to MNA matrices.
- Solver error tests for singular matrix and floating nodes.
- Short-circuit warning test based on current threshold.
- Power and current sign convention tests for consistent results.

## Phase 6 — Golden Circuits and Acceptance Criteria (v1)
Overview: Validate end-to-end behavior against canonical circuits and acceptance criteria.

Deliverables:
- Golden circuit JSON fixtures for all required cases.
- Expected outputs for node voltages, currents, and warnings/errors.
- v1 example circuit: battery + switch + bulb.

Tests:
- End-to-end golden tests for single resistor, series, parallel, divider, switch open, switch closed, short circuit warning, and floating circuit error.
- Tolerance-based comparisons for voltages and currents.
- Deterministic ordering tests for results and warnings.
- Roundtrip JSON import/export tests on all golden circuits.

## Phase 7 — Documentation and Public API Surface
Overview: Deliver clear, stable documentation and a clean public API for integration in a future UI.

Deliverables:
- JSON schema documentation with examples and pin naming reference.
- Component list with supported props and value formats.
- Solver limitations and error/warning code catalog.
- Cookbook examples for bulb+switch, divider, and parallel loads.
- Public API index with typed exports and minimal surface area.

Tests:
- Documentation smoke tests that examples parse and solve.
- API tests ensuring tree-shakeable ESM exports and TypeScript typings.
- Regression tests to ensure public API remains stable.

## Phase 8 — Hardening and Performance
Overview: Ensure the library is deterministic, robust, and performant for 10–200 component circuits, with clear error reporting.

Deliverables:
- Performance benchmarks for typical circuits and worst-case reasonable inputs.
- Expanded diagnostics for likely topology mistakes.
- Optional debug info in results with matrix size and solver stats.

Tests:
- Performance tests validating solver completes under defined thresholds.
- Stress tests for large but valid circuits with deterministic output.
- Error diagnostics tests to confirm actionable messages.

---

Milestone v1 completion is achieved when all Phase 0–7 tests pass and the acceptance criteria in the spec are met.
