import test from "node:test";
import assert from "node:assert/strict";
import { importCircuit, exportCircuit } from "../../src/serialize/json.js";
import { createDefaultRegistry } from "../../src/components/builtins.js";
import { goldenFixtures } from "../../src/testing/fixtures/golden.js";

const registry = createDefaultRegistry();
for (const [name, doc] of Object.entries(goldenFixtures)) {
  test(`roundtrip: ${name}`, async () => {
    const imported = importCircuit(doc, { registry });
    assert.equal(imported.ok, true);
    if (!imported.ok) {
      return;
    }
    const exported = exportCircuit(imported.circuit);
    assert.equal(exported.schemaVersion, doc.schemaVersion);
    assert.equal(exported.sim.mode, doc.sim.mode);
    assert.equal(exported.groundNet, doc.groundNet);
    assert.equal(exported.components.length, doc.components.length);
  });
}
