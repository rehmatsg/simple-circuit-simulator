import type { Circuit } from "../core/circuit.js";
import type { Diagnostic } from "../core/types.js";
import { DiagnosticCodes, errorDiagnostic } from "../core/diagnostics.js";
import { resolveNumberValue, type ResolveValueOptions } from "../core/value.js";
import type { ComponentDefinition, ComponentRegistry } from "../components/registry.js";
import type { Netlist, NetlistElement, NetlistNode, TerminalRef } from "./types.js";

export interface BuildNetlistOptions {
  registry: ComponentRegistry;
  switchClosedResistance?: number;
}

export type NetlistBuildResult =
  | { ok: true; netlist: Netlist; warnings: Diagnostic[] }
  | { ok: false; errors: Diagnostic[]; warnings: Diagnostic[] };

const DEFAULT_SWITCH_RON = 1e-3;

export function buildNetlist(
  circuit: Circuit,
  options: BuildNetlistOptions,
): NetlistBuildResult {
  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];

  const groundNet = circuit.groundNet;
  if (typeof groundNet !== "string" || groundNet.trim() === "") {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.missingGround,
        "groundNet must be a non-empty string.",
      ),
    );
    return { ok: false, errors, warnings };
  }

  const components = circuit
    .listComponents()
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const terminalsByNet = new Map<string, TerminalRef[]>();

  for (const component of components) {
    for (const [pin, net] of Object.entries(component.pins)) {
      if (typeof net !== "string" || net.trim() === "") {
        errors.push(
          errorDiagnostic(
            DiagnosticCodes.invalidNet,
            `Pin "${pin}" must connect to a non-empty net name.`,
            { component: component.name },
          ),
        );
        continue;
      }
      const terminals = terminalsByNet.get(net) ?? [];
      terminals.push({ component: component.name, pin });
      terminalsByNet.set(net, terminals);
    }
  }

  if (!terminalsByNet.has(groundNet)) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.floatingReference,
        `Ground net "${groundNet}" is not connected to any component pins.`,
      ),
    );
    return { ok: false, errors, warnings };
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  const otherNets = Array.from(terminalsByNet.keys())
    .filter((name) => name !== groundNet)
    .sort((a, b) => a.localeCompare(b));
  const sortedNets = [groundNet, ...otherNets];

  const nodeByName: Record<string, number> = {};
  const nodes: NetlistNode[] = sortedNets.map((name, index) => {
    nodeByName[name] = index;
    const terminals = terminalsByNet.get(name) ?? [];
    terminals.sort(compareTerminals);
    return {
      id: index,
      name,
      terminals,
    };
  });

  const elements: NetlistElement[] = [];

  for (const component of components) {
    const definition = options.registry.get(component.type);
    if (!definition) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.unknownComponentType,
          `Unknown component type "${component.type}".`,
          { component: component.name },
        ),
      );
      continue;
    }

    const element = buildElementFromComponent(
      component,
      definition,
      nodeByName,
      circuit.params,
      options,
      errors,
    );

    if (element) {
      elements.push(element);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  return {
    ok: true,
    netlist: {
      nodes,
      groundNodeId: 0,
      elements,
      nodeByName,
    },
    warnings,
  };
}

function buildElementFromComponent(
  component: { name: string; type: string; pins: Record<string, string>; props?: Record<string, unknown> },
  definition: ComponentDefinition,
  nodeByName: Record<string, number>,
  params: Record<string, number | string | boolean> | undefined,
  options: BuildNetlistOptions,
  errors: Diagnostic[],
): NetlistElement | null {
  switch (definition.type) {
    case "current_source":
      return buildCurrentSource(component, definition, nodeByName, params, errors);
    case "battery":
      return buildVoltageSource(component, definition, nodeByName, params, errors);
    case "resistor":
    case "bulb":
      return buildResistor(component, definition, nodeByName, params, errors);
    case "switch":
      return buildSwitch(component, definition, nodeByName, params, options, errors);
    default:
      return null;
  }
}

function buildVoltageSource(
  component: { name: string; pins: Record<string, string>; props?: Record<string, unknown> },
  definition: ComponentDefinition,
  nodeByName: Record<string, number>,
  params: Record<string, number | string | boolean> | undefined,
  errors: Diagnostic[],
): NetlistElement | null {
  const pos = resolveNode(component, "pos", nodeByName, errors);
  const neg = resolveNode(component, "neg", nodeByName, errors);
  const voltage = resolveNumericProp(component, definition, "voltage", params, errors);
  if (pos === null || neg === null || voltage === null) {
    return null;
  }

  return {
    id: component.name,
    type: "voltage_source",
    component: component.name,
    originalType: definition.type,
    nodes: [pos, neg],
    pins: ["pos", "neg"],
    params: { voltage },
  };
}

function buildCurrentSource(
  component: { name: string; pins: Record<string, string>; props?: Record<string, unknown> },
  definition: ComponentDefinition,
  nodeByName: Record<string, number>,
  params: Record<string, number | string | boolean> | undefined,
  errors: Diagnostic[],
): NetlistElement | null {
  const pos = resolveNode(component, "pos", nodeByName, errors);
  const neg = resolveNode(component, "neg", nodeByName, errors);
  const current = resolveNumericProp(component, definition, "current", params, errors);
  if (pos === null || neg === null || current === null) {
    return null;
  }

  return {
    id: component.name,
    type: "current_source",
    component: component.name,
    originalType: definition.type,
    nodes: [pos, neg],
    pins: ["pos", "neg"],
    params: { current },
  };
}

