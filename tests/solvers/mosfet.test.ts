import test from "node:test";
import assert from "node:assert/strict";
import { Circuit } from "../../src/core/circuit.js";
import { createDefaultRegistry } from "../../src/components/builtins.js";
import { solveDC } from "../../src/solvers/dc.js";

const registry = createDefaultRegistry();

const approx = (actual: number, expected: number, epsilon = 1e-3) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be within ${epsilon} of ${expected}`);
};

test("NMOS pulls node low when gate is high", () => {
  const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
  circuit.addComponent({
    name: "B1",
    type: "battery",
    pins: { pos: "VDD", neg: "GND" },
    props: { voltage: 5 },
  });
  circuit.addComponent({
    name: "R1",
    type: "resistor",
    pins: { a: "VDD", b: "N1" },
    props: { resistance: "1k" },
  });
  circuit.addComponent({
    name: "M1",
    type: "mosfet_n",
    pins: { d: "N1", g: "VDD", s: "GND" },
  });

  const result = solveDC(circuit, { registry });
  assert.equal(result.status, "ok");
  approx(result.nodeVoltages.N1 ?? 0, 0, 0.1);
});

test("NMOS stays off when gate is low", () => {
  const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
  circuit.addComponent({
    name: "B1",
    type: "battery",
    pins: { pos: "VDD", neg: "GND" },
    props: { voltage: 5 },
  });
  circuit.addComponent({
    name: "R1",
    type: "resistor",
    pins: { a: "VDD", b: "N1" },
    props: { resistance: "1k" },
  });
  circuit.addComponent({
    name: "M1",
    type: "mosfet_n",
    pins: { d: "N1", g: "GND", s: "GND" },
  });

  const result = solveDC(circuit, { registry });
  assert.equal(result.status, "ok");
  approx(result.nodeVoltages.N1 ?? 0, 5, 0.1);
});


test("PMOS pulls node high when gate is low", () => {
  const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
  circuit.addComponent({
    name: "B1",
    type: "battery",
    pins: { pos: "VDD", neg: "GND" },
    props: { voltage: 5 },
  });
  circuit.addComponent({
    name: "R1",
    type: "resistor",
    pins: { a: "N1", b: "GND" },
    props: { resistance: "1k" },
  });
  circuit.addComponent({
    name: "M1",
    type: "mosfet_p",
    pins: { d: "N1", g: "GND", s: "VDD" },
  });

  const result = solveDC(circuit, { registry });
  assert.equal(result.status, "ok");
  approx(result.nodeVoltages.N1 ?? 0, 5, 0.1);
});
