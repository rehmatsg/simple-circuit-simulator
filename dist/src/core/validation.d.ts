import type { Diagnostic } from "./types.js";
import type { CircuitDocument } from "./circuit.js";
import type { ComponentRegistry } from "../components/registry.js";
export interface ValidationResult {
    errors: Diagnostic[];
    warnings: Diagnostic[];
}
export interface ValidationOptions {
    registry?: ComponentRegistry;
}
export declare function validateCircuitDocument(document: CircuitDocument, options?: ValidationOptions): ValidationResult;
//# sourceMappingURL=validation.d.ts.map