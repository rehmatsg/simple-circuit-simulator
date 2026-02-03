import { Circuit } from "../core/circuit.js";
import { DiagnosticCodes, errorDiagnostic } from "../core/diagnostics.js";
import { validateCircuitDocument } from "../core/validation.js";
export const CURRENT_SCHEMA_VERSION = 1;
export function migrateCircuitDocument(document) {
    const warnings = [];
    const errors = [];
    const schemaVersion = document.schemaVersion;
    if (!Number.isFinite(schemaVersion)) {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidSchemaVersion, "Schema version must be a finite number."));
        return { document, warnings, errors };
    }
    if (schemaVersion === CURRENT_SCHEMA_VERSION) {
        return { document, warnings, errors };
    }
    if (schemaVersion === 0) {
        const migrated = {
            ...document,
            schemaVersion: CURRENT_SCHEMA_VERSION,
        };
        return { document: migrated, warnings, errors };
    }
    errors.push(errorDiagnostic(DiagnosticCodes.invalidSchemaVersion, `Unsupported schema version "${schemaVersion}".`));
    return { document, warnings, errors };
}
export function importCircuit(document, options = {}) {
    const migration = migrateCircuitDocument(document);
    if (migration.errors.length > 0) {
        return {
            ok: false,
            errors: migration.errors,
            warnings: migration.warnings,
        };
    }
    const validation = validateCircuitDocument(migration.document, options.registry ? { registry: options.registry } : {});
    if (validation.errors.length > 0) {
        return {
            ok: false,
            errors: validation.errors,
            warnings: migration.warnings,
        };
    }
    return {
        ok: true,
        circuit: new Circuit(migration.document),
        warnings: migration.warnings,
    };
}
export function exportCircuit(circuit) {
    return circuit.toJSON();
}
//# sourceMappingURL=json.js.map