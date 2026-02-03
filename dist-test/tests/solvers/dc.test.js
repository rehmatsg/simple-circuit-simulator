import test from "node:test";
import assert from "node:assert/strict";
import { Circuit } from "../../src/core/circuit.js";
import { createDefaultRegistry } from "../../src/components/builtins.js";
import { solveDC } from "../../src/solvers/dc.js";
import { DiagnosticCodes } from "../../src/core/diagnostics.js";
const registry = createDefaultRegistry();
const approx = (actual, expected, epsilon = 1e-6) => {
    assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be within ${epsilon} of ${expected}`);
};
const approxValue = (value, expected, epsilon = 1e-6) => {
    assert.equal(typeof value, "number");
    approx(value ?? 0, expected, epsilon);
};
test("solveDC computes resistor across battery", () => {
    const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
    circuit.addComponent({
        name: "B1",
        type: "battery",
        pins: { pos: "VCC", neg: "GND" },
        props: { voltage: "9V" },
    });
    circuit.addComponent({
        name: "R1",
        type: "resistor",
        pins: { a: "VCC", b: "GND" },
        props: { resistance: "1k" },
    });
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "ok");
    approxValue(result.nodeVoltages.VCC, 9);
    approxValue(result.nodeVoltages.GND, 0);
    approx(result.componentCurrents.R1, 0.009);
    approx(result.componentCurrents.B1, 0.009);
});
test("solveDC computes voltage divider", () => {
    const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
    circuit.addComponent({
        name: "B1",
        type: "battery",
        pins: { pos: "VCC", neg: "GND" },
        props: { voltage: 10 },
    });
    circuit.addComponent({
        name: "R1",
        type: "resistor",
        pins: { a: "VCC", b: "N1" },
        props: { resistance: "1k" },
    });
    circuit.addComponent({
        name: "R2",
        type: "resistor",
        pins: { a: "N1", b: "GND" },
        props: { resistance: "1k" },
    });
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "ok");
    approxValue(result.nodeVoltages.N1, 5);
    approx(result.componentCurrents.R1, 0.005);
    approx(result.componentCurrents.R2, 0.005);
});
test("solveDC reports singular matrix on floating subcircuit", () => {
    const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
    circuit.addComponent({
        name: "B1",
        type: "battery",
        pins: { pos: "VCC", neg: "GND" },
        props: { voltage: "5V" },
    });
    circuit.addComponent({
        name: "R1",
        type: "resistor",
        pins: { a: "N1", b: "N2" },
        props: { resistance: "1k" },
    });
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "error");
    assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.singularMatrix));
});
test("solveDC warns on short-circuit currents", () => {
    const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
    circuit.addComponent({
        name: "B1",
        type: "battery",
        pins: { pos: "VCC", neg: "GND" },
        props: { voltage: "5V" },
    });
    circuit.addComponent({
        name: "R1",
        type: "resistor",
        pins: { a: "VCC", b: "GND" },
        props: { resistance: 1e-6 },
    });
    const result = solveDC(circuit, { registry, shortCircuitThreshold: 10 });
    assert.equal(result.status, "ok");
    assert.ok(result.warnings.some((warning) => warning.code === DiagnosticCodes.shortCircuitSuspected));
});
//# sourceMappingURL=dc.test.js.map