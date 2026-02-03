import type { Circuit } from "../core/circuit.js";
import type { Diagnostic } from "../core/types.js";
import { asMessage, DiagnosticCodes, errorDiagnostic, warningDiagnostic } from "../core/diagnostics.js";
import type { ComponentRegistry } from "../components/registry.js";
import { buildNetlist } from "../netlist/builder.js";
import type { Netlist, NetlistElement } from "../netlist/types.js";
import { solveLinearSystem } from "./linear.js";
import type { DebugInfo, SimulationResult } from "./types.js";

export interface SolveDCOptions {
  registry?: ComponentRegistry;
  tolerance?: number;
  shortCircuitThreshold?: number;
  switchClosedResistance?: number;
}

const DEFAULT_SHORT_CIRCUIT_THRESHOLD = 10;

export function solveDC(
  input: Circuit | Netlist,
  options: SolveDCOptions = {},
): SimulationResult {
  const warnings: Diagnostic[] = [];
  const errors: Diagnostic[] = [];

  const netlistResult = isNetlist(input)
    ? { ok: true as const, netlist: input, warnings: [] as Diagnostic[] }
    : buildNetlistFromCircuit(input, options, errors);

  if (!netlistResult.ok) {
    return buildErrorResult("dc", netlistResult.errors, netlistResult.warnings);
  }

  const netlist = netlistResult.netlist;
  if (!netlist.nodes.length) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.singularMatrix,
        "Netlist contains no nodes.",
      ),
    );
    return buildErrorResult("dc", errors, netlistResult.warnings);
  }

  const stampResult = stampMna(netlist);
  if (!stampResult.ok) {
    return buildErrorResult("dc", stampResult.errors, netlistResult.warnings);
  }

  const { matrix, rhs, voltageSourceOrder, nonGroundCount } = stampResult;
  const linearOptions = options.tolerance !== undefined ? { tolerance: options.tolerance } : undefined;
  const solution = solveLinearSystem(matrix, rhs, linearOptions);

  if (!solution.ok) {
    errors.push(solution.error);
    return buildErrorResult("dc", errors, netlistResult.warnings);
  }

  const nodeVoltages = buildNodeVoltages(netlist, solution.solution);
  const { componentCurrents, componentPower } = computeElementResults(
    netlist,
    nodeVoltages,
    solution.solution,
    voltageSourceOrder,
    nonGroundCount,
  );

  const shortCircuitThreshold = options.shortCircuitThreshold ?? DEFAULT_SHORT_CIRCUIT_THRESHOLD;
  for (const [component, current] of Object.entries(componentCurrents)) {
    if (typeof current === "number" && Math.abs(current) > shortCircuitThreshold) {
      warnings.push(
        warningDiagnostic(
          DiagnosticCodes.shortCircuitSuspected,
          `Large current detected on component "${component}" (${current} A).`,
          { component, details: { current, threshold: shortCircuitThreshold } },
        ),
      );
    }
  }

  const debug: DebugInfo = {
    nodeCount: netlist.nodes.length,
    voltageSourceCount: voltageSourceOrder.length,
    matrixSize: matrix.length,
  };

  return {
    status: "ok",
    mode: "dc",
    nodeVoltages,
    componentCurrents,
    componentPower,
    errors: [],
    warnings: warnings.map(asMessage).concat(netlistResult.warnings.map(asMessage)),
    debug,
  };
}

function isNetlist(input: Circuit | Netlist): input is Netlist {
  return (input as Netlist).nodes !== undefined && (input as Netlist).elements !== undefined;
}

function buildNetlistFromCircuit(
  circuit: Circuit,
  options: SolveDCOptions,
  errors: Diagnostic[],
) {
  if (!options.registry) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.missingRegistry,
        "Component registry is required to build a netlist from a Circuit.",
      ),
    );
    return { ok: false as const, errors, warnings: [] as Diagnostic[] };
  }

  return buildNetlist(circuit, {
    registry: options.registry,
    ...(options.switchClosedResistance !== undefined
      ? { switchClosedResistance: options.switchClosedResistance }
      : {}),
  });
}

