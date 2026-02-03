import test from "node:test";
import assert from "node:assert/strict";
import { ComponentRegistry } from "../../src/components/registry.js";
import { createDefaultRegistry, listBuiltinComponents, registerBuiltinComponents } from "../../src/components/builtins.js";
test("ComponentRegistry prevents duplicate registration", () => {
    const registry = new ComponentRegistry();
    registry.register({ type: "resistor", pins: ["a", "b"] });
    assert.throws(() => registry.register({ type: "resistor", pins: ["a", "b"] }), /already registered/);
});
test("registerBuiltinComponents registers expected types", () => {
    const registry = new ComponentRegistry();
    registerBuiltinComponents(registry);
    const types = registry.list().map((def) => def.type).sort();
    assert.deepEqual(types, [
        "battery",
        "bulb",
        "capacitor",
        "current_source",
        "diode",
        "gate_and",
        "gate_not",
        "gate_or",
        "inductor",
        "led",
        "resistor",
        "switch",
    ]);
});
test("createDefaultRegistry returns independent registry", () => {
    const registry = createDefaultRegistry();
    assert.equal(registry.has("battery"), true);
});
test("listBuiltinComponents returns copies", () => {
    const list = listBuiltinComponents();
    const first = list[0];
    assert.ok(first);
    if (first) {
        const originalPins = [...first.pins];
        first.pins = [];
        assert.notDeepEqual(listBuiltinComponents()[0]?.pins, first.pins);
        assert.deepEqual(originalPins, listBuiltinComponents()[0]?.pins);
    }
});
//# sourceMappingURL=registry.test.js.map