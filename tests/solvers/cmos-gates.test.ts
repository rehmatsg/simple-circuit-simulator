import test from "node:test";
import assert from "node:assert/strict";
import { Circuit, type CircuitDocument } from "../../src/core/circuit.js";
import { expandCmosGates } from "../../src/core/expansion.js";
import { createDefaultRegistry } from "../../src/components/builtins.js";
import { solveDC } from "../../src/solvers/dc.js";

const registry = createDefaultRegistry();
const VDD = 5;
const HIGH_THRESHOLD = VDD * 0.7;
const LOW_THRESHOLD = VDD * 0.3;

const buildGateCircuit = (
  type: "cmos_not" | "cmos_nand" | "cmos_nor",
  inputs: { in1: boolean; in2?: boolean },
): Circuit => {
  const pins: Record<string, string> = {
    out: "OUT",
    in1: inputs.in1 ? "VDD" : "GND",
  };
  if (type !== "cmos_not") {
    pins.in2 = inputs.in2 ? "VDD" : "GND";
  }

  const doc: CircuitDocument = {
    schemaVersion: 1,
    sim: { mode: "dc" },
    groundNet: "GND",
    components: [
      {
        name: "VDD_SRC",
        type: "battery",
        pins: { pos: "VDD", neg: "GND" },
        props: { voltage: VDD },
      },
      {
        name: "G1",
        type,
        pins,
      },
    ],
  };

  const expanded = expandCmosGates(doc);
  return new Circuit(expanded);
};

const assertLogicLevel = (voltage: number | undefined, expectedHigh: boolean) => {
  const v = voltage ?? 0;
  if (expectedHigh) {
    assert.ok(
      v >= HIGH_THRESHOLD,
      `Expected high output, got ${v} V`,
    );
  } else {
    assert.ok(
      v <= LOW_THRESHOLD,
      `Expected low output, got ${v} V`,
    );
  }
};

test("CMOS NOT truth table", () => {
  const lowCircuit = buildGateCircuit("cmos_not", { in1: false });
  const lowResult = solveDC(lowCircuit, { registry });
  assert.equal(lowResult.status, "ok");
  assertLogicLevel(lowResult.nodeVoltages.OUT, true);

  const highCircuit = buildGateCircuit("cmos_not", { in1: true });
  const highResult = solveDC(highCircuit, { registry });
  assert.equal(highResult.status, "ok");
  assertLogicLevel(highResult.nodeVoltages.OUT, false);
});

test("CMOS NAND truth table", () => {
  const cases = [
    { in1: false, in2: false, expected: true },
    { in1: false, in2: true, expected: true },
    { in1: true, in2: false, expected: true },
    { in1: true, in2: true, expected: false },
  ];

  for (const testCase of cases) {
    const circuit = buildGateCircuit("cmos_nand", testCase);
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "ok");
    assertLogicLevel(result.nodeVoltages.OUT, testCase.expected);
  }
});

test("CMOS NOR truth table", () => {
  const cases = [
    { in1: false, in2: false, expected: true },
    { in1: false, in2: true, expected: false },
    { in1: true, in2: false, expected: false },
    { in1: true, in2: true, expected: false },
  ];

  for (const testCase of cases) {
    const circuit = buildGateCircuit("cmos_nor", testCase);
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "ok");
    assertLogicLevel(result.nodeVoltages.OUT, testCase.expected);
  }
});
