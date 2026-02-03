import type { Diagnostic } from "./types.js";
import type { CircuitDocument, ComponentDocument, SimMode } from "./circuit.js";
import type { JunctionDocument, WireDocument, WireEndpoint } from "./wires.js";
import type { ComponentRegistry, ComponentDefinition, PropDefinition } from "../components/registry.js";
import { DiagnosticCodes, errorDiagnostic } from "./diagnostics.js";
import { resolveNumberValue, type ResolveValueOptions } from "./value.js";

export interface ValidationResult {
  errors: Diagnostic[];
  warnings: Diagnostic[];
}

export interface ValidationOptions {
  registry?: ComponentRegistry;
}

const VALID_SIM_MODES: SimMode[] = ["dc", "transient", "digital", "hybrid"];

export function validateCircuitDocument(
  document: CircuitDocument,
  options: ValidationOptions = {},
): ValidationResult {
  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];

  if (!Number.isFinite(document.schemaVersion)) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidSchemaVersion,
        "Schema version must be a finite number.",
      ),
    );
  }

  if (!VALID_SIM_MODES.includes(document.sim?.mode)) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidSimMode,
        `Unsupported sim mode "${document.sim?.mode}".`,
      ),
    );
  }

  if (typeof document.groundNet !== "string" || document.groundNet.trim() === "") {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.missingGround,
        "groundNet must be a non-empty string.",
      ),
    );
  }

  if (!Array.isArray(document.components)) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidComponents,
        "components must be an array.",
      ),
    );
    return { errors, warnings };
  }

  const registry = options.registry;
  const seenNames = new Set<string>();
  const componentMap = new Map<string, ComponentDocument>();

  for (const component of document.components) {
    validateComponent(component, registry, document.params, errors);

    if (seenNames.has(component.name)) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.duplicateComponentName,
          `Duplicate component name "${component.name}".`,
          { component: component.name },
        ),
      );
    } else {
      seenNames.add(component.name);
    }

    componentMap.set(component.name, component);
  }

  validateJunctions(document.junctions, errors);
  validateWires(document.wires, document.junctions, componentMap, errors);

  return { errors, warnings };
}

function validateComponent(
  component: ComponentDocument,
  registry: ComponentRegistry | undefined,
  params: Record<string, number | string | boolean> | undefined,
  errors: Diagnostic[],
): void {
  if (!component.name || typeof component.name !== "string") {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidComponentName,
        "Component name must be a non-empty string.",
      ),
    );
  }

  if (!component.type || typeof component.type !== "string") {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidComponentType,
        "Component type must be a non-empty string.",
        { component: component.name },
      ),
    );
    return;
  }

  const definition = registry?.get(component.type);
  if (!definition) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.unknownComponentType,
        `Unknown component type "${component.type}".`,
        { component: component.name },
      ),
    );
  }

  if (!component.pins || typeof component.pins !== "object") {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.missingPins,
        `Component "${component.name}" is missing pins.`,
        { component: component.name },
      ),
    );
    return;
  }

  for (const [pin, net] of Object.entries(component.pins)) {
    if (typeof net !== "string" || net.trim() === "") {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.invalidNet,
          `Pin "${pin}" must connect to a non-empty net name.`,
          { component: component.name },
        ),
      );
    }
  }

  if (definition) {
    validatePins(component, definition, errors);
    validateProps(component, definition, params, errors);
  }
}

function validatePins(
  component: ComponentDocument,
  definition: ComponentDefinition,
  errors: Diagnostic[],
): void {
  const allowedPins = new Set(definition.pins);
  const requiredPins = definition.requiredPins ?? definition.pins;

  for (const pin of Object.keys(component.pins)) {
    if (!allowedPins.has(pin)) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.invalidPin,
          `Invalid pin "${pin}" for component type "${definition.type}".`,
          {
            component: component.name,
            details: { validPins: definition.pins.join(", ") },
          },
        ),
      );
    }
  }

  for (const pin of requiredPins) {
    if (!(pin in component.pins)) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.missingPin,
          `Missing required pin "${pin}" for component type "${definition.type}".`,
          {
            component: component.name,
            details: { requiredPins: requiredPins.join(", ") },
          },
        ),
      );
    }
  }
}

function validateProps(
  component: ComponentDocument,
  definition: ComponentDefinition,
  params: Record<string, number | string | boolean> | undefined,
  errors: Diagnostic[],
): void {
  if (!definition.props) {
    return;
  }

  const props = component.props ?? {};
  for (const [propName, propDef] of Object.entries(definition.props)) {
    if (propDef.required && !(propName in props)) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.missingProperty,
          `Missing required property "${propName}".`,
          { component: component.name },
        ),
      );
    }
  }

  for (const [propName, propValue] of Object.entries(props)) {
    const propDef: PropDefinition | undefined = definition.props[propName];
    if (!propDef) {
      continue;
    }

    if (propDef.kind === "enum") {
      if (typeof propValue !== "string") {
        errors.push(
          errorDiagnostic(
            DiagnosticCodes.invalidPropertyValue,
            `Invalid value for property \"${propName}\": expected one of ${propDef.allowedValues.join(", ")}.`,
            {
              component: component.name,
              details: {
                prop: propName,
                reason: "type_mismatch",
              },
            },
          ),
        );
        continue;
      }

      if (!propDef.allowedValues.includes(propValue)) {
        errors.push(
          errorDiagnostic(
            DiagnosticCodes.invalidPropertyValue,
            `Invalid value for property \"${propName}\": expected one of ${propDef.allowedValues.join(", ")}.`,
            {
              component: component.name,
              details: {
                prop: propName,
                reason: "invalid_enum_value",
              },
            },
          ),
        );
      }

      continue;
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

    const resolved = resolveNumberValue(propValue, resolveOptions);

    if (!resolved.ok) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.invalidPropertyValue,
          `Invalid value for property "${propName}": ${resolved.error.message}`,
          {
            component: component.name,
            details: {
              prop: propName,
              reason: resolved.error.code,
            },
          },
        ),
      );
    }
  }
}

