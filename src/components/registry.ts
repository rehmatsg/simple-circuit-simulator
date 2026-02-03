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

export class ComponentRegistry {
  private readonly definitions = new Map<string, ComponentDefinition>();

  register(definition: ComponentDefinition): void {
    if (this.definitions.has(definition.type)) {
      throw new Error(`Component type "${definition.type}" is already registered.`);
    }
    this.definitions.set(definition.type, definition);
  }

  has(type: string): boolean {
    return this.definitions.has(type);
  }

  get(type: string): ComponentDefinition | undefined {
    return this.definitions.get(type);
  }

  list(): ComponentDefinition[] {
    return Array.from(this.definitions.values());
  }
}
