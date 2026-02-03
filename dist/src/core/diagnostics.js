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
};
export function makeDiagnostic(severity, code, message, context = {}) {
    const { component, net, details } = context;
    const diagnostic = {
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
export function errorDiagnostic(code, message, context = {}) {
    return makeDiagnostic("error", code, message, context);
}
export function warningDiagnostic(code, message, context = {}) {
    return makeDiagnostic("warning", code, message, context);
}
export function asMessage(diagnostic) {
    const { severity: _severity, ...rest } = diagnostic;
    return rest;
}
//# sourceMappingURL=diagnostics.js.map