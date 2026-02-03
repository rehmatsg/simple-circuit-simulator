import { DiagnosticCodes, errorDiagnostic } from "../core/diagnostics.js";
import { resolveNumberValue } from "../core/value.js";
const DEFAULT_SWITCH_RON = 1e-3;
export function buildNetlist(circuit, options) {
    const errors = [];
    const warnings = [];
    const groundNet = circuit.groundNet;
    if (typeof groundNet !== "string" || groundNet.trim() === "") {
        errors.push(errorDiagnostic(DiagnosticCodes.missingGround, "groundNet must be a non-empty string."));
        return { ok: false, errors, warnings };
    }
    const components = circuit
        .listComponents()
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
    const terminalsByNet = new Map();
    for (const component of components) {
        for (const [pin, net] of Object.entries(component.pins)) {
            if (typeof net !== "string" || net.trim() === "") {
                errors.push(errorDiagnostic(DiagnosticCodes.invalidNet, `Pin "${pin}" must connect to a non-empty net name.`, { component: component.name }));
                continue;
            }
            const terminals = terminalsByNet.get(net) ?? [];
            terminals.push({ component: component.name, pin });
            terminalsByNet.set(net, terminals);
        }
    }
    if (!terminalsByNet.has(groundNet)) {
        errors.push(errorDiagnostic(DiagnosticCodes.floatingReference, `Ground net "${groundNet}" is not connected to any component pins.`));
        return { ok: false, errors, warnings };
    }
    if (errors.length > 0) {
        return { ok: false, errors, warnings };
    }
    const otherNets = Array.from(terminalsByNet.keys())
        .filter((name) => name !== groundNet)
        .sort((a, b) => a.localeCompare(b));
    const sortedNets = [groundNet, ...otherNets];
    const nodeByName = {};
    const nodes = sortedNets.map((name, index) => {
        nodeByName[name] = index;
        const terminals = terminalsByNet.get(name) ?? [];
        terminals.sort(compareTerminals);
        return {
            id: index,
            name,
            terminals,
        };
    });
    const elements = [];
    for (const component of components) {
        const definition = options.registry.get(component.type);
        if (!definition) {
            errors.push(errorDiagnostic(DiagnosticCodes.unknownComponentType, `Unknown component type "${component.type}".`, { component: component.name }));
            continue;
        }
        const element = buildElementFromComponent(component, definition, nodeByName, circuit.params, options, errors);
        if (element) {
            elements.push(element);
        }
    }
    if (errors.length > 0) {
        return { ok: false, errors, warnings };
    }
    return {
        ok: true,
        netlist: {
            nodes,
            groundNodeId: 0,
            elements,
            nodeByName,
        },
        warnings,
    };
}
function buildElementFromComponent(component, definition, nodeByName, params, options, errors) {
    switch (definition.type) {
        case "current_source":
            return buildCurrentSource(component, definition, nodeByName, params, errors);
        case "diode":
        case "led":
            return buildDiode(component, definition, nodeByName, params, errors);
        case "capacitor":
            return buildCapacitor(component, definition, nodeByName, params, errors);
        case "inductor":
            return buildInductor(component, definition, nodeByName, params, errors);
        case "mosfet_n":
        case "mosfet_p":
            return buildMosfet(component, definition, nodeByName, params, errors);
        case "battery":
            return buildVoltageSource(component, definition, nodeByName, params, errors);
        case "resistor":
        case "bulb":
            return buildResistor(component, definition, nodeByName, params, errors);
        case "switch":
            return buildSwitch(component, definition, nodeByName, params, options, errors);
        default:
            return null;
    }
}
function buildCapacitor(component, definition, nodeByName, params, errors) {
    const a = resolveNode(component, "a", nodeByName, errors);
    const b = resolveNode(component, "b", nodeByName, errors);
    const capacitance = resolveNumericProp(component, definition, "capacitance", params, errors);
    if (a === null || b === null || capacitance === null) {
        return null;
    }
    if (capacitance <= 0) {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidPropertyValue, `Invalid capacitance value for component \"${component.name}\".`, { component: component.name, details: { capacitance } }));
        return null;
    }
    return {
        id: component.name,
        type: "capacitor",
        component: component.name,
        originalType: definition.type,
        nodes: [a, b],
        pins: ["a", "b"],
        params: { capacitance },
    };
}
function buildInductor(component, definition, nodeByName, params, errors) {
    const a = resolveNode(component, "a", nodeByName, errors);
    const b = resolveNode(component, "b", nodeByName, errors);
    const inductance = resolveNumericProp(component, definition, "inductance", params, errors);
    if (a === null || b === null || inductance === null) {
        return null;
    }
    if (inductance <= 0) {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidPropertyValue, `Invalid inductance value for component \"${component.name}\".`, { component: component.name, details: { inductance } }));
        return null;
    }
    return {
        id: component.name,
        type: "inductor",
        component: component.name,
        originalType: definition.type,
        nodes: [a, b],
        pins: ["a", "b"],
        params: { inductance },
    };
}
function buildMosfet(component, definition, nodeByName, params, errors) {
    const d = resolveNode(component, "d", nodeByName, errors);
    const g = resolveNode(component, "g", nodeByName, errors);
    const s = resolveNode(component, "s", nodeByName, errors);
    if (d === null || g === null || s === null) {
        return null;
    }
    const bPin = component.pins.b;
    const b = bPin ? nodeByName[bPin] : undefined;
    const bodyNode = b ?? s;
    const vth = resolveNumericProp(component, definition, "vth", params, errors);
    const ron = resolveNumericProp(component, definition, "ron", params, errors);
    const roff = resolveNumericProp(component, definition, "roff", params, errors);
    if (vth === null || ron === null || roff === null) {
        return null;
    }
    return {
        id: component.name,
        type: definition.type === "mosfet_p" ? "mosfet_p" : "mosfet_n",
        component: component.name,
        originalType: definition.type,
        nodes: [d, s],
        pins: ["d", "s"],
        params: { gate: g, body: bodyNode, vth, ron, roff },
    };
}
function buildVoltageSource(component, definition, nodeByName, params, errors) {
    const pos = resolveNode(component, "pos", nodeByName, errors);
    const neg = resolveNode(component, "neg", nodeByName, errors);
    const voltage = resolveNumericProp(component, definition, "voltage", params, errors);
    if (pos === null || neg === null || voltage === null) {
        return null;
    }
    return {
        id: component.name,
        type: "voltage_source",
        component: component.name,
        originalType: definition.type,
        nodes: [pos, neg],
        pins: ["pos", "neg"],
        params: { voltage },
    };
}
function buildCurrentSource(component, definition, nodeByName, params, errors) {
    const pos = resolveNode(component, "pos", nodeByName, errors);
    const neg = resolveNode(component, "neg", nodeByName, errors);
    const current = resolveNumericProp(component, definition, "current", params, errors);
    if (pos === null || neg === null || current === null) {
        return null;
    }
    return {
        id: component.name,
        type: "current_source",
        component: component.name,
        originalType: definition.type,
        nodes: [pos, neg],
        pins: ["pos", "neg"],
        params: { current },
    };
}
function buildDiode(component, definition, nodeByName, params, errors) {
    const anode = resolveNode(component, "anode", nodeByName, errors);
    const cathode = resolveNode(component, "cathode", nodeByName, errors);
    const isat = resolveNumericProp(component, definition, "is", params, errors);
    const n = resolveNumericProp(component, definition, "n", params, errors);
    const vt = resolveNumericProp(component, definition, "vt", params, errors);
    if (anode === null || cathode === null || isat === null || n === null || vt === null) {
        return null;
    }
    if (isat <= 0 || n <= 0 || vt <= 0) {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidPropertyValue, `Invalid diode parameters for component \"${component.name}\".`, { component: component.name, details: { is: isat, n, vt } }));
        return null;
    }
    return {
        id: component.name,
        type: "diode",
        component: component.name,
        originalType: definition.type,
        nodes: [anode, cathode],
        pins: ["anode", "cathode"],
        params: { is: isat, n, vt },
    };
}
function buildResistor(component, definition, nodeByName, params, errors) {
    const a = resolveNode(component, "a", nodeByName, errors);
    const b = resolveNode(component, "b", nodeByName, errors);
    const resistance = resolveNumericProp(component, definition, "resistance", params, errors);
    if (a === null || b === null || resistance === null) {
        return null;
    }
    return {
        id: component.name,
        type: "resistor",
        component: component.name,
        originalType: definition.type,
        nodes: [a, b],
        pins: ["a", "b"],
        params: { resistance },
    };
}
function buildSwitch(component, definition, nodeByName, params, options, errors) {
    const a = resolveNode(component, "a", nodeByName, errors);
    const b = resolveNode(component, "b", nodeByName, errors);
    const state = resolveEnumProp(component, definition, "state", errors);
    if (a === null || b === null || state === null) {
        return null;
    }
    if (state === "open") {
        return null;
    }
    const resistance = options.switchClosedResistance ?? DEFAULT_SWITCH_RON;
    return {
        id: component.name,
        type: "resistor",
        component: component.name,
        originalType: definition.type,
        nodes: [a, b],
        pins: ["a", "b"],
        params: { resistance },
    };
}
function resolveNode(component, pin, nodeByName, errors) {
    if (!(pin in component.pins)) {
        errors.push(errorDiagnostic(DiagnosticCodes.missingPin, `Missing required pin "${pin}" for component "${component.name}".`, { component: component.name }));
        return null;
    }
    const netName = component.pins[pin];
    if (!netName || !(netName in nodeByName)) {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidNet, `Pin "${pin}" on component "${component.name}" references unknown net.`, { component: component.name }));
        return null;
    }
    const nodeId = nodeByName[netName];
    if (nodeId === undefined) {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidNet, `Pin "${pin}" on component "${component.name}" references unknown net.`, { component: component.name }));
        return null;
    }
    return nodeId;
}
function resolveNumericProp(component, definition, propName, params, errors) {
    const propDef = definition.props?.[propName];
    if (!propDef || propDef.kind !== "number") {
        errors.push(errorDiagnostic(DiagnosticCodes.missingProperty, `Missing required property "${propName}".`, { component: component.name }));
        return null;
    }
    const valueExpr = getPropValue(component, definition, propName);
    if (valueExpr === undefined) {
        errors.push(errorDiagnostic(DiagnosticCodes.missingProperty, `Missing required property "${propName}".`, { component: component.name }));
        return null;
    }
    if (typeof valueExpr !== "number" && typeof valueExpr !== "string") {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidPropertyValue, `Invalid value for property "${propName}": expected a numeric value.`, { component: component.name, details: { prop: propName, reason: "type_mismatch" } }));
        return null;
    }
    const resolveOptions = {};
    if (params !== undefined) {
        resolveOptions.params = params;
    }
    if (propDef.unit !== undefined) {
        resolveOptions.expectedUnit = propDef.unit;
    }
    if (propDef.allowUnitless !== undefined) {
        resolveOptions.allowUnitless = propDef.allowUnitless;
    }
    const resolved = resolveNumberValue(valueExpr, resolveOptions);
    if (!resolved.ok) {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidPropertyValue, `Invalid value for property "${propName}": ${resolved.error.message}`, {
            component: component.name,
            details: { prop: propName, reason: resolved.error.code },
        }));
        return null;
    }
    return resolved.value.value;
}
function resolveEnumProp(component, definition, propName, errors) {
    const propDef = definition.props?.[propName];
    if (!propDef || propDef.kind !== "enum") {
        errors.push(errorDiagnostic(DiagnosticCodes.missingProperty, `Missing required property "${propName}".`, { component: component.name }));
        return null;
    }
    const valueExpr = getPropValue(component, definition, propName);
    if (valueExpr === undefined) {
        errors.push(errorDiagnostic(DiagnosticCodes.missingProperty, `Missing required property "${propName}".`, { component: component.name }));
        return null;
    }
    if (typeof valueExpr !== "string") {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidPropertyValue, `Invalid value for property "${propName}": expected one of ${propDef.allowedValues.join(", ")}.`, { component: component.name, details: { prop: propName, reason: "type_mismatch" } }));
        return null;
    }
    if (!propDef.allowedValues.includes(valueExpr)) {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidPropertyValue, `Invalid value for property "${propName}": expected one of ${propDef.allowedValues.join(", ")}.`, { component: component.name, details: { prop: propName, reason: "invalid_enum_value" } }));
        return null;
    }
    return valueExpr;
}
function getPropValue(component, definition, propName) {
    if (component.props && propName in component.props) {
        return component.props[propName];
    }
    if (definition.defaultProps && propName in definition.defaultProps) {
        return definition.defaultProps[propName];
    }
    return undefined;
}
function compareTerminals(a, b) {
    const componentCompare = a.component.localeCompare(b.component);
    if (componentCompare !== 0) {
        return componentCompare;
    }
    return a.pin.localeCompare(b.pin);
}
//# sourceMappingURL=builder.js.map