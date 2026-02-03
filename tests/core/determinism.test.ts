import test from "node:test";
import assert from "node:assert/strict";
import { sortDiagnostics } from "../../src/core/determinism.js";
import type { DiagnosticMessage } from "../../src/core/types.js";

const diagnostics: DiagnosticMessage[] = [
  { code: "b", message: "B", component: "C2" },
  { code: "a", message: "A", component: "C1" },
  { code: "a", message: "A", component: "C0" },
  { code: "a", message: "Z", component: "C0" },
  { code: "a", message: "A", component: "C0", net: "N2" },
];

test("sortDiagnostics orders by code/component/net/message", () => {
  const sorted = sortDiagnostics(diagnostics);
  assert.deepEqual(
    sorted.map((diag) => `${diag.code}-${diag.component ?? ""}-${diag.net ?? ""}-${diag.message}`),
    [
      "a-C0--A",
      "a-C0--Z",
      "a-C0-N2-A",
      "a-C1--A",
      "b-C2--B",
    ],
  );
});
