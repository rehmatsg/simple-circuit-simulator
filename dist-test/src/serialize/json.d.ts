import type { CircuitDocument, CircuitParseResult } from "../core/circuit.js";
import { Circuit } from "../core/circuit.js";
import type { Diagnostic } from "../core/types.js";
import type { ComponentRegistry } from "../components/registry.js";
export declare const CURRENT_SCHEMA_VERSION = 1;
export interface ImportOptions {
    registry?: ComponentRegistry;
}
export interface MigrationResult {
    document: CircuitDocument;
    warnings: Diagnostic[];
    errors: Diagnostic[];
}
export declare function migrateCircuitDocument(document: CircuitDocument): MigrationResult;
export declare function importCircuit(document: CircuitDocument, options?: ImportOptions): CircuitParseResult;
export declare function exportCircuit(circuit: Circuit): CircuitDocument;
//# sourceMappingURL=json.d.ts.map