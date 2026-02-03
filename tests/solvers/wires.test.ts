import test from "node:test";
import assert from "node:assert/strict";
import { Circuit } from "../../src/core/circuit.js";
import { createDefaultRegistry } from "../../src/components/builtins.js";
import { solveDC } from "../../src/solvers/dc.js";
import { computeWireCurrents } from "../../src/solvers/wires.js";
import { DiagnosticCodes } from "../../src/core/diagnostics.js";

const registry = createDefaultRegistry();

const approx = (actual: number, expected: number, epsilon = 1e-6) => {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be within ${epsilon} of ${expected}`,
  );
};

test("computeWireCurrents returns per-segment currents for series circuit", () => {
  const circuit = new Circuit({
    schemaVersion: 1,
    sim: { mode: "dc" },
    groundNet: "GND",
    components: [
      { name: "B1", type: "battery", pins: { pos: "VCC", neg: "GND" }, props: { voltage: 9 } },
      { name: "R1", type: "resistor", pins: { a: "VCC", b: "GND" }, props: { resistance: 100 } },
    ],
    wires: [
      {
        id: "W1",
        net: "VCC",
        from: { kind: "pin", component: "B1", pin: "pos" },
        to: { kind: "pin", component: "R1", pin: "a" },
      },
      {
        id: "W2",
        net: "GND",
        from: { kind: "pin", component: "R1", pin: "b" },
        to: { kind: "pin", component: "B1", pin: "neg" },
      },
    ],
  });

  const result = solveDC(circuit, { registry });
  const wires = computeWireCurrents(circuit, result);

  assert.equal(wires.errors.length, 0);
  approx(wires.wireCurrents.W1 ?? 0, 0.09, 1e-4);
  approx(wires.wireCurrents.W2 ?? 0, 0.09, 1e-4);
});

test("computeWireCurrents splits current at junction", () => {
  const circuit = new Circuit({
    schemaVersion: 1,
    sim: { mode: "dc" },
    groundNet: "GND",
    components: [
      { name: "B1", type: "battery", pins: { pos: "VCC", neg: "GND" }, props: { voltage: 6 } },
      { name: "R1", type: "resistor", pins: { a: "VCC", b: "GND" }, props: { resistance: 1000 } },
      { name: "R2", type: "resistor", pins: { a: "VCC", b: "GND" }, props: { resistance: 1000 } },
    ],
    junctions: [{ id: "J1", net: "VCC" }],
    wires: [
      {
        id: "W1",
        net: "VCC",
        from: { kind: "pin", component: "B1", pin: "pos" },
        to: { kind: "junction", id: "J1" },
      },
      {
        id: "W2",
        net: "VCC",
        from: { kind: "junction", id: "J1" },
        to: { kind: "pin", component: "R1", pin: "a" },
      },
      {
        id: "W3",
        net: "VCC",
        from: { kind: "junction", id: "J1" },
        to: { kind: "pin", component: "R2", pin: "a" },
      },
    ],
  });

  const result = solveDC(circuit, { registry });
  const wires = computeWireCurrents(circuit, result);

  assert.equal(wires.errors.length, 0);
  approx(wires.wireCurrents.W1 ?? 0, 0.012, 1e-5);
  approx(wires.wireCurrents.W2 ?? 0, 0.006, 1e-5);
  approx(wires.wireCurrents.W3 ?? 0, 0.006, 1e-5);
});

test("computeWireCurrents warns when no wire layout is provided", () => {
  const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
  circuit.addComponent({
    name: "R1",
    type: "resistor",
    pins: { a: "VCC", b: "GND" },
    props: { resistance: 1000 },
  });

  const result = solveDC(circuit, { registry });
  const wires = computeWireCurrents(circuit, result);

  assert.ok(wires.warnings.some((warning) => warning.code === DiagnosticCodes.wireLayoutMissing));
});
