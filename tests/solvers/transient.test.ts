import test from "node:test";
import assert from "node:assert/strict";
import { Circuit } from "../../src/core/circuit.js";
import { createDefaultRegistry } from "../../src/components/builtins.js";
import { stepTransient } from "../../src/solvers/transient.js";

const registry = createDefaultRegistry();

test("stepTransient validates dt", () => {
  const circuit = Circuit.create({ schemaVersion: 1, mode: "transient", groundNet: "GND" });
  const result = stepTransient(circuit, { registry, time: 0, dt: 0 });
  assert.equal(result.status, "error");
});

test("stepTransient returns ok for DC-compatible circuit", () => {
  const circuit = Circuit.create({ schemaVersion: 1, mode: "transient", groundNet: "GND" });
  circuit.addComponent({
    name: "B1",
    type: "battery",
    pins: { pos: "VCC", neg: "GND" },
    props: { voltage: 5 },
  });
  circuit.addComponent({
    name: "R1",
    type: "resistor",
    pins: { a: "VCC", b: "GND" },
    props: { resistance: "1k" },
  });

  const result = stepTransient(circuit, { registry, time: 0, dt: 0.01 });
  assert.equal(result.status, "ok");
  assert.equal(result.mode, "transient");
});
