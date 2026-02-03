import test from "node:test";
import assert from "node:assert/strict";
import { parseValueExpr, resolveNumberValue } from "../../src/core/value.js";
import { DiagnosticCodes } from "../../src/core/diagnostics.js";
const approxEqual = (actual, expected, epsilon = 1e-12) => {
    assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be within ${epsilon} of ${expected}`);
};
test("parseValueExpr parses numeric literal", () => {
    const result = parseValueExpr(1000);
    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.value.kind, "number");
        assert.equal(result.value.value, 1000);
    }
});
test("parseValueExpr parses engineering string with prefix", () => {
    const result = parseValueExpr("1k");
    assert.equal(result.ok, true);
    if (result.ok) {
        approxEqual(result.value.value, 1000);
    }
});
test("parseValueExpr distinguishes milli vs mega", () => {
    const milli = parseValueExpr("1m");
    const mega = parseValueExpr("1M");
    assert.equal(milli.ok, true);
    assert.equal(mega.ok, true);
    if (milli.ok && mega.ok) {
        approxEqual(milli.value.value, 1e-3);
        approxEqual(mega.value.value, 1e6);
    }
});
test("resolveNumberValue enforces expected unit", () => {
    const ok = resolveNumberValue("9V", { expectedUnit: "v" });
    assert.equal(ok.ok, true);
    const mismatch = resolveNumberValue("9ohm", { expectedUnit: "v" });
    assert.equal(mismatch.ok, false);
    if (!mismatch.ok) {
        assert.equal(mismatch.error.code, DiagnosticCodes.unitMismatch);
    }
});
test("resolveNumberValue handles parameter references", () => {
    const resolved = resolveNumberValue("$R1", {
        expectedUnit: "ohm",
        params: { R1: "2.2k" },
    });
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
        approxEqual(resolved.value.value, 2200);
    }
});
test("resolveNumberValue reports unknown parameter", () => {
    const result = resolveNumberValue("$MISSING", { expectedUnit: "v" });
    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.equal(result.error.code, DiagnosticCodes.unknownParameter);
    }
});
test("parseValueExpr reports invalid strings", () => {
    const result = parseValueExpr("nope");
    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.equal(result.error.code, DiagnosticCodes.invalidNumeric);
    }
});
//# sourceMappingURL=value.test.js.map