function validateJunctions(junctions: JunctionDocument[] | undefined, errors: Diagnostic[]): void {
  if (junctions === undefined) {
    return;
  }

  if (!Array.isArray(junctions)) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidJunction,
        "junctions must be an array.",
      ),
    );
    return;
  }

  const seen = new Set<string>();
  for (const junction of junctions) {
    if (!junction.id || typeof junction.id !== "string") {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.invalidJunction,
          "Junction id must be a non-empty string.",
        ),
      );
      continue;
    }
    if (!junction.net || typeof junction.net !== "string") {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.invalidJunction,
          `Junction "${junction.id}" must have a non-empty net name.`,
        ),
      );
      continue;
    }
    if (seen.has(junction.id)) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.duplicateJunctionId,
          `Duplicate junction id "${junction.id}".`,
        ),
      );
    } else {
      seen.add(junction.id);
    }
  }
}

function validateWires(
  wires: WireDocument[] | undefined,
  junctions: JunctionDocument[] | undefined,
  componentMap: Map<string, ComponentDocument>,
  errors: Diagnostic[],
): void {
  if (wires === undefined) {
    return;
  }

  if (!Array.isArray(wires)) {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidWire,
        "wires must be an array.",
      ),
    );
    return;
  }

  const junctionMap = new Map<string, JunctionDocument>();
  if (junctions) {
    for (const junction of junctions) {
      junctionMap.set(junction.id, junction);
    }
  }

  const seen = new Set<string>();
  for (const wire of wires) {
    if (!wire.id || typeof wire.id !== "string") {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.invalidWire,
          "Wire id must be a non-empty string.",
        ),
      );
      continue;
    }
    if (!wire.net || typeof wire.net !== "string") {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.invalidWire,
          `Wire "${wire.id}" must have a non-empty net name.`,
        ),
      );
      continue;
    }
    if (seen.has(wire.id)) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.duplicateWireId,
          `Duplicate wire id "${wire.id}".`,
        ),
      );
    } else {
      seen.add(wire.id);
    }

    validateWireEndpoint(wire, wire.from, "from", wire.net, junctionMap, componentMap, errors);
    validateWireEndpoint(wire, wire.to, "to", wire.net, junctionMap, componentMap, errors);
  }
}

function validateWireEndpoint(
  wire: WireDocument,
  endpoint: WireEndpoint,
  label: "from" | "to",
  net: string,
  junctionMap: Map<string, JunctionDocument>,
  componentMap: Map<string, ComponentDocument>,
  errors: Diagnostic[],
): void {
  if (!endpoint || typeof endpoint !== "object") {
    errors.push(
      errorDiagnostic(
        DiagnosticCodes.invalidWireEndpoint,
        `Wire "${wire.id}" ${label} endpoint is invalid.`,
      ),
    );
    return;
  }

  if (endpoint.kind === "junction") {
    const junction = junctionMap.get(endpoint.id);
    if (!junction) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.invalidWireEndpoint,
          `Wire "${wire.id}" references missing junction "${endpoint.id}".`,
        ),
      );
      return;
    }
    if (junction.net !== net) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.wireNetMismatch,
          `Wire "${wire.id}" net "${net}" does not match junction "${endpoint.id}" net "${junction.net}".`,
        ),
      );
    }
    return;
  }

  if (endpoint.kind === "pin") {
    const component = componentMap.get(endpoint.component);
    if (!component) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.invalidWireEndpoint,
          `Wire "${wire.id}" references missing component "${endpoint.component}".`,
        ),
      );
      return;
    }
    const pinNet = component.pins[endpoint.pin];
    if (!pinNet) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.invalidWireEndpoint,
          `Wire "${wire.id}" references missing pin "${endpoint.pin}" on component "${endpoint.component}".`,
        ),
      );
      return;
    }
    if (pinNet !== net) {
      errors.push(
        errorDiagnostic(
          DiagnosticCodes.wireNetMismatch,
          `Wire "${wire.id}" net "${net}" does not match pin net "${pinNet}".`,
          { component: endpoint.component, net: pinNet },
        ),
      );
    }
    return;
  }

  errors.push(
    errorDiagnostic(
      DiagnosticCodes.invalidWireEndpoint,
      `Wire "${wire.id}" ${label} endpoint kind is invalid.`,
    ),
  );
}
