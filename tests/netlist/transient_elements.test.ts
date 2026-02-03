import test from "node:test";
import assert from "node:assert/strict";
import { Circuit } from "../../src/core/circuit.js";
import { createDefaultRegistry } from "../../src/components/builtins.js";
import { buildNetlist } from "../../src/netlist/builder.js";

const registry = createDefaultRegistry();

test("buildNetlist includes capacitor and inductor elements", () => {
  const circuit = Circuit.create({ schemaVersion: 1, mode: "transient", groundNet: "GND" });
  circuit.addComponent({
    name: "C1",
    type: "capacitor",
    pins: { a: "N1", b: "GND" },
    props: { capacitance: "1u" },
  });
  circuit.addComponent({
    name: "L1",
    type: "inductor",
    pins: { a: "N1", b: "GND" },
    props: { inductance: "1m" },
  });

  const result = buildNetlist(circuit, { registry });
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const capacitor = result.netlist.elements.find((element) => element.component === "C1");
  const inductor = result.netlist.elements.find((element) => element.component === "L1");

  assert.ok(capacitor);
  assert.ok(inductor);
  assert.equal(capacitor?.type, "capacitor");
  assert.equal(inductor?.type, "inductor");
});
