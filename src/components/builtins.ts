import { ComponentRegistry, type ComponentDefinition } from "./registry.js";

const BUILTIN_COMPONENTS: ComponentDefinition[] = [
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

export function registerBuiltinComponents(registry: ComponentRegistry): void {
  for (const definition of BUILTIN_COMPONENTS) {
    registry.register(definition);
  }
}

export function createDefaultRegistry(): ComponentRegistry {
  const registry = new ComponentRegistry();
  registerBuiltinComponents(registry);
  return registry;
}

export function listBuiltinComponents(): ComponentDefinition[] {
  return BUILTIN_COMPONENTS.map((definition) => {
    const clone: ComponentDefinition = {
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
