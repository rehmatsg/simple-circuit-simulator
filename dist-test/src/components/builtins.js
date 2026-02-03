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
        type: "diode",
        pins: ["anode", "cathode"],
        props: {
            is: {
                kind: "number",
                unit: "a",
                required: false,
                allowUnitless: true,
            },
            n: {
                kind: "number",
                required: false,
                allowUnitless: true,
            },
            vt: {
                kind: "number",
                unit: "v",
                required: false,
                allowUnitless: true,
            },
        },
        defaultProps: {
            is: 1e-12,
            n: 1,
            vt: 0.02585,
        },
    },
    {
        type: "led",
        pins: ["anode", "cathode"],
        props: {
            is: {
                kind: "number",
                unit: "a",
                required: false,
                allowUnitless: true,
            },
            n: {
                kind: "number",
                required: false,
                allowUnitless: true,
            },
            vt: {
                kind: "number",
                unit: "v",
                required: false,
                allowUnitless: true,
            },
        },
        defaultProps: {
            is: 1e-18,
            n: 2,
            vt: 0.02585,
        },
    },
    {
        type: "gate_and",
        pins: ["in1", "in2", "out"],
        requiredPins: ["in1", "in2", "out"],
    },
    {
        type: "gate_or",
        pins: ["in1", "in2", "out"],
        requiredPins: ["in1", "in2", "out"],
    },
    {
        type: "gate_not",
        pins: ["in1", "out"],
        requiredPins: ["in1", "out"],
    },
    {
        type: "cmos_not",
        pins: ["in1", "out"],
        requiredPins: ["in1", "out"],
    },
    {
        type: "cmos_nand",
        pins: ["in1", "in2", "out"],
        requiredPins: ["in1", "in2", "out"],
    },
    {
        type: "cmos_nor",
        pins: ["in1", "in2", "out"],
        requiredPins: ["in1", "in2", "out"],
    },
    {
        type: "mosfet_n",
        pins: ["d", "g", "s", "b"],
        requiredPins: ["d", "g", "s"],
        props: {
            vth: {
                kind: "number",
                unit: "v",
                required: false,
                allowUnitless: true,
            },
            ron: {
                kind: "number",
                unit: "ohm",
                required: false,
                allowUnitless: true,
            },
            roff: {
                kind: "number",
                unit: "ohm",
                required: false,
                allowUnitless: true,
            },
        },
        defaultProps: {
            vth: 1,
            ron: 10,
            roff: 1e9,
        },
    },
    {
        type: "mosfet_p",
        pins: ["d", "g", "s", "b"],
        requiredPins: ["d", "g", "s"],
        props: {
            vth: {
                kind: "number",
                unit: "v",
                required: false,
                allowUnitless: true,
            },
            ron: {
                kind: "number",
                unit: "ohm",
                required: false,
                allowUnitless: true,
            },
            roff: {
                kind: "number",
                unit: "ohm",
                required: false,
                allowUnitless: true,
            },
        },
        defaultProps: {
            vth: 1,
            ron: 10,
            roff: 1e9,
        },
    },
    {
        type: "capacitor",
        pins: ["a", "b"],
        props: {
            capacitance: {
                kind: "number",
                unit: "f",
                required: true,
                allowUnitless: true,
            },
        },
    },
    {
        type: "inductor",
        pins: ["a", "b"],
        props: {
            inductance: {
                kind: "number",
                unit: "h",
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