import test from "node:test";
import assert from "node:assert/strict";
import { migrateCircuitDocument, CURRENT_SCHEMA_VERSION } from "../../src/serialize/json.js";
import { DiagnosticCodes } from "../../src/core/diagnostics.js";
import type { CircuitDocument } from "../../src/core/circuit.js";

test("migrateCircuitDocument upgrades schemaVersion 0", () => {
  const document: CircuitDocument = {
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
  const document: CircuitDocument = {
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
