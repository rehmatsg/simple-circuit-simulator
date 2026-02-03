import type { Circuit } from "../core/circuit.js";
import type { Diagnostic } from "../core/types.js";
import { asMessage, DiagnosticCodes, errorDiagnostic } from "../core/diagnostics.js";
import { sortDiagnostics } from "../core/determinism.js";
import type { SimulationResult } from "./types.js";

export interface SolveDigitalOptions {
  inputs?: Record<string, number | boolean>;
  maxIterations?: number;
  strictInputs?: boolean;
}

const DEFAULT_MAX_ITERATIONS = 25;

const GATE_DEFS = {
  gate_and: {
    inputs: ["in1", "in2"],
    output: "out",
  },
  gate_or: {
    inputs: ["in1", "in2"],
    output: "out",
  },
  gate_not: {
    inputs: ["in1"],
    output: "out",
  },
} as const;

type GateType = keyof typeof GATE_DEFS;

export function solveDigital(
  circuit: Circuit,
  options: SolveDigitalOptions = {},
): SimulationResult {
  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];

  const netValues: Record<string, number> = {};
  const inputs = options.inputs ?? {};
  for (const [net, value] of Object.entries(inputs)) {
    netValues[net] = normalizeDigitalValue(value);
  }

  const components = circuit
    .listComponents()
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const gates = components.filter((component) => isGate(component.type));

  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const strictInputs = options.strictInputs ?? true;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;

    for (const gate of gates) {
      const gateDef = GATE_DEFS[gate.type as GateType];
      const outputPin = gateDef.output;
      const outputNet = gate.pins[outputPin];
      if (!outputNet) {
        errors.push(
          errorDiagnostic(
            DiagnosticCodes.missingPin,
            `Missing required pin "${outputPin}" for component "${gate.name}".`,
            { component: gate.name },
          ),
        );
        continue;
      }

      const inputValues: number[] = [];
      let missing = false;

      for (const pin of gateDef.inputs) {
        const inputNet = gate.pins[pin];
        if (!inputNet) {
          errors.push(
            errorDiagnostic(
              DiagnosticCodes.missingPin,
              `Missing required pin "${pin}" for component "${gate.name}".`,
              { component: gate.name },
            ),
          );
          missing = true;
          continue;
        }

        const value = netValues[inputNet];
        if (value === undefined) {
          if (strictInputs) {
            errors.push(
              errorDiagnostic(
                DiagnosticCodes.missingDigitalInput,
                `Missing digital input for net "${inputNet}".`,
                { component: gate.name, net: inputNet },
              ),
            );
          }
          missing = true;
          continue;
        }
        inputValues.push(value);
      }

      if (missing) {
        continue;
      }

      const output = computeGateOutput(gate.type as GateType, inputValues);
      if (netValues[outputNet] !== output) {
        netValues[outputNet] = output;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  if (errors.length > 0) {
    return {
      status: "error",
      mode: "digital",
      nodeVoltages: {},
      componentCurrents: {},
      componentPinCurrents: {},
      componentPower: {},
      errors: sortDiagnostics(errors.map(asMessage)),
      warnings: sortDiagnostics(warnings.map(asMessage)),
    };
  }

  return {
    status: "ok",
    mode: "digital",
    nodeVoltages: netValues,
    componentCurrents: {},
    componentPinCurrents: {},
    componentPower: {},
    errors: [],
    warnings: [],
  };
}

function isGate(type: string): type is GateType {
  return type in GATE_DEFS;
}

function normalizeDigitalValue(value: number | boolean): number {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value === 0 ? 0 : 1;
}

function computeGateOutput(type: GateType, inputs: number[]): number {
  const a = inputs[0] ?? 0;
  const b = inputs[1] ?? 0;
  switch (type) {
    case "gate_and":
      return a === 1 && b === 1 ? 1 : 0;
    case "gate_or":
      return a === 1 || b === 1 ? 1 : 0;
    case "gate_not":
      return a === 1 ? 0 : 1;
  }
}
