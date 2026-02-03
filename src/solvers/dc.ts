import type { Circuit } from "../core/circuit.js";
import type { Diagnostic } from "../core/types.js";
import { asMessage, DiagnosticCodes, errorDiagnostic, warningDiagnostic } from "../core/diagnostics.js";
import { sortDiagnostics } from "../core/determinism.js";
import type { ComponentRegistry } from "../components/registry.js";
import { buildNetlist } from "../netlist/builder.js";
import type { Netlist, NetlistElement } from "../netlist/types.js";
import { solveLinearSystem } from "./linear.js";
import type { DebugInfo, SimulationResult } from "./types.js";

export interface SolveDCOptions {
  registry?: ComponentRegistry;
  tolerance?: number;
  nonlinearTolerance?: number;
  maxIterations?: number;
  nonlinearDamping?: number;
  shortCircuitThreshold?: number;
  switchClosedResistance?: number;
}

const DEFAULT_SHORT_CIRCUIT_THRESHOLD = 10;
const DEFAULT_NONLINEAR_TOLERANCE = 1e-6;
const DEFAULT_MAX_ITERATIONS = 50;
const MOSFET_SMOOTHING = 0.1;

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

  const hasNonlinear = netlist.elements.some((element) =>
    element.type === "diode" ||
    element.type === "mosfet_n" ||
    element.type === "mosfet_p",
  );

  const nonlinearOptions: NonlinearSolveOptions = {};
  if (options.tolerance !== undefined) {
    nonlinearOptions.tolerance = options.tolerance;
  }
  if (options.nonlinearTolerance !== undefined) {
    nonlinearOptions.nonlinearTolerance = options.nonlinearTolerance;
  }
  if (options.maxIterations !== undefined) {
    nonlinearOptions.maxIterations = options.maxIterations;
  }
  if (options.nonlinearDamping !== undefined) {
    nonlinearOptions.nonlinearDamping = options.nonlinearDamping;
  }

  const stampResult = hasNonlinear
    ? solveNonlinearMna(netlist, nonlinearOptions)
    : solveLinearMna(netlist, options.tolerance);

  if (!stampResult.ok) {
    return buildErrorResult("dc", stampResult.errors, netlistResult.warnings);
  }

  const { solution, voltageSourceOrder, nonGroundCount } = stampResult;
  const nodeVoltages = buildNodeVoltages(netlist, solution);
  const { componentCurrents, componentPinCurrents, componentPower } = computeElementResults(
    netlist,
    nodeVoltages,
    solution,
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
    matrixSize: nonGroundCount + voltageSourceOrder.length,
  };

  return {
    status: "ok",
    mode: "dc",
    nodeVoltages,
    componentCurrents,
    componentPinCurrents,
    componentPower,
    errors: [],
    warnings: sortDiagnostics(
      warnings.map(asMessage).concat(netlistResult.warnings.map(asMessage)),
    ),
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
    componentPinCurrents: {},
    componentPower: {},
    errors: sortDiagnostics(errors.map(asMessage)),
    warnings: sortDiagnostics(warnings.map(asMessage)),
  };
}

function solveLinearMna(netlist: Netlist, tolerance?: number):
  | { ok: true; solution: number[]; voltageSourceOrder: NetlistElement[]; nonGroundCount: number }
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

  const linearOptions = tolerance !== undefined ? { tolerance } : undefined;
  const solution = solveLinearSystem(matrix, rhs, linearOptions);
  if (!solution.ok) {
    return { ok: false, errors: [solution.error] };
  }

  return { ok: true, solution: solution.solution, voltageSourceOrder: voltageSources, nonGroundCount };
}

interface NonlinearSolveOptions {
  tolerance?: number;
  nonlinearTolerance?: number;
  maxIterations?: number;
  nonlinearDamping?: number;
}