function buildErrorResult(
  mode: SimulationResult["mode"],
  errors: Diagnostic[],
  warnings: Diagnostic[] = [],
): SimulationResult {
  return {
    status: "error",
    mode,
    nodeVoltages: {},
    componentCurrents: {},
    componentPower: {},
    errors: errors.map(asMessage),
    warnings: warnings.map(asMessage),
  };
}

function stampMna(netlist: Netlist):
  | { ok: true; matrix: number[][]; rhs: number[]; voltageSourceOrder: NetlistElement[]; nonGroundCount: number }
  | { ok: false; errors: Diagnostic[] } {
  const groundNodeId = netlist.groundNodeId;
  const nodeIndex = new Map<number, number>();
  const errors: Diagnostic[] = [];
  let index = 0;

  for (const node of netlist.nodes) {
    if (node.id === groundNodeId) {
      nodeIndex.set(node.id, -1);
      continue;
    }
    nodeIndex.set(node.id, index);
    index += 1;
  }

  const voltageSources = netlist.elements.filter((element) => element.type === "voltage_source");
  const nonGroundCount = index;
  const totalUnknowns = nonGroundCount + voltageSources.length;

  const matrix = Array.from({ length: totalUnknowns }, () =>
    Array.from({ length: totalUnknowns }, () => 0),
  );
  const rhs = Array.from({ length: totalUnknowns }, () => 0);

  for (const element of netlist.elements) {
    if (element.type === "resistor") {
      const ok = stampResistor(element, nodeIndex, matrix, errors);
      if (!ok) {
        continue;
      }
    }
  }

  for (const element of netlist.elements) {
    if (element.type === "current_source") {
      stampCurrentSource(element, nodeIndex, rhs);
    }
  }

  voltageSources.forEach((source, sourceIndex) => {
    stampVoltageSource(source, sourceIndex, nodeIndex, matrix, rhs, nonGroundCount);
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, matrix, rhs, voltageSourceOrder: voltageSources, nonGroundCount };
}

function stampResistor(
  element: NetlistElement,
  nodeIndex: Map<number, number>,
  matrix: number[][],
  errors: Diagnostic[],
): boolean {
  const [nodeA, nodeB] = element.nodes;
  const resistance = element.params.resistance;
  if (typeof resistance !== "number" || !Number.isFinite(resistance) || resistance <= 0) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidPropertyValue,
        `Invalid resistance value for component \"${element.component}\".`,
        {
          component: element.component,
          details: {
            prop: "resistance",
            value: typeof resistance === "number" ? resistance : "undefined",
          },
        },
      ),
    );
    return false;
  }

  const conductance = 1 / resistance;
  const indexA = nodeIndex.get(nodeA) ?? -1;
  const indexB = nodeIndex.get(nodeB) ?? -1;

  if (indexA >= 0) {
    const rowA = matrix[indexA];
    if (rowA) {
      rowA[indexA] = (rowA[indexA] ?? 0) + conductance;
    }
  }
  if (indexB >= 0) {
    const rowB = matrix[indexB];
    if (rowB) {
      rowB[indexB] = (rowB[indexB] ?? 0) + conductance;
    }
  }
  if (indexA >= 0 && indexB >= 0) {
    const rowA = matrix[indexA];
    const rowB = matrix[indexB];
    if (rowA) {
      rowA[indexB] = (rowA[indexB] ?? 0) - conductance;
    }
    if (rowB) {
      rowB[indexA] = (rowB[indexA] ?? 0) - conductance;
    }
  }
  return true;
}

