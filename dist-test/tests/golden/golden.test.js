import test from "node:test";
import assert from "node:assert/strict";
import { importCircuit } from "../../src/serialize/json.js";
import { solveDC } from "../../src/solvers/dc.js";
import { createDefaultRegistry } from "../../src/components/builtins.js";
import { DiagnosticCodes } from "../../src/core/diagnostics.js";
import { goldenFixtures } from "../../src/testing/fixtures/golden.js";
const registry = createDefaultRegistry();
const approx = (actual, expected, epsilon = 1e-6) => {
    assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be within ${epsilon} of ${expected}`);
};
test("golden: single resistor", async () => {
    const doc = goldenFixtures.single_resistor;
    const imported = importCircuit(doc, { registry });
    assert.equal(imported.ok, true);
    if (!imported.ok) {
        return;
    }
    const result = solveDC(imported.circuit, { registry });
    assert.equal(result.status, "ok");
    approx(result.nodeVoltages.VCC ?? 0, 10);
    approx(result.componentCurrents.R1, 0.01);
});
test("golden: series resistors", async () => {
    const doc = goldenFixtures.series_resistors;
    const imported = importCircuit(doc, { registry });
    assert.equal(imported.ok, true);
    if (!imported.ok) {
        return;
    }
    const result = solveDC(imported.circuit, { registry });
    assert.equal(result.status, "ok");
    approx(result.nodeVoltages.N1 ?? 0, 8);
    approx(result.componentCurrents.R1, 0.004);
    approx(result.componentCurrents.R2, 0.004);
});
test("golden: parallel resistors", async () => {
    const doc = goldenFixtures.parallel_resistors;
    const imported = importCircuit(doc, { registry });
    assert.equal(imported.ok, true);
    if (!imported.ok) {
        return;
    }
    const result = solveDC(imported.circuit, { registry });
    assert.equal(result.status, "ok");
    approx(result.componentCurrents.R1, 0.006);
    approx(result.componentCurrents.R2, 0.003);
});
test("golden: voltage divider", async () => {
    const doc = goldenFixtures.voltage_divider;
    const imported = importCircuit(doc, { registry });
    assert.equal(imported.ok, true);
    if (!imported.ok) {
        return;
    }
    const result = solveDC(imported.circuit, { registry });
    assert.equal(result.status, "ok");
    approx(result.nodeVoltages.N1 ?? 0, 5);
});
test("golden: switch open", async () => {
    const doc = goldenFixtures.switch_open;
    const imported = importCircuit(doc, { registry });
    assert.equal(imported.ok, true);
    if (!imported.ok) {
        return;
    }
    const result = solveDC(imported.circuit, { registry });
    assert.equal(result.status, "ok");
    approx(result.componentCurrents.R1, 0);
});
test("golden: switch closed", async () => {
    const doc = goldenFixtures.switch_closed;
    const imported = importCircuit(doc, { registry });
    assert.equal(imported.ok, true);
    if (!imported.ok) {
        return;
    }
    const result = solveDC(imported.circuit, { registry, switchClosedResistance: 0.001 });
    assert.equal(result.status, "ok");
    assert.ok(result.componentCurrents.R1 > 0);
});
test("golden: short circuit warning", async () => {
    const doc = goldenFixtures.short_circuit;
    const imported = importCircuit(doc, { registry });
    assert.equal(imported.ok, true);
    if (!imported.ok) {
        return;
    }
    const result = solveDC(imported.circuit, { registry, shortCircuitThreshold: 10 });
    assert.equal(result.status, "ok");
    assert.ok(result.warnings.some((warning) => warning.code === DiagnosticCodes.shortCircuitSuspected));
});
test("golden: floating circuit without ground", async () => {
    const doc = goldenFixtures.floating_no_ground;
    const imported = importCircuit(doc, { registry });
    assert.equal(imported.ok, true);
    if (!imported.ok) {
        return;
    }
    const result = solveDC(imported.circuit, { registry });
    assert.equal(result.status, "error");
    assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.floatingReference ||
        err.code === DiagnosticCodes.singularMatrix));
});
//# sourceMappingURL=golden.test.js.map