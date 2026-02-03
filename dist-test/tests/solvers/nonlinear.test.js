import test from "node:test";
import assert from "node:assert/strict";
import { Circuit } from "../../src/core/circuit.js";
import { createDefaultRegistry } from "../../src/components/builtins.js";
import { solveDC } from "../../src/solvers/dc.js";
import { DiagnosticCodes } from "../../src/core/diagnostics.js";
const registry = createDefaultRegistry();
const inRange = (value, min, max) => {
    assert.ok(value >= min && value <= max, `Expected ${value} to be in range ${min}-${max}`);
};
test("solveDC handles forward-biased diode", () => {
    const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
    circuit.addComponent({
        name: "B1",
        type: "battery",
        pins: { pos: "VCC", neg: "GND" },
        props: { voltage: 5 },
    });
    circuit.addComponent({
        name: "R1",
        type: "resistor",
        pins: { a: "VCC", b: "N1" },
        props: { resistance: "1k" },
    });
    circuit.addComponent({
        name: "D1",
        type: "diode",
        pins: { anode: "N1", cathode: "GND" },
    });
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "ok");
    inRange(result.nodeVoltages.N1 ?? 0, 0.4, 0.9);
    assert.ok(result.componentCurrents.D1 > 0);
});
test("solveDC handles reverse-biased diode", () => {
    const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
    circuit.addComponent({
        name: "B1",
        type: "battery",
        pins: { pos: "VCC", neg: "GND" },
        props: { voltage: 5 },
    });
    circuit.addComponent({
        name: "R1",
        type: "resistor",
        pins: { a: "VCC", b: "N1" },
        props: { resistance: "1k" },
    });
    circuit.addComponent({
        name: "D1",
        type: "diode",
        pins: { anode: "GND", cathode: "N1" },
    });
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "ok");
    inRange(result.nodeVoltages.N1 ?? 0, 4.9, 5.0);
    assert.ok(Math.abs(result.componentCurrents.D1) < 1e-6);
});
test("solveDC reports non-convergence when maxIterations too low", () => {
    const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
    circuit.addComponent({
        name: "B1",
        type: "battery",
        pins: { pos: "VCC", neg: "GND" },
        props: { voltage: 5 },
    });
    circuit.addComponent({
        name: "R1",
        type: "resistor",
        pins: { a: "VCC", b: "N1" },
        props: { resistance: "1k" },
    });
    circuit.addComponent({
        name: "D1",
        type: "diode",
        pins: { anode: "N1", cathode: "GND" },
    });
    const result = solveDC(circuit, {
        registry,
        maxIterations: 1,
        nonlinearTolerance: 1e-12,
    });
    assert.equal(result.status, "error");
    assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.nonlinearConvergenceFailure));
});
//# sourceMappingURL=nonlinear.test.js.map