function solveNonlinearMna(
  netlist: Netlist,
  options: NonlinearSolveOptions,
):
  | { ok: true; solution: number[]; voltageSourceOrder: NetlistElement[]; nonGroundCount: number }
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
  const nonlinearTolerance = options.nonlinearTolerance ?? DEFAULT_NONLINEAR_TOLERANCE;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const dampingRaw = options.nonlinearDamping ?? 0.5;
  const damping = clamp(dampingRaw, 0.05, 1);

  let solution = Array.from({ length: totalUnknowns }, () => 0);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const matrix = Array.from({ length: totalUnknowns }, () =>
      Array.from({ length: totalUnknowns }, () => 0),
    );
    const rhs = Array.from({ length: totalUnknowns }, () => 0);

    for (const element of netlist.elements) {
      if (element.type === "resistor") {
        stampResistor(element, nodeIndex, matrix, errors);
      }
      if (element.type === "current_source") {
        stampCurrentSource(element, nodeIndex, rhs);
      }
      if (element.type === "diode") {
        stampDiode(element, nodeIndex, matrix, rhs, solution);
      }
      if (element.type === "mosfet_n" || element.type === "mosfet_p") {
        stampMosfet(element, nodeIndex, matrix, solution);
      }
    }

    voltageSources.forEach((source, sourceIndex) => {
      stampVoltageSource(source, sourceIndex, nodeIndex, matrix, rhs, nonGroundCount);
    });

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    const linearOptions = options.tolerance !== undefined ? { tolerance: options.tolerance } : undefined;
    const linearSolution = solveLinearSystem(matrix, rhs, linearOptions);
    if (!linearSolution.ok) {
      return { ok: false, errors: [linearSolution.error] };
    }

    const nextSolution = linearSolution.solution;
    let maxDeltaRaw = 0;
    for (let i = 0; i < nextSolution.length; i += 1) {
      const current = solution[i] ?? 0;
      const target = nextSolution[i] ?? 0;
      const delta = Math.abs(target - current);
      if (delta > maxDeltaRaw) {
        maxDeltaRaw = delta;
      }
    }

    const adaptiveDamping = Math.min(damping, 1 / Math.max(1, maxDeltaRaw));

    let maxDelta = 0;
    for (let i = 0; i < nextSolution.length; i += 1) {
      const current = solution[i] ?? 0;
      const target = nextSolution[i] ?? 0;
      const damped = current + adaptiveDamping * (target - current);
      nextSolution[i] = damped;
      const delta = Math.abs(damped - current);
      if (delta > maxDelta) {
        maxDelta = delta;
      }
    }

    solution = nextSolution;

    if (maxDelta <= nonlinearTolerance) {
      return { ok: true, solution, voltageSourceOrder: voltageSources, nonGroundCount };
    }
  }

  return {
    ok: false,
    errors: [
      errorDiagnostic(
        DiagnosticCodes.nonlinearConvergenceFailure,
        `Nonlinear solver did not converge within ${maxIterations} iterations.`,
      ),
    ],
  };
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

function stampDiode(
  element: NetlistElement,
  nodeIndex: Map<number, number>,
  matrix: number[][],
  rhs: number[],
  solution: number[],
): void {
  const [nodeA, nodeB] = element.nodes;
  const isat = element.params.is;
  const n = element.params.n;
  const vt = element.params.vt;

  if (
    typeof isat !== "number" ||
    typeof n !== "number" ||
    typeof vt !== "number" ||
    isat <= 0 ||
    n <= 0 ||
    vt <= 0
  ) {
    return;
  }

  const voltageA = nodeVoltage(nodeA, nodeIndex, solution);
  const voltageB = nodeVoltage(nodeB, nodeIndex, solution);
  const vd = voltageA - voltageB;
  const denom = n * vt;
  const expArg = clamp(vd / denom, -40, 40);
  const expVal = Math.exp(expArg);
  const current = isat * (expVal - 1);
  const conductance = (isat / denom) * expVal;
  const iEq = current - conductance * vd;

  stampConductance(nodeA, nodeB, conductance, nodeIndex, matrix);
  stampCurrentSourceRhs(nodeA, nodeB, iEq, nodeIndex, rhs);
}

function stampMosfet(
  element: NetlistElement,
  nodeIndex: Map<number, number>,
  matrix: number[][],
  solution: number[],
): void {
  const [drain, source] = element.nodes;
  const gateNode = element.params.gate;
  const bodyNode = element.params.body;
  const vth = element.params.vth;
  const ron = element.params.ron;
  const roff = element.params.roff;

  if (
    typeof gateNode !== "number" ||
    typeof bodyNode !== "number" ||
    typeof vth !== "number" ||
    typeof ron !== "number" ||
    typeof roff !== "number"
  ) {
    return;
  }

  const vg = nodeVoltage(gateNode, nodeIndex, solution);
  const vb = nodeVoltage(bodyNode, nodeIndex, solution);

  let control = 0;
  if (element.type === "mosfet_n") {
    control = vg - vb - vth;
  } else {
    control = vb - vg - vth;
  }

  const alpha = clamp(control / MOSFET_SMOOTHING, 0, 1);
  const resistance = roff + (ron - roff) * alpha;
  const conductance = 1 / resistance;
  stampConductance(drain, source, conductance, nodeIndex, matrix);
}

function stampConductance(
  nodeA: number,
  nodeB: number,
  conductance: number,
  nodeIndex: Map<number, number>,
  matrix: number[][],
): void {
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
}

function stampCurrentSourceRhs(
  nodeA: number,
  nodeB: number,
  current: number,
  nodeIndex: Map<number, number>,
  rhs: number[],
): void {
  const indexA = nodeIndex.get(nodeA) ?? -1;
  const indexB = nodeIndex.get(nodeB) ?? -1;

  if (indexA >= 0) {
    rhs[indexA] = (rhs[indexA] ?? 0) - current;
  }
  if (indexB >= 0) {
    rhs[indexB] = (rhs[indexB] ?? 0) + current;
  }
}

