import test from "node:test";
import assert from "node:assert/strict";
import type { CircuitDocument, ComponentDocument } from "../../src/core/circuit.js";
import { expandCmosGates } from "../../src/core/expansion.js";

const baseDoc: CircuitDocument = {
  schemaVersion: 1,
  sim: { mode: "dc" },
  groundNet: "GND",
  components: [
    {
      name: "INV1",
      type: "cmos_not",
      pins: { in1: "A", out: "Y" },
    },
    {
      name: "NAND1",
      type: "cmos_nand",
      pins: { in1: "A", in2: "B", out: "Y2" },
    },
    {
      name: "NOR1",
      type: "cmos_nor",
      pins: { in1: "A", in2: "B", out: "Y3" },
    },
    {
      name: "R1",
      type: "resistor",
      pins: { a: "Y", b: "GND" },
      props: { resistance: "1k" },
    },
  ],
};

const matchesPins = (
  component: ComponentDocument,
  expected: Record<string, string>,
): boolean => {
  for (const [key, value] of Object.entries(expected)) {
    if (component.pins[key] !== value) {
      return false;
    }
  }
  return true;
};

const hasComponent = (
  components: ComponentDocument[],
  type: string,
  expectedPins: Record<string, string>,
): boolean =>
  components.some(
    (component) => component.type === type && matchesPins(component, expectedPins),
  );

test("expandCmosGates replaces CMOS gates with MOSFET stacks", () => {
  const expanded = expandCmosGates(baseDoc);

  const types = expanded.components.map((component) => component.type);
  assert.equal(types.includes("cmos_not"), false);
  assert.equal(types.includes("cmos_nand"), false);
  assert.equal(types.includes("cmos_nor"), false);

  assert.equal(expanded.components.length, 11);

  assert.ok(
    hasComponent(expanded.components, "mosfet_p", {
      d: "Y",
      g: "A",
      s: "VDD",
      b: "VDD",
    }),
  );
  assert.ok(
    hasComponent(expanded.components, "mosfet_n", {
      d: "Y",
      g: "A",
      s: "GND",
      b: "GND",
    }),
  );

  assert.ok(
    hasComponent(expanded.components, "mosfet_p", {
      d: "Y2",
      g: "A",
      s: "VDD",
      b: "VDD",
    }),
  );
  assert.ok(
    hasComponent(expanded.components, "mosfet_p", {
      d: "Y2",
      g: "B",
      s: "VDD",
      b: "VDD",
    }),
  );
  assert.ok(
    hasComponent(expanded.components, "mosfet_n", {
      d: "Y2",
      g: "A",
      s: "NAND1_nmid",
      b: "GND",
    }),
  );
  assert.ok(
    hasComponent(expanded.components, "mosfet_n", {
      d: "NAND1_nmid",
      g: "B",
      s: "GND",
      b: "GND",
    }),
  );

  assert.ok(
    hasComponent(expanded.components, "mosfet_p", {
      d: "Y3",
      g: "A",
      s: "NOR1_pmid",
      b: "VDD",
    }),
  );
  assert.ok(
    hasComponent(expanded.components, "mosfet_p", {
      d: "NOR1_pmid",
      g: "B",
      s: "VDD",
      b: "VDD",
    }),
  );
  assert.ok(
    hasComponent(expanded.components, "mosfet_n", {
      d: "Y3",
      g: "A",
      s: "GND",
      b: "GND",
    }),
  );
  assert.ok(
    hasComponent(expanded.components, "mosfet_n", {
      d: "Y3",
      g: "B",
      s: "GND",
      b: "GND",
    }),
  );

  assert.ok(
    hasComponent(expanded.components, "resistor", {
      a: "Y",
      b: "GND",
    }),
  );
});
