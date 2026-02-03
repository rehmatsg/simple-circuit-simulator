import type { Diagnostic, DiagnosticMessage, DiagnosticSeverity } from "./types.js";

export const DiagnosticCodes = {
  duplicateComponentName: "duplicate_component_name",
  invalidComponentName: "invalid_component_name",
  invalidComponentType: "invalid_component_type",
  invalidComponents: "invalid_components",
  invalidNet: "invalid_net",
  invalidPin: "invalid_pin",
  invalidPropertyValue: "invalid_property_value",
  invalidSchemaVersion: "invalid_schema_version",
  invalidSimMode: "invalid_sim_mode",
  floatingReference: "floating_reference",
  missingGround: "missing_ground",
  singularMatrix: "singular_matrix",
  shortCircuitSuspected: "short_circuit_suspected",
  missingPin: "missing_pin",
  missingPins: "missing_pins",
  missingProperty: "missing_property",
  missingRegistry: "missing_registry",
  unknownComponentType: "unknown_component_type",
  invalidValue: "invalid_value",
  invalidNumeric: "invalid_numeric_literal",
  invalidParameter: "invalid_parameter_reference",
  unknownParameter: "unknown_parameter",
  unitMismatch: "unit_mismatch",
  unknownUnit: "unknown_unit",
} as const;

export type DiagnosticCode = (typeof DiagnosticCodes)[keyof typeof DiagnosticCodes];

export interface DiagnosticContext {
  component?: string;
  net?: string;
  details?: Record<string, string | number>;
}

export function makeDiagnostic(
  severity: DiagnosticSeverity,
  code: DiagnosticCode | string,
  message: string,
  context: DiagnosticContext = {},
): Diagnostic {
  const { component, net, details } = context;
  const diagnostic: Diagnostic = {
    severity,
    code,
    message,
  };

  if (component !== undefined) {
    diagnostic.component = component;
  }

  if (net !== undefined) {
    diagnostic.net = net;
  }

  if (details !== undefined) {
    diagnostic.details = details;
  }

  return diagnostic;
}

export function errorDiagnostic(
  code: DiagnosticCode | string,
  message: string,
  context: DiagnosticContext = {},
): Diagnostic {
  return makeDiagnostic("error", code, message, context);
}

export function warningDiagnostic(
  code: DiagnosticCode | string,
  message: string,
  context: DiagnosticContext = {},
): Diagnostic {
  return makeDiagnostic("warning", code, message, context);
}

export function asMessage(diagnostic: Diagnostic): DiagnosticMessage {
  const { severity: _severity, ...rest } = diagnostic;
  return rest;
}
