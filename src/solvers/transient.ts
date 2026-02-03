import type { Circuit } from "../core/circuit.js";
import type { Diagnostic } from "../core/types.js";
import { asMessage, DiagnosticCodes, errorDiagnostic } from "../core/diagnostics.js";
import { sortDiagnostics } from "../core/determinism.js";
import type { ComponentRegistry } from "../components/registry.js";
import { buildNetlist } from "../netlist/builder.js";
import { solveDC } from "./dc.js";
import type { SimulationResult } from "./types.js";

export interface TransientState {
  capacitorVoltages: Record<string, number>;
  inductorCurrents: Record<string, number>;
}

export interface TransientStepResult {
  status: "ok" | "error";
  mode: "transient";
  time: number;
  state: TransientState;
  result: SimulationResult;
  errors: ReturnType<typeof asMessage>[];
  warnings: ReturnType<typeof asMessage>[];
}

export interface TransientOptions {
  registry: ComponentRegistry;
  time: number;
  dt: number;
  state?: TransientState;
}

export function stepTransient(
  circuit: Circuit,
  options: TransientOptions,
): TransientStepResult {
  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];

  if (options.dt <= 0 || !Number.isFinite(options.dt)) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidValue,
        "Time step dt must be a positive number.",
      ),
    );
    return buildTransientError(options.time, options.dt, errors, warnings);
  }

  const netlistResult = buildNetlist(circuit, {
    registry: options.registry,
  });

  if (!netlistResult.ok) {
    return buildTransientError(options.time, options.dt, netlistResult.errors, netlistResult.warnings);
  }

  const state = options.state ?? {
    capacitorVoltages: {},
    inductorCurrents: {},
  };

  // Placeholder: use DC solve for now; transient stamping to be added in a future iteration.
  const dcResult = solveDC(netlistResult.netlist, { registry: options.registry });
  if (dcResult.status === "error") {
    return buildTransientError(options.time, options.dt, [], [], dcResult);
  }

  return {
    status: "ok",
    mode: "transient",
    time: options.time + options.dt,
    state,
    result: dcResult,
    errors: [],
    warnings: [],
  };
}

function buildTransientError(
  time: number,
  dt: number,
  errors: Diagnostic[],
  warnings: Diagnostic[],
  result?: SimulationResult,
): TransientStepResult {
  return {
    status: "error",
    mode: "transient",
    time: time + dt,
    state: {
      capacitorVoltages: {},
      inductorCurrents: {},
    },
    result:
      result ??
      {
        status: "error",
        mode: "transient",
        nodeVoltages: {},
        componentCurrents: {},
        componentPower: {},
        errors: sortDiagnostics(errors.map(asMessage)),
        warnings: sortDiagnostics(warnings.map(asMessage)),
      },
    errors: sortDiagnostics(errors.map(asMessage)),
    warnings: sortDiagnostics(warnings.map(asMessage)),
  };
}
