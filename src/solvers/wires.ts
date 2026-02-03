import type { Circuit } from "../core/circuit.js";
import type { Diagnostic, DiagnosticMessage } from "../core/types.js";
import type { WireDocument, WireEndpoint } from "../core/wires.js";
import { DiagnosticCodes, asMessage, errorDiagnostic, warningDiagnostic } from "../core/diagnostics.js";
import { solveLinearSystem } from "./linear.js";
import type { SimulationResult } from "./types.js";

export interface WireCurrentsOptions {
  includeNetFlowMagnitude?: boolean;
  tolerance?: number;
}

export interface WireCurrentsResult {
  wireCurrents: Record<string, number>;
  netFlowMagnitude?: Record<string, number>;
  errors: DiagnosticMessage[];
  warnings: DiagnosticMessage[];
}

interface NodeInfo {
  key: string;
  endpoint: WireEndpoint;
}

interface WireEdge {
  id: string;
  from: number;
  to: number;
}

const DEFAULT_TOLERANCE = 1e-9;

export function computeWireCurrents(
  circuit: Circuit,
  result: SimulationResult,
  options: WireCurrentsOptions = {},
): WireCurrentsResult {
  const errors: DiagnosticMessage[] = [];
  const warnings: DiagnosticMessage[] = [];
  const wireCurrents: Record<string, number> = {};
  const netFlowMagnitude: Record<string, number> = {};

  if (result.status !== "ok") {
    errors.push(
      asMessage(
        errorDiagnostic(
          DiagnosticCodes.wireCurrentsRequiresOk,
          "Wire currents require a successful simulation result.",
        ),
      ),
    );
    return { wireCurrents, errors, warnings };
  }

  const wires = circuit.listWires();
  if (wires.length === 0) {
    warnings.push(
      asMessage(
        warningDiagnostic(
          DiagnosticCodes.wireLayoutMissing,
          "No wire layout data provided; wire currents not computed.",
        ),
      ),
    );
    return { wireCurrents, errors, warnings };
  }

  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const pinCurrents = result.componentPinCurrents ?? {};
  const components = circuit.listComponents();
  const componentMap = new Map(components.map((component) => [component.name, component]));
  const junctions = circuit.listJunctions();
  const junctionMap = new Map(junctions.map((junction) => [junction.id, junction]));

  const wiresByNet = new Map<string, WireDocument[]>();
  const sortedWires = wires.slice().sort((a, b) => a.id.localeCompare(b.id));
  for (const wire of sortedWires) {
    const list = wiresByNet.get(wire.net) ?? [];
    list.push(wire);
    wiresByNet.set(wire.net, list);
  }

  for (const [net, netWires] of wiresByNet.entries()) {
    const nodes: NodeInfo[] = [];
    const nodeIndex = new Map<string, number>();
    const edges: WireEdge[] = [];

    const ensureNode = (endpoint: WireEndpoint): number | null => {
      const key = nodeKey(endpoint);
      if (!key) {
        return null;
      }
      const existing = nodeIndex.get(key);
      if (existing !== undefined) {
        return existing;
      }
      const index = nodes.length;
      nodes.push({ key, endpoint });
      nodeIndex.set(key, index);
      return index;
    };

    for (const wire of netWires) {
      if (!validateEndpoint(wire, wire.from, net, componentMap, junctionMap, errors)) {
        continue;
      }
      if (!validateEndpoint(wire, wire.to, net, componentMap, junctionMap, errors)) {
        continue;
      }
      const fromIndex = ensureNode(wire.from);
      const toIndex = ensureNode(wire.to);
      if (fromIndex === null || toIndex === null) {
        errors.push(
          asMessage(
            errorDiagnostic(
              DiagnosticCodes.invalidWireEndpoint,
              `Wire "${wire.id}" has an invalid endpoint.`,
            ),
          ),
        );
        continue;
      }
      edges.push({ id: wire.id, from: fromIndex, to: toIndex });
    }

    if (nodes.length === 0 || edges.length === 0) {
      continue;
    }

    if (!isConnected(nodes.length, edges)) {
      errors.push(
        asMessage(
          errorDiagnostic(
            DiagnosticCodes.wireGraphDisconnected,
            `Wire layout for net "${net}" is disconnected.`,
            { net },
          ),
        ),
      );
      continue;
    }

    const injections = new Array<number>(nodes.length).fill(0);
    let maxAbsPinCurrent = 0;

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (!node) {
        continue;
      }
      if (node.endpoint.kind !== "pin") {
        continue;
      }
      const current = pinCurrents[node.endpoint.component]?.[node.endpoint.pin];
      if (typeof current !== "number") {
        warnings.push(
          asMessage(
            warningDiagnostic(
              DiagnosticCodes.wireMissingPinCurrent,
              `Missing pin current for "${node.endpoint.component}.${node.endpoint.pin}" on net "${net}".`,
              { component: node.endpoint.component, net },
            ),
          ),
        );
        continue;
      }
      injections[i] = (injections[i] ?? 0) - current;
      maxAbsPinCurrent = Math.max(maxAbsPinCurrent, Math.abs(current));
    }

    const sumInjection = injections.reduce((acc, value) => acc + value, 0);
    if (Math.abs(sumInjection) > tolerance) {
      warnings.push(
        asMessage(
          warningDiagnostic(
            DiagnosticCodes.wireNetMismatch,
            `Net "${net}" does not satisfy KCL within tolerance (${sumInjection}).`,
            { net, details: { sumInjection } },
          ),
        ),
      );
    }

    const potentials = solveNetPotentials(nodes.length, edges, injections, tolerance);
    if (!potentials.ok) {
      errors.push(asMessage(potentials.error));
      continue;
    }

    for (const edge of edges) {
      const fromV = potentials.values[edge.from] ?? 0;
      const toV = potentials.values[edge.to] ?? 0;
      wireCurrents[edge.id] = fromV - toV;
    }

    if (options.includeNetFlowMagnitude ?? true) {
      netFlowMagnitude[net] = maxAbsPinCurrent;
    }
  }

  return {
    wireCurrents,
    ...(options.includeNetFlowMagnitude ?? true ? { netFlowMagnitude } : {}),
    errors,
    warnings,
  };
}

