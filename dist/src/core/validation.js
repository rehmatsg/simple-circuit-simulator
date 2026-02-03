import { DiagnosticCodes, errorDiagnostic } from "./diagnostics.js";
import { resolveNumberValue } from "./value.js";
const VALID_SIM_MODES = ["dc", "transient", "digital", "hybrid"];
export function validateCircuitDocument(document, options = {}) {
    const errors = [];
    const warnings = [];
    if (!Number.isFinite(document.schemaVersion)) {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidSchemaVersion, "Schema version must be a finite number."));
    }
    if (!VALID_SIM_MODES.includes(document.sim?.mode)) {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidSimMode, `Unsupported sim mode "${document.sim?.mode}".`));
    }
    if (typeof document.groundNet !== "string" || document.groundNet.trim() === "") {
        errors.push(errorDiagnostic(DiagnosticCodes.missingGround, "groundNet must be a non-empty string."));
    }
    if (!Array.isArray(document.components)) {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidComponents, "components must be an array."));
        return { errors, warnings };
    }
    const registry = options.registry;
    const seenNames = new Set();
    for (const component of document.components) {
        validateComponent(component, registry, document.params, errors);
        if (seenNames.has(component.name)) {
            errors.push(errorDiagnostic(DiagnosticCodes.duplicateComponentName, `Duplicate component name "${component.name}".`, { component: component.name }));
        }
        else {
            seenNames.add(component.name);
        }
    }
    return { errors, warnings };
}
function validateComponent(component, registry, params, errors) {
    if (!component.name || typeof component.name !== "string") {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidComponentName, "Component name must be a non-empty string."));
    }
    if (!component.type || typeof component.type !== "string") {
        errors.push(errorDiagnostic(DiagnosticCodes.invalidComponentType, "Component type must be a non-empty string.", { component: component.name }));
        return;
    }
    const definition = registry?.get(component.type);
    if (!definition) {
        errors.push(errorDiagnostic(DiagnosticCodes.unknownComponentType, `Unknown component type "${component.type}".`, { component: component.name }));
    }
    if (!component.pins || typeof component.pins !== "object") {
        errors.push(errorDiagnostic(DiagnosticCodes.missingPins, `Component "${component.name}" is missing pins.`, { component: component.name }));
        return;
    }
    for (const [pin, net] of Object.entries(component.pins)) {
        if (typeof net !== "string" || net.trim() === "") {
            errors.push(errorDiagnostic(DiagnosticCodes.invalidNet, `Pin "${pin}" must connect to a non-empty net name.`, { component: component.name }));
        }
    }
    if (definition) {
        validatePins(component, definition, errors);
        validateProps(component, definition, params, errors);
    }
}
function validatePins(component, definition, errors) {
    const allowedPins = new Set(definition.pins);
    const requiredPins = definition.requiredPins ?? definition.pins;
    for (const pin of Object.keys(component.pins)) {
        if (!allowedPins.has(pin)) {
            errors.push(errorDiagnostic(DiagnosticCodes.invalidPin, `Invalid pin "${pin}" for component type "${definition.type}".`, {
                component: component.name,
                details: { validPins: definition.pins.join(", ") },
            }));
        }
    }
    for (const pin of requiredPins) {
        if (!(pin in component.pins)) {
            errors.push(errorDiagnostic(DiagnosticCodes.missingPin, `Missing required pin "${pin}" for component type "${definition.type}".`, {
                component: component.name,
                details: { requiredPins: requiredPins.join(", ") },
            }));
        }
    }
}
function validateProps(component, definition, params, errors) {
    if (!definition.props) {
        return;
    }
    const props = component.props ?? {};
    for (const [propName, propDef] of Object.entries(definition.props)) {
        if (propDef.required && !(propName in props)) {
            errors.push(errorDiagnostic(DiagnosticCodes.missingProperty, `Missing required property "${propName}".`, { component: component.name }));
        }
    }
    for (const [propName, propValue] of Object.entries(props)) {
        const propDef = definition.props[propName];
        if (!propDef) {
            continue;
        }
        if (propDef.kind === "enum") {
            if (typeof propValue !== "string") {
                errors.push(errorDiagnostic(DiagnosticCodes.invalidPropertyValue, `Invalid value for property \"${propName}\": expected one of ${propDef.allowedValues.join(", ")}.`, {
                    component: component.name,
                    details: {
                        prop: propName,
                        reason: "type_mismatch",
                    },
                }));
                continue;
            }
            if (!propDef.allowedValues.includes(propValue)) {
                errors.push(errorDiagnostic(DiagnosticCodes.invalidPropertyValue, `Invalid value for property \"${propName}\": expected one of ${propDef.allowedValues.join(", ")}.`, {
                    component: component.name,
                    details: {
                        prop: propName,
                        reason: "invalid_enum_value",
                    },
                }));
            }
            continue;
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
        const resolved = resolveNumberValue(propValue, resolveOptions);
        if (!resolved.ok) {
            errors.push(errorDiagnostic(DiagnosticCodes.invalidPropertyValue, `Invalid value for property "${propName}": ${resolved.error.message}`, {
                component: component.name,
                details: {
                    prop: propName,
                    reason: resolved.error.code,
                },
            }));
        }
    }
}
//# sourceMappingURL=validation.js.map