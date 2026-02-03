import test from "node:test";
import assert from "node:assert/strict";
import { Circuit } from "../../src/core/circuit.js";
import { createDefaultRegistry } from "../../src/components/builtins.js";
import { solveDigital } from "../../src/solvers/digital.js";
import { DiagnosticCodes } from "../../src/core/diagnostics.js";

const registry = createDefaultRegistry();

function baseCircuit() {
  return Circuit.create({ schemaVersion: 1, mode: "digital", groundNet: "GND" });
}

test("solveDigital evaluates AND gate", () => {
  const circuit = baseCircuit();
  circuit.addComponent({
    name: "G1",
    type: "gate_and",
    pins: { in1: "A", in2: "B", out: "Y" },
  });

  const result = solveDigital(circuit, { inputs: { A: 1, B: 0 } });
  assert.equal(result.status, "ok");
  assert.equal(result.nodeVoltages.Y, 0);

  const result2 = solveDigital(circuit, { inputs: { A: 1, B: 1 } });
  assert.equal(result2.status, "ok");
  assert.equal(result2.nodeVoltages.Y, 1);
});

test("solveDigital evaluates OR gate", () => {
  const circuit = baseCircuit();
  circuit.addComponent({
    name: "G1",
    type: "gate_or",
    pins: { in1: "A", in2: "B", out: "Y" },
  });

  const result = solveDigital(circuit, { inputs: { A: 0, B: 1 } });
  assert.equal(result.status, "ok");
  assert.equal(result.nodeVoltages.Y, 1);
});

test("solveDigital evaluates NOT gate", () => {
  const circuit = baseCircuit();
  circuit.addComponent({
    name: "G1",
    type: "gate_not",
    pins: { in1: "A", out: "Y" },
  });

  const result = solveDigital(circuit, { inputs: { A: 1 } });
  assert.equal(result.status, "ok");
  assert.equal(result.nodeVoltages.Y, 0);
});

test("solveDigital propagates through gate chain", () => {
  const circuit = baseCircuit();
  circuit.addComponent({
    name: "G1",
    type: "gate_and",
    pins: { in1: "A", in2: "B", out: "N1" },
  });
  circuit.addComponent({
    name: "G2",
    type: "gate_not",
    pins: { in1: "N1", out: "Y" },
  });

  const result = solveDigital(circuit, { inputs: { A: 1, B: 1 } });
  assert.equal(result.status, "ok");
  assert.equal(result.nodeVoltages.Y, 0);
});

test("solveDigital errors on missing input", () => {
  const circuit = baseCircuit();
  circuit.addComponent({
    name: "G1",
    type: "gate_and",
    pins: { in1: "A", in2: "B", out: "Y" },
  });

  const result = solveDigital(circuit, { inputs: { A: 1 } });
  assert.equal(result.status, "error");
  assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.missingDigitalInput));
});

// Registry usage ensures the new component types are available
void registry;