function nodeKey(endpoint: WireEndpoint): string | null {
  if (endpoint.kind === "pin") {
    return `pin:${endpoint.component}.${endpoint.pin}`;
  }
  if (endpoint.kind === "junction") {
    return `junction:${endpoint.id}`;
  }
  return null;
}

function validateEndpoint(
  wire: WireDocument,
  endpoint: WireEndpoint,
  net: string,
  componentMap: Map<string, { pins: Record<string, string> }>,
  junctionMap: Map<string, { net: string }>,
  errors: DiagnosticMessage[],
): boolean {
  if (endpoint.kind === "pin") {
    const component = componentMap.get(endpoint.component);
    if (!component) {
      errors.push(
        asMessage(
          errorDiagnostic(
            DiagnosticCodes.invalidWireEndpoint,
            `Wire "${wire.id}" references missing component "${endpoint.component}".`,
          ),
        ),
      );
      return false;
    }
    const pinNet = component.pins[endpoint.pin];
    if (!pinNet) {
      errors.push(
        asMessage(
          errorDiagnostic(
            DiagnosticCodes.invalidWireEndpoint,
            `Wire "${wire.id}" references missing pin "${endpoint.pin}" on component "${endpoint.component}".`,
          ),
        ),
      );
      return false;
    }
    if (pinNet !== net) {
      errors.push(
        asMessage(
          errorDiagnostic(
            DiagnosticCodes.wireNetMismatch,
            `Wire "${wire.id}" net "${net}" does not match pin net "${pinNet}".`,
            { component: endpoint.component, net: pinNet },
          ),
        ),
      );
      return false;
    }
    return true;
  }
  if (endpoint.kind === "junction") {
    const junction = junctionMap.get(endpoint.id);
    if (!junction) {
      errors.push(
        asMessage(
          errorDiagnostic(
            DiagnosticCodes.invalidWireEndpoint,
            `Wire "${wire.id}" references missing junction "${endpoint.id}".`,
          ),
        ),
      );
      return false;
    }
    if (junction.net !== net) {
      errors.push(
        asMessage(
          errorDiagnostic(
            DiagnosticCodes.wireNetMismatch,
            `Wire "${wire.id}" net "${net}" does not match junction net "${junction.net}".`,
            { net: junction.net },
          ),
        ),
      );
      return false;
    }
    return true;
  }
  errors.push(
    asMessage(
      errorDiagnostic(
        DiagnosticCodes.invalidWireEndpoint,
        `Wire "${wire.id}" endpoint kind is invalid.`,
      ),
    ),
  );
  return false;
}

function isConnected(nodeCount: number, edges: WireEdge[]): boolean {
  if (nodeCount === 0) {
    return true;
  }
  const adjacency: number[][] = Array.from({ length: nodeCount }, () => []);
  for (const edge of edges) {
    adjacency[edge.from]?.push(edge.to);
    adjacency[edge.to]?.push(edge.from);
  }
  const visited = new Array<boolean>(nodeCount).fill(false);
  const stack = [0];
  visited[0] = true;
  while (stack.length) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }
    const neighbors = adjacency[node] ?? [];
    for (const next of neighbors) {
      if (!visited[next]) {
        visited[next] = true;
        stack.push(next);
      }
    }
  }
  return visited.every(Boolean);
}

function solveNetPotentials(
  nodeCount: number,
  edges: WireEdge[],
  injections: number[],
  tolerance: number,
): { ok: true; values: number[] } | { ok: false; error: Diagnostic } {
  if (nodeCount === 1) {
    return { ok: true, values: [0] };
  }

  const matrix = Array.from({ length: nodeCount }, () =>
    Array.from({ length: nodeCount }, () => 0),
  );
  for (const edge of edges) {
    const rowFrom = matrix[edge.from];
    const rowTo = matrix[edge.to];
    if (rowFrom) {
      rowFrom[edge.from] = (rowFrom[edge.from] ?? 0) + 1;
      rowFrom[edge.to] = (rowFrom[edge.to] ?? 0) - 1;
    }
    if (rowTo) {
      rowTo[edge.to] = (rowTo[edge.to] ?? 0) + 1;
      rowTo[edge.from] = (rowTo[edge.from] ?? 0) - 1;
    }
  }

  const reduced = Array.from({ length: nodeCount - 1 }, () =>
    Array.from({ length: nodeCount - 1 }, () => 0),
  );
  const rhs = new Array<number>(nodeCount - 1).fill(0);

  for (let i = 1; i < nodeCount; i += 1) {
    rhs[i - 1] = injections[i] ?? 0;
    for (let j = 1; j < nodeCount; j += 1) {
      const row = reduced[i - 1];
      if (row) {
        row[j - 1] = matrix[i]?.[j] ?? 0;
      }
    }
  }

  const solution = solveLinearSystem(reduced, rhs, { tolerance });
  if (!solution.ok) {
    return { ok: false, error: solution.error };
  }

  const values = new Array<number>(nodeCount).fill(0);
  for (let i = 1; i < nodeCount; i += 1) {
    values[i] = solution.solution[i - 1] ?? 0;
  }

  return { ok: true, values };
}