function nodeVoltage(
  nodeId: number,
  nodeIndex: Map<number, number>,
  solution: number[],
): number {
  const index = nodeIndex.get(nodeId) ?? -1;
  if (index < 0) {
    return 0;
  }
  return solution[index] ?? 0;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
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
  componentPinCurrents: Record<string, Record<string, number>>;
  componentPower: Record<string, number>;
} {
  const componentCurrents: Record<string, number> = {};
  const componentPinCurrents: Record<string, Record<string, number>> = {};
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
      recordPinCurrents(componentPinCurrents, element.component, element.pins, current);
      componentPower[element.component] = voltageDrop * current;
    }

    if (element.type === "current_source") {
      const current = element.params.current;
      if (typeof current !== "number" || !Number.isFinite(current)) {
        continue;
      }
      componentCurrents[element.component] = current;
      recordPinCurrents(componentPinCurrents, element.component, element.pins, current);
      componentPower[element.component] = voltageDrop * current;
    }

    if (element.type === "diode") {
      const diodeCurrent = computeDiodeCurrent(element, voltageDrop);
      if (diodeCurrent === null) {
        continue;
      }
      componentCurrents[element.component] = diodeCurrent;
      recordPinCurrents(componentPinCurrents, element.component, element.pins, diodeCurrent);
      componentPower[element.component] = voltageDrop * diodeCurrent;
    }

    if (element.type === "mosfet_n" || element.type === "mosfet_p") {
      const mosfetCurrent = computeMosfetCurrent(element, voltageDrop, nodeVoltages, nodeNameById);
      if (mosfetCurrent === null) {
        continue;
      }
      componentCurrents[element.component] = mosfetCurrent;
      recordPinCurrents(componentPinCurrents, element.component, element.pins, mosfetCurrent);
      componentPower[element.component] = voltageDrop * mosfetCurrent;
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
    recordVoltageSourcePinCurrents(componentPinCurrents, element.component, element.pins, current);
    componentPower[element.component] = voltageDrop * current;
  });

  return { componentCurrents, componentPinCurrents, componentPower };
}

function recordPinCurrents(
  componentPinCurrents: Record<string, Record<string, number>>,
  component: string,
  pins: string[] | undefined,
  current: number,
): void {
  if (!pins || pins.length < 2) {
    return;
  }
  const [pinA, pinB] = pins;
  if (!pinA || !pinB) {
    return;
  }
  const pinMap = componentPinCurrents[component] ?? {};
  pinMap[pinA] = (pinMap[pinA] ?? 0) + current;
  pinMap[pinB] = (pinMap[pinB] ?? 0) - current;
  componentPinCurrents[component] = pinMap;
}

function recordVoltageSourcePinCurrents(
  componentPinCurrents: Record<string, Record<string, number>>,
  component: string,
  pins: string[] | undefined,
  current: number,
): void {
  if (!pins || pins.length < 2) {
    return;
  }
  const [pinPos, pinNeg] = pins;
  if (!pinPos || !pinNeg) {
    return;
  }
  const pinMap = componentPinCurrents[component] ?? {};
  pinMap[pinPos] = (pinMap[pinPos] ?? 0) - current;
  pinMap[pinNeg] = (pinMap[pinNeg] ?? 0) + current;
  componentPinCurrents[component] = pinMap;
}

function computeDiodeCurrent(element: NetlistElement, voltageDrop: number): number | null {
  const isat = element.params.is;
  const n = element.params.n;
  const vt = element.params.vt;
  if (
    typeof isat !== "number" ||
    typeof n !== "number" ||
    typeof vt !== "number" ||
    isat <= 0 ||
    n <= 0 ||
    vt <= 0
  ) {
    return null;
  }
  const denom = n * vt;
  const expArg = clamp(voltageDrop / denom, -40, 40);
  return isat * (Math.exp(expArg) - 1);
}

function computeMosfetCurrent(
  element: NetlistElement,
  voltageDrop: number,
  nodeVoltages: Record<string, number>,
  nodeNameById: Map<number, string>,
): number | null {
  const gateNode = element.params.gate;
  const vth = element.params.vth;
  const ron = element.params.ron;
  const roff = element.params.roff;
  if (
    typeof gateNode !== "number" ||
    typeof vth !== "number" ||
    typeof ron !== "number" ||
    typeof roff !== "number"
  ) {
    return null;
  }

  const [drain, source] = element.nodes;
  const gateName = nodeNameById.get(gateNode) ?? "";
  const sourceName = nodeNameById.get(source) ?? "";
  const vg = nodeVoltages[gateName] ?? 0;
  const vs = nodeVoltages[sourceName] ?? 0;
  const vgs = vg - vs;

  let on = false;
  if (element.type === "mosfet_n") {
    on = vgs > vth;
  } else {
    const vsg = vs - vg;
    on = vsg > vth;
  }

  const resistance = on ? ron : roff;
  if (!Number.isFinite(resistance) || resistance === 0) {
    return null;
  }

  return voltageDrop / resistance;
}
