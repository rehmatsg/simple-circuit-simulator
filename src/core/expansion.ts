import { Circuit, type CircuitDocument, type ComponentDocument } from "./circuit.js";
import type { ValueExpr } from "./types.js";

export interface ExpansionOptions {
  vddNet?: string;
  gndNet?: string;
}

export function expandCmosGates(
  document: CircuitDocument,
  options: ExpansionOptions = {},
): CircuitDocument {
  const vddNet = options.vddNet ?? "VDD";
  const gndNet = options.gndNet ?? document.groundNet;
  let counter = 0;

  const expandedComponents: ComponentDocument[] = [];

  for (const component of document.components) {
    if (component.type === "cmos_not") {
      const outNet = component.pins.out;
      const inNet = component.pins.in1;
      if (!outNet || !inNet) {
        expandedComponents.push(component);
        continue;
      }
      expandedComponents.push(
        ...buildInverter(component.name, inNet, outNet, vddNet, gndNet, nextId),
      );
      continue;
    }

    if (component.type === "cmos_nand" || component.type === "cmos_nor") {
      const outNet = component.pins.out;
      const in1 = component.pins.in1;
      const in2 = component.pins.in2;
      if (!outNet || !in1 || !in2) {
        expandedComponents.push(component);
        continue;
      }
      if (component.type === "cmos_nand") {
        expandedComponents.push(
          ...buildNand(component.name, in1, in2, outNet, vddNet, gndNet, nextId),
        );
      } else {
        expandedComponents.push(
          ...buildNor(component.name, in1, in2, outNet, vddNet, gndNet, nextId),
        );
      }
      continue;
    }

    expandedComponents.push(component);
  }

  return {
    ...document,
    components: expandedComponents,
  };

  function nextId(prefix: string) {
    counter += 1;
    return `${prefix}_${counter}`;
  }
}

function buildInverter(
  base: string,
  input: string,
  output: string,
  vdd: string,
  gnd: string,
  nextId: (prefix: string) => string,
): ComponentDocument[] {
  return [
    {
      name: nextId(`${base}_p`),
      type: "mosfet_p",
      pins: { d: output, g: input, s: vdd, b: vdd },
    },
    {
      name: nextId(`${base}_n`),
      type: "mosfet_n",
      pins: { d: output, g: input, s: gnd, b: gnd },
    },
  ];
}

function buildNand(
  base: string,
  in1: string,
  in2: string,
  output: string,
  vdd: string,
  gnd: string,
  nextId: (prefix: string) => string,
): ComponentDocument[] {
  const nMid = `${base}_nmid`;
  return [
    {
      name: nextId(`${base}_p1`),
      type: "mosfet_p",
      pins: { d: output, g: in1, s: vdd, b: vdd },
    },
    {
      name: nextId(`${base}_p2`),
      type: "mosfet_p",
      pins: { d: output, g: in2, s: vdd, b: vdd },
    },
    {
      name: nextId(`${base}_n1`),
      type: "mosfet_n",
      pins: { d: output, g: in1, s: nMid, b: gnd },
    },
    {
      name: nextId(`${base}_n2`),
      type: "mosfet_n",
      pins: { d: nMid, g: in2, s: gnd, b: gnd },
    },
  ];
}

function buildNor(
  base: string,
  in1: string,
  in2: string,
  output: string,
  vdd: string,
  gnd: string,
  nextId: (prefix: string) => string,
): ComponentDocument[] {
  const pMid = `${base}_pmid`;
  return [
    {
      name: nextId(`${base}_p1`),
      type: "mosfet_p",
      pins: { d: output, g: in1, s: pMid, b: vdd },
    },
    {
      name: nextId(`${base}_p2`),
      type: "mosfet_p",
      pins: { d: pMid, g: in2, s: vdd, b: vdd },
    },
    {
      name: nextId(`${base}_n1`),
      type: "mosfet_n",
      pins: { d: output, g: in1, s: gnd, b: gnd },
    },
    {
      name: nextId(`${base}_n2`),
      type: "mosfet_n",
      pins: { d: output, g: in2, s: gnd, b: gnd },
    },
  ];
}

export function createCmosGate(
  type: "cmos_not" | "cmos_nand" | "cmos_nor",
  name: string,
  pins: Record<string, string>,
  props?: Record<string, ValueExpr>,
): ComponentDocument {
  const component: ComponentDocument = {
    name,
    type,
    pins,
  };

  if (props) {
    component.props = props;
  }

  return component;
}

export function expandCircuit(
  circuit: Circuit,
  options: ExpansionOptions = {},
): Circuit {
  const expanded = expandCmosGates(circuit.toJSON(), options);
  return new Circuit(expanded);
}
