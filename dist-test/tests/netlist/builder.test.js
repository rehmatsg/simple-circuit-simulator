import test from "node:test";
import assert from "node:assert/strict";
import { Circuit } from "../../src/core/circuit.js";
import { buildNetlist } from "../../src/netlist/builder.js";
import { createDefaultRegistry } from "../../src/components/builtins.js";
import { DiagnosticCodes } from "../../src/core/diagnostics.js";
const registry = createDefaultRegistry();
function baseCircuit() {
    return Circuit.create({
        schemaVersion: 1,
        mode: "dc",
        groundNet: "GND",
    });
}
test("buildNetlist produces deterministic nodes and elements", () => {
    const circuit = baseCircuit();
    circuit.addComponent({
        name: "R1",
        type: "resistor",
        pins: { a: "N1", b: "GND" },
        props: { resistance: "1k" },
    });
    circuit.addComponent({
        name: "B1",
        type: "battery",
        pins: { pos: "VCC", neg: "GND" },
        props: { voltage: "9V" },
    });
    circuit.addComponent({
        name: "S1",
        type: "switch",
        pins: { a: "VCC", b: "N1" },
        props: { state: "open" },
    });
    const result = buildNetlist(circuit, { registry });
    assert.equal(result.ok, true);
    if (!result.ok) {
        return;
    }
    const netlist = result.netlist;
    assert.deepEqual(netlist.nodes.map((node) => node.name), ["GND", "N1", "VCC"]);
    assert.equal(netlist.groundNodeId, 0);
    assert.deepEqual(netlist.elements.map((element) => element.component), ["B1", "R1"]);
    const vccNode = netlist.nodes.find((node) => node.name === "VCC");
    assert.ok(vccNode);
    assert.deepEqual(vccNode?.terminals.map((terminal) => `${terminal.component}.${terminal.pin}`), ["B1.pos", "S1.a"]);
});
test("buildNetlist converts closed switch to resistor", () => {
    const circuit = baseCircuit();
    circuit.addComponent({
        name: "S1",
        type: "switch",
        pins: { a: "N1", b: "GND" },
        props: { state: "closed" },
    });
    circuit.addComponent({
        name: "B1",
        type: "battery",
        pins: { pos: "N1", neg: "GND" },
        props: { voltage: "5V" },
    });
    const result = buildNetlist(circuit, { registry, switchClosedResistance: 0.01 });
    assert.equal(result.ok, true);
    if (!result.ok) {
        return;
    }
    const switchElement = result.netlist.elements.find((element) => element.component === "S1");
    assert.ok(switchElement);
    assert.equal(switchElement?.type, "resistor");
    assert.equal(switchElement?.params.resistance, 0.01);
});
test("buildNetlist includes current source elements", () => {
    const circuit = baseCircuit();
    circuit.addComponent({
        name: "I1",
        type: "current_source",
        pins: { pos: "GND", neg: "N1" },
        props: { current: "10mA" },
    });
    circuit.addComponent({
        name: "R1",
        type: "resistor",
        pins: { a: "N1", b: "GND" },
        props: { resistance: "1k" },
    });
    const result = buildNetlist(circuit, { registry });
    assert.equal(result.ok, true);
    if (!result.ok) {
        return;
    }
    const currentElement = result.netlist.elements.find((element) => element.component === "I1");
    assert.ok(currentElement);
    assert.equal(currentElement?.type, "current_source");
    assert.equal(currentElement?.params.current, 0.01);
});
test("buildNetlist errors on floating reference", () => {
    const circuit = Circuit.create({
        schemaVersion: 1,
        mode: "dc",
        groundNet: "GND",
    });
    circuit.addComponent({
        name: "R1",
        type: "resistor",
        pins: { a: "N1", b: "N2" },
        props: { resistance: "1k" },
    });
    const result = buildNetlist(circuit, { registry });
    assert.equal(result.ok, false);
    if (result.ok) {
        return;
    }
    assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.floatingReference));
});
//# sourceMappingURL=builder.test.js.map