import test from "node:test";
import assert from "node:assert/strict";
import { Circuit } from "../../src/core/circuit.js";
import { createDefaultRegistry } from "../../src/components/builtins.js";
import { solveDC } from "../../src/solvers/dc.js";
const registry = createDefaultRegistry();
const approx = (actual, expected, epsilon = 1e-6) => {
    assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be within ${epsilon} of ${expected}`);
};
function buildSeriesCircuit(count) {
    const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
    circuit.addComponent({
        name: "B1",
        type: "battery",
        pins: { pos: "VCC", neg: "GND" },
        props: { voltage: 10 },
    });
    let prevNet = "VCC";
    for (let i = 1; i <= count; i += 1) {
        const net = i === count ? "GND" : `N${i}`;
        circuit.addComponent({
            name: `R${i}`,
            type: "resistor",
            pins: { a: prevNet, b: net },
            props: { resistance: 10 },
        });
        prevNet = net;
    }
    return circuit;
}
test("solveDC handles 200-resistor series circuit", () => {
    const circuit = buildSeriesCircuit(200);
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "ok");
    const expectedCurrent = 10 / (200 * 10);
    approx(result.componentCurrents.R1, expectedCurrent, 1e-8);
    approx(result.nodeVoltages.N100 ?? 0, 10 - expectedCurrent * 10 * 100, 1e-5);
});
test("solveDC deterministic with different component order", () => {
    const circuitA = buildSeriesCircuit(20);
    const circuitB = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
    const components = circuitA.listComponents();
    for (const component of components.slice().reverse()) {
        circuitB.addComponent(component);
    }
    const resultA = solveDC(circuitA, { registry });
    const resultB = solveDC(circuitB, { registry });
    assert.equal(resultA.status, "ok");
    assert.equal(resultB.status, "ok");
    assert.deepEqual(resultA.nodeVoltages, resultB.nodeVoltages);
    assert.deepEqual(resultA.componentCurrents, resultB.componentCurrents);
});
//# sourceMappingURL=stress.test.js.map