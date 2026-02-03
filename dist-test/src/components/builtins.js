import { ComponentRegistry } from "./registry.js";
const BUILTIN_COMPONENTS = [
    {
        type: "current_source",
        pins: ["pos", "neg"],
        props: {
            current: {
                kind: "number",
                unit: "a",
                required: true,
                allowUnitless: true,
            },
        },
    },
    {
        type: "battery",
        pins: ["pos", "neg"],
        props: {
            voltage: {
                kind: "number",
                unit: "v",
                required: true,
                allowUnitless: true,
            },
        },
    },
    {
        type: "resistor",
        pins: ["a", "b"],
        props: {
            resistance: {
                kind: "number",
                unit: "ohm",
                required: true,
                allowUnitless: true,
            },
        },
    },
    {
        type: "bulb",
        pins: ["a", "b"],
        props: {
            resistance: {
                kind: "number",
                unit: "ohm",
                required: true,
                allowUnitless: true,
            },
        },
    },
    {
        type: "switch",
        pins: ["a", "b"],
        props: {
            state: {
                kind: "enum",
                allowedValues: ["open", "closed"],
                required: true,
            },
        },
    },
];
export function registerBuiltinComponents(registry) {
    for (const definition of BUILTIN_COMPONENTS) {
        registry.register(definition);
    }
}
export function createDefaultRegistry() {
    const registry = new ComponentRegistry();
    registerBuiltinComponents(registry);
    return registry;
}
export function listBuiltinComponents() {
    return BUILTIN_COMPONENTS.map((definition) => {
        const clone = {
            ...definition,
            pins: [...definition.pins],
        };
        if (definition.props) {
            clone.props = { ...definition.props };
        }
        if (definition.defaultProps) {
            clone.defaultProps = { ...definition.defaultProps };
        }
        return clone;
    });
}
//# sourceMappingURL=builtins.js.map