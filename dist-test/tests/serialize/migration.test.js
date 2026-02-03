import test from "node:test";
import assert from "node:assert/strict";
import { migrateCircuitDocument, CURRENT_SCHEMA_VERSION } from "../../src/serialize/json.js";
import { DiagnosticCodes } from "../../src/core/diagnostics.js";
test("migrateCircuitDocument upgrades schemaVersion 0", () => {
    const document = {
        schemaVersion: 0,
        sim: { mode: "dc" },
        groundNet: "GND",
        components: [],
    };
    const result = migrateCircuitDocument(document);
    assert.equal(result.errors.length, 0);
    assert.equal(result.document.schemaVersion, CURRENT_SCHEMA_VERSION);
});
test("migrateCircuitDocument errors on unsupported versions", () => {
    const document = {
        schemaVersion: 99,
        sim: { mode: "dc" },
        groundNet: "GND",
        components: [],
    };
    const result = migrateCircuitDocument(document);
    assert.equal(result.errors.length, 1);
    const firstError = result.errors[0];
    assert.ok(firstError);
    assert.equal(firstError.code, DiagnosticCodes.invalidSchemaVersion);
});
//# sourceMappingURL=migration.test.js.map