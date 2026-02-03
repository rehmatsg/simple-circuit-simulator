import test from "node:test";
import assert from "node:assert/strict";
import { validateCircuitDocument } from "../../src/core/validation.js";
import { ComponentRegistry } from "../../src/components/registry.js";
import { DiagnosticCodes } from "../../src/core/diagnostics.js";
const registry = new ComponentRegistry();
registry.register({
    type: "resistor",
    pins: ["a", "b"],
    props: {
        resistance: { kind: "number", unit: "ohm", required: true },
    },
});
const baseDocument = {
    schemaVersion: 1,
    sim: { mode: "dc" },
    groundNet: "GND",
    components: [
        {
            name: "R1",
            type: "resistor",
            pins: { a: "N1", b: "GND" },
            props: { resistance: "1k" },
        },
    ],
};
test("validateCircuitDocument detects duplicate component names", () => {
    const document = {
        ...baseDocument,
        components: [
            ...baseDocument.components,
            {
                name: "R1",
                type: "resistor",
                pins: { a: "N2", b: "GND" },
                props: { resistance: "2k" },
            },
        ],
    };
    const result = validateCircuitDocument(document, { registry });
    assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.duplicateComponentName));
});
test("validateCircuitDocument flags invalid pins", () => {
    const document = {
        ...baseDocument,
        components: [
            {
                name: "R2",
                type: "resistor",
                pins: { a: "N1", c: "GND" },
                props: { resistance: "1k" },
            },
        ],
    };
    const result = validateCircuitDocument(document, { registry });
    assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.invalidPin));
    assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.missingPin));
});
test("validateCircuitDocument flags unknown component types", () => {
    const document = {
        ...baseDocument,
        components: [
            {
                name: "X1",
                type: "mystery",
                pins: { a: "N1", b: "GND" },
            },
        ],
    };
    const result = validateCircuitDocument(document, { registry });
    assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.unknownComponentType));
});
test("validateCircuitDocument flags invalid property values", () => {
    const document = {
        ...baseDocument,
        components: [
            {
                name: "R2",
                type: "resistor",
                pins: { a: "N1", b: "GND" },
                props: { resistance: "oops" },
            },
        ],
    };
    const result = validateCircuitDocument(document, { registry });
    assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.invalidPropertyValue));
});
test("validateCircuitDocument validates enum property values", () => {
    const switchRegistry = new ComponentRegistry();
    switchRegistry.register({
        type: "switch",
        pins: ["a", "b"],
        props: {
            state: { kind: "enum", allowedValues: ["open", "closed"], required: true },
        },
    });
    const document = {
        schemaVersion: 1,
        sim: { mode: "dc" },
        groundNet: "GND",
        components: [
            {
                name: "S1",
                type: "switch",
                pins: { a: "N1", b: "GND" },
                props: { state: "invalid" },
            },
        ],
    };
    const result = validateCircuitDocument(document, { registry: switchRegistry });
    assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.invalidPropertyValue));
});
test("validateCircuitDocument flags missing ground and invalid sim mode", () => {
    const document = {
        schemaVersion: 1,
        sim: { mode: "ac" },
        groundNet: "",
        components: [],
    };
    const result = validateCircuitDocument(document, { registry });
    assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.missingGround));
    assert.ok(result.errors.some((err) => err.code === DiagnosticCodes.invalidSimMode));
});
//# sourceMappingURL=validation.test.js.map