function buildResistor(
  component: { name: string; pins: Record<string, string>; props?: Record<string, unknown> },
  definition: ComponentDefinition,
  nodeByName: Record<string, number>,
  params: Record<string, number | string | boolean> | undefined,
  errors: Diagnostic[],
): NetlistElement | null {
  const a = resolveNode(component, "a", nodeByName, errors);
  const b = resolveNode(component, "b", nodeByName, errors);
  const resistance = resolveNumericProp(component, definition, "resistance", params, errors);
  if (a === null || b === null || resistance === null) {
    return null;
  }

  return {
    id: component.name,
    type: "resistor",
    component: component.name,
    originalType: definition.type,
    nodes: [a, b],
    pins: ["a", "b"],
    params: { resistance },
  };
}

function buildSwitch(
  component: { name: string; pins: Record<string, string>; props?: Record<string, unknown> },
  definition: ComponentDefinition,
  nodeByName: Record<string, number>,
  params: Record<string, number | string | boolean> | undefined,
  options: BuildNetlistOptions,
  errors: Diagnostic[],
): NetlistElement | null {
  const a = resolveNode(component, "a", nodeByName, errors);
  const b = resolveNode(component, "b", nodeByName, errors);
  const state = resolveEnumProp(component, definition, "state", errors);
  if (a === null || b === null || state === null) {
    return null;
  }

  if (state === "open") {
    return null;
  }

  const resistance = options.switchClosedResistance ?? DEFAULT_SWITCH_RON;

  return {
    id: component.name,
    type: "resistor",
    component: component.name,
    originalType: definition.type,
    nodes: [a, b],
    pins: ["a", "b"],
    params: { resistance },
  };
}

function resolveNode(
  component: { name: string; pins: Record<string, string> },
  pin: string,
  nodeByName: Record<string, number>,
  errors: Diagnostic[],
): number | null {
  if (!(pin in component.pins)) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.missingPin,
        `Missing required pin "${pin}" for component "${component.name}".`,
        { component: component.name },
      ),
    );
    return null;
  }

  const netName = component.pins[pin];
  if (!netName || !(netName in nodeByName)) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidNet,
        `Pin "${pin}" on component "${component.name}" references unknown net.`,
        { component: component.name },
      ),
    );
    return null;
  }

  const nodeId = nodeByName[netName];
  if (nodeId === undefined) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidNet,
        `Pin "${pin}" on component "${component.name}" references unknown net.`,
        { component: component.name },
      ),
    );
    return null;
  }

  return nodeId;
}

function resolveNumericProp(
  component: { name: string; props?: Record<string, unknown> },
  definition: ComponentDefinition,
  propName: string,
  params: Record<string, number | string | boolean> | undefined,
  errors: Diagnostic[],
): number | null {
  const propDef = definition.props?.[propName];
  if (!propDef || propDef.kind !== "number") {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.missingProperty,
        `Missing required property "${propName}".`,
        { component: component.name },
      ),
    );
    return null;
  }

  const valueExpr = getPropValue(component, definition, propName);
  if (valueExpr === undefined) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.missingProperty,
        `Missing required property "${propName}".`,
        { component: component.name },
      ),
    );
    return null;
  }

  if (typeof valueExpr !== "number" && typeof valueExpr !== "string") {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidPropertyValue,
        `Invalid value for property "${propName}": expected a numeric value.`,
        { component: component.name, details: { prop: propName, reason: "type_mismatch" } },
      ),
    );
    return null;
  }

  const resolveOptions: ResolveValueOptions = {};

  if (params !== undefined) {
    resolveOptions.params = params;
  }

  if (propDef.unit !== undefined) {
    resolveOptions.expectedUnit = propDef.unit;
  }

  if (propDef.allowUnitless !== undefined) {
    resolveOptions.allowUnitless = propDef.allowUnitless;
  }

  const resolved = resolveNumberValue(valueExpr, resolveOptions);

  if (!resolved.ok) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidPropertyValue,
        `Invalid value for property "${propName}": ${resolved.error.message}`,
        {
          component: component.name,
          details: { prop: propName, reason: resolved.error.code },
        },
      ),
    );
    return null;
  }

  return resolved.value.value;
}

function resolveEnumProp(
  component: { name: string; props?: Record<string, unknown> },
  definition: ComponentDefinition,
  propName: string,
  errors: Diagnostic[],
): string | null {
  const propDef = definition.props?.[propName];
  if (!propDef || propDef.kind !== "enum") {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.missingProperty,
        `Missing required property "${propName}".`,
        { component: component.name },
      ),
    );
    return null;
  }

  const valueExpr = getPropValue(component, definition, propName);
  if (valueExpr === undefined) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.missingProperty,
        `Missing required property "${propName}".`,
        { component: component.name },
      ),
    );
    return null;
  }

  if (typeof valueExpr !== "string") {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidPropertyValue,
        `Invalid value for property "${propName}": expected one of ${propDef.allowedValues.join(", ")}.`,
        { component: component.name, details: { prop: propName, reason: "type_mismatch" } },
      ),
    );
    return null;
  }

  if (!propDef.allowedValues.includes(valueExpr)) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidPropertyValue,
        `Invalid value for property "${propName}": expected one of ${propDef.allowedValues.join(", ")}.`,
        { component: component.name, details: { prop: propName, reason: "invalid_enum_value" } },
      ),
    );
    return null;
  }

  return valueExpr;
}

function getPropValue(
  component: { props?: Record<string, unknown> },
  definition: ComponentDefinition,
  propName: string,
): unknown {
  if (component.props && propName in component.props) {
    return component.props[propName];
  }
  if (definition.defaultProps && propName in definition.defaultProps) {
    return definition.defaultProps[propName];
  }
  return undefined;
}

function compareTerminals(a: TerminalRef, b: TerminalRef): number {
  const componentCompare = a.component.localeCompare(b.component);
  if (componentCompare !== 0) {
    return componentCompare;
  }
  return a.pin.localeCompare(b.pin);
}
