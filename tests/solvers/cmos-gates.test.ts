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

type BasicGate =
  | "cmos_not"
  | "cmos_nand"
  | "cmos_nor"
  | "cmos_and"
  | "cmos_or"
  | "cmos_xor";

const buildGateCircuit = (
  type: BasicGate,
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

const buildHalfAdderCircuit = (inputs: { a: boolean; b: boolean }): Circuit => {
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
        name: "HA1",
        type: "cmos_half_adder",
        pins: {
          a: inputs.a ? "VDD" : "GND",
          b: inputs.b ? "VDD" : "GND",
          sum: "SUM",
          carry: "CARRY",
        },
      },
    ],
  };

  const expanded = expandCmosGates(doc);
  return new Circuit(expanded);
};

const buildFullAdderCircuit = (inputs: { a: boolean; b: boolean; cin: boolean }): Circuit => {
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
        name: "FA1",
        type: "cmos_full_adder",
        pins: {
          a: inputs.a ? "VDD" : "GND",
          b: inputs.b ? "VDD" : "GND",
          cin: inputs.cin ? "VDD" : "GND",
          sum: "SUM",
          cout: "COUT",
        },
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

const booleanToNumber = (value: boolean) => (value ? 1 : 0);

const expectedSum = (a: boolean, b: boolean, cin = false) =>
  (booleanToNumber(a) ^ booleanToNumber(b) ^ booleanToNumber(cin)) === 1;

const expectedCarry = (a: boolean, b: boolean, cin = false) =>
  booleanToNumber(a) + booleanToNumber(b) + booleanToNumber(cin) >= 2;

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

test("CMOS AND truth table", () => {
  const cases = [
    { in1: false, in2: false, expected: false },
    { in1: false, in2: true, expected: false },
    { in1: true, in2: false, expected: false },
    { in1: true, in2: true, expected: true },
  ];

  for (const testCase of cases) {
    const circuit = buildGateCircuit("cmos_and", testCase);
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "ok");
    assertLogicLevel(result.nodeVoltages.OUT, testCase.expected);
  }
});

test("CMOS OR truth table", () => {
  const cases = [
    { in1: false, in2: false, expected: false },
    { in1: false, in2: true, expected: true },
    { in1: true, in2: false, expected: true },
    { in1: true, in2: true, expected: true },
  ];

  for (const testCase of cases) {
    const circuit = buildGateCircuit("cmos_or", testCase);
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "ok");
    assertLogicLevel(result.nodeVoltages.OUT, testCase.expected);
  }
});

test("CMOS XOR truth table", () => {
  const cases = [
    { in1: false, in2: false, expected: false },
    { in1: false, in2: true, expected: true },
    { in1: true, in2: false, expected: true },
    { in1: true, in2: true, expected: false },
  ];

  for (const testCase of cases) {
    const circuit = buildGateCircuit("cmos_xor", testCase);
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "ok");
    assertLogicLevel(result.nodeVoltages.OUT, testCase.expected);
  }
});

test("CMOS half adder truth table", () => {
  const cases = [
    { a: false, b: false },
    { a: false, b: true },
    { a: true, b: false },
    { a: true, b: true },
  ];

  for (const testCase of cases) {
    const circuit = buildHalfAdderCircuit(testCase);
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "ok");
    assertLogicLevel(result.nodeVoltages.SUM, expectedSum(testCase.a, testCase.b));
    assertLogicLevel(result.nodeVoltages.CARRY, expectedCarry(testCase.a, testCase.b));
  }
});

test("CMOS full adder truth table", () => {
  const cases = [
    { a: false, b: false, cin: false },
    { a: false, b: false, cin: true },
    { a: false, b: true, cin: false },
    { a: false, b: true, cin: true },
    { a: true, b: false, cin: false },
    { a: true, b: false, cin: true },
    { a: true, b: true, cin: false },
    { a: true, b: true, cin: true },
  ];

  for (const testCase of cases) {
    const circuit = buildFullAdderCircuit(testCase);
    const result = solveDC(circuit, { registry });
    assert.equal(result.status, "ok");
    assertLogicLevel(
      result.nodeVoltages.SUM,
      expectedSum(testCase.a, testCase.b, testCase.cin),
    );
    assertLogicLevel(
      result.nodeVoltages.COUT,
      expectedCarry(testCase.a, testCase.b, testCase.cin),
    );
  }
});
