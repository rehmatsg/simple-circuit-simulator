import test from "node:test";
import assert from "node:assert/strict";
import { Circuit } from "../../src/core/circuit.js";

const baseCircuit = () =>
  Circuit.create({
    schemaVersion: 1,
    mode: "dc",
    groundNet: "GND",
  });

test("Circuit builder add/update/remove", () => {
  const circuit = baseCircuit();

  circuit.addComponent({
    name: "R1",
    type: "resistor",
    pins: { a: "N1", b: "GND" },
    props: { resistance: "1k" },
  });

  assert.equal(circuit.listComponents().length, 1);

  circuit.updateComponentProps("R1", { resistance: "2k" });
  const updated = circuit.getComponent("R1");
  assert.deepEqual(updated?.props, { resistance: "2k" });

  circuit.updateComponentPins("R1", { a: "N2", b: "GND" });
  const updatedPins = circuit.getComponent("R1");
  assert.deepEqual(updatedPins?.pins, { a: "N2", b: "GND" });

  const removed = circuit.removeComponent("R1");
  assert.equal(removed, true);
  assert.equal(circuit.listComponents().length, 0);
});

test("Circuit toJSON uses deterministic ordering", () => {
  const circuit = baseCircuit();
  circuit.addComponent({
    name: "R2",
    type: "resistor",
    pins: { b: "N2", a: "N1" },
    props: { z: "3k", resistance: "1k" },
    meta: { z: "last", a: "first" },
  });
  circuit.addComponent({
    name: "R1",
    type: "resistor",
    pins: { b: "GND", a: "N1" },
  });

  const json = circuit.toJSON();
  assert.equal(json.components.length, 2);
  const [first, second] = json.components;
  assert.ok(first);
  assert.ok(second);
  assert.equal(first.name, "R1");
  assert.equal(second.name, "R2");
  assert.deepEqual(Object.keys(second.pins), ["a", "b"]);
  assert.deepEqual(Object.keys(second.props ?? {}), [
    "resistance",
    "z",
  ]);
  assert.deepEqual(Object.keys(second.meta ?? {}), [
    "a",
    "z",
  ]);
});
