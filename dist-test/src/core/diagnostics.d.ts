import type { Diagnostic, DiagnosticMessage, DiagnosticSeverity } from "./types.js";
export declare const DiagnosticCodes: {
    readonly duplicateComponentName: "duplicate_component_name";
    readonly invalidComponentName: "invalid_component_name";
    readonly invalidComponentType: "invalid_component_type";
    readonly invalidComponents: "invalid_components";
    readonly invalidNet: "invalid_net";
    readonly invalidPin: "invalid_pin";
    readonly invalidPropertyValue: "invalid_property_value";
    readonly invalidSchemaVersion: "invalid_schema_version";
    readonly invalidSimMode: "invalid_sim_mode";
    readonly floatingReference: "floating_reference";
    readonly missingGround: "missing_ground";
    readonly singularMatrix: "singular_matrix";
    readonly shortCircuitSuspected: "short_circuit_suspected";
    readonly missingPin: "missing_pin";
    readonly missingPins: "missing_pins";
    readonly missingProperty: "missing_property";
    readonly missingRegistry: "missing_registry";
    readonly missingDigitalInput: "missing_digital_input";
    readonly nonlinearConvergenceFailure: "nonlinear_convergence_failure";
    readonly unknownComponentType: "unknown_component_type";
    readonly invalidValue: "invalid_value";
    readonly invalidNumeric: "invalid_numeric_literal";
    readonly invalidParameter: "invalid_parameter_reference";
    readonly unknownParameter: "unknown_parameter";
    readonly unitMismatch: "unit_mismatch";
    readonly unknownUnit: "unknown_unit";
};
export type DiagnosticCode = (typeof DiagnosticCodes)[keyof typeof DiagnosticCodes];
export interface DiagnosticContext {
    component?: string;
    net?: string;
    details?: Record<string, string | number>;
}
export declare function makeDiagnostic(severity: DiagnosticSeverity, code: DiagnosticCode | string, message: string, context?: DiagnosticContext): Diagnostic;
export declare function errorDiagnostic(code: DiagnosticCode | string, message: string, context?: DiagnosticContext): Diagnostic;
export declare function warningDiagnostic(code: DiagnosticCode | string, message: string, context?: DiagnosticContext): Diagnostic;
export declare function asMessage(diagnostic: Diagnostic): DiagnosticMessage;
//# sourceMappingURL=diagnostics.d.ts.map