function stampVoltageSource(
  element: NetlistElement,
  sourceIndex: number,
  nodeIndex: Map<number, number>,
  matrix: number[][],
  rhs: number[],
  nonGroundCount: number,
): void {
  const [nodeP, nodeN] = element.nodes;
  const voltage = element.params.voltage ?? 0;
  const indexP = nodeIndex.get(nodeP) ?? -1;
  const indexN = nodeIndex.get(nodeN) ?? -1;
  const row = nonGroundCount + sourceIndex;

  if (indexP >= 0) {
    const rowP = matrix[indexP];
    const rowSrc = matrix[row];
    if (rowP) {
      rowP[row] = (rowP[row] ?? 0) + 1;
    }
    if (rowSrc) {
      rowSrc[indexP] = (rowSrc[indexP] ?? 0) + 1;
    }
  }
  if (indexN >= 0) {
    const rowN = matrix[indexN];
    const rowSrc = matrix[row];
    if (rowN) {
      rowN[row] = (rowN[row] ?? 0) - 1;
    }
    if (rowSrc) {
      rowSrc[indexN] = (rowSrc[indexN] ?? 0) - 1;
    }
  }

  rhs[row] = voltage;
}

function stampCurrentSource(
  element: NetlistElement,
  nodeIndex: Map<number, number>,
  rhs: number[],
): void {
  const [nodeP, nodeN] = element.nodes;
  const current = element.params.current;
  if (typeof current !== "number" || !Number.isFinite(current)) {
    return;
  }
  const indexP = nodeIndex.get(nodeP) ?? -1;
  const indexN = nodeIndex.get(nodeN) ?? -1;

  if (indexP >= 0) {
    rhs[indexP] = (rhs[indexP] ?? 0) - current;
  }
  if (indexN >= 0) {
    rhs[indexN] = (rhs[indexN] ?? 0) + current;
  }
}

function buildNodeVoltages(netlist: Netlist, solution: number[]): Record<string, number> {
  const voltages: Record<string, number> = {};
  const groundNodeId = netlist.groundNodeId;
  let index = 0;

  for (const node of netlist.nodes) {
    if (node.id === groundNodeId) {
      voltages[node.name] = 0;
      continue;
    }
    voltages[node.name] = solution[index] ?? 0;
    index += 1;
  }

  return voltages;
}

function computeElementResults(
  netlist: Netlist,
  nodeVoltages: Record<string, number>,
  solution: number[],
  voltageSourceOrder: NetlistElement[],
  nonGroundCount: number,
): {
  componentCurrents: Record<string, number>;
  componentPower: Record<string, number>;
} {
  const componentCurrents: Record<string, number> = {};
  const componentPower: Record<string, number> = {};
  const nodeNameById = new Map<number, string>();
  for (const node of netlist.nodes) {
    nodeNameById.set(node.id, node.name);
  }

  for (const element of netlist.elements) {
    const [nodeA, nodeB] = element.nodes;
    const voltageA = nodeVoltages[nodeNameById.get(nodeA) ?? ""] ?? 0;
    const voltageB = nodeVoltages[nodeNameById.get(nodeB) ?? ""] ?? 0;
    const voltageDrop = voltageA - voltageB;

    if (element.type === "resistor") {
      const resistance = element.params.resistance;
      if (typeof resistance !== "number" || !Number.isFinite(resistance) || resistance === 0) {
        continue;
      }
      const current = voltageDrop / resistance;
      componentCurrents[element.component] = current;
      componentPower[element.component] = voltageDrop * current;
    }

    if (element.type === "current_source") {
      const current = element.params.current;
      if (typeof current !== "number" || !Number.isFinite(current)) {
        continue;
      }
      componentCurrents[element.component] = current;
      componentPower[element.component] = voltageDrop * current;
    }
  }

  voltageSourceOrder.forEach((element, index) => {
    const currentIndex = nonGroundCount + index;
    const rawCurrent = solution[currentIndex] ?? 0;
    const current = -rawCurrent;
    const [nodeA, nodeB] = element.nodes;
    const voltageA = nodeVoltages[nodeNameById.get(nodeA) ?? ""] ?? 0;
    const voltageB = nodeVoltages[nodeNameById.get(nodeB) ?? ""] ?? 0;
    const voltageDrop = voltageA - voltageB;
    componentCurrents[element.component] = current;
    componentPower[element.component] = voltageDrop * current;
  });

  return { componentCurrents, componentPower };
}
