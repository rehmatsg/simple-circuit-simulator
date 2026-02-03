import type { Unit, ValueExpr } from "../core/types.js";
export interface NumberPropDefinition {
    kind: "number";
    unit?: Unit;
    required?: boolean;
    allowUnitless?: boolean;
}
export interface EnumPropDefinition {
    kind: "enum";
    allowedValues: readonly string[];
    required?: boolean;
}
export type PropDefinition = NumberPropDefinition | EnumPropDefinition;
export interface ComponentDefinition {
    type: string;
    pins: readonly string[];
    requiredPins?: readonly string[];
    props?: Record<string, PropDefinition>;
    defaultProps?: Record<string, ValueExpr>;
}
export declare class ComponentRegistry {
    private readonly definitions;
    register(definition: ComponentDefinition): void;
    has(type: string): boolean;
    get(type: string): ComponentDefinition | undefined;
    list(): ComponentDefinition[];
}
//# sourceMappingURL=registry.d.ts.map