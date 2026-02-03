import { Circuit, type CircuitDocument, type ComponentDocument } from "./circuit.js";
import type { ValueExpr } from "./types.js";

export interface ExpansionOptions {
  vddNet?: string;
  gndNet?: string;
}

const MAX_EXPANSION_PASSES = 6;

export function expandCmosGates(
  document: CircuitDocument,
  options: ExpansionOptions = {},
): CircuitDocument {
  const vddNet = options.vddNet ?? "VDD";
  const gndNet = options.gndNet ?? document.groundNet;
  let counter = 0;

  let current = document;
  for (let pass = 0; pass < MAX_EXPANSION_PASSES; pass += 1) {
    const { document: next, changed } = expandCmosPass(current, vddNet, gndNet, nextId);
    current = next;
    if (!changed) {
      break;
    }
  }

  return current;

  function nextId(prefix: string) {
    counter += 1;
    return `${prefix}_${counter}`;
  }
}

function expandCmosPass(
  document: CircuitDocument,
  vddNet: string,
  gndNet: string,
  nextId: (prefix: string) => string,
): { document: CircuitDocument; changed: boolean } {
  const expandedComponents: ComponentDocument[] = [];
  let changed = false;

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
      changed = true;
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
      changed = true;
      continue;
    }

    if (component.type === "cmos_and") {
      const outNet = component.pins.out;
      const in1 = component.pins.in1;
      const in2 = component.pins.in2;
      if (!outNet || !in1 || !in2) {
        expandedComponents.push(component);
        continue;
      }
      expandedComponents.push(
        ...buildAnd(component.name, in1, in2, outNet, nextId),
      );
      changed = true;
      continue;
    }

    if (component.type === "cmos_or") {
      const outNet = component.pins.out;
      const in1 = component.pins.in1;
      const in2 = component.pins.in2;
      if (!outNet || !in1 || !in2) {
        expandedComponents.push(component);
        continue;
      }
      expandedComponents.push(
        ...buildOr(component.name, in1, in2, outNet, nextId),
      );
      changed = true;
      continue;
    }

    if (component.type === "cmos_xor") {
      const outNet = component.pins.out;
      const in1 = component.pins.in1;
      const in2 = component.pins.in2;
      if (!outNet || !in1 || !in2) {
        expandedComponents.push(component);
        continue;
      }
      expandedComponents.push(
        ...buildXor(component.name, in1, in2, outNet, nextId),
      );
      changed = true;
      continue;
    }

    if (component.type === "cmos_half_adder") {
      const a = component.pins.a;
      const b = component.pins.b;
      const sum = component.pins.sum;
      const carry = component.pins.carry;
      if (!a || !b || !sum || !carry) {
        expandedComponents.push(component);
        continue;
      }
      expandedComponents.push(
        ...buildHalfAdder(component.name, a, b, sum, carry, nextId),
      );
      changed = true;
      continue;
    }

    if (component.type === "cmos_full_adder") {
      const a = component.pins.a;
      const b = component.pins.b;
      const cin = component.pins.cin;
      const sum = component.pins.sum;
      const cout = component.pins.cout;
      if (!a || !b || !cin || !sum || !cout) {
        expandedComponents.push(component);
        continue;
      }
      expandedComponents.push(
        ...buildFullAdder(component.name, a, b, cin, sum, cout, nextId),
      );
      changed = true;
      continue;
    }

    expandedComponents.push(component);
  }

  return {
    document: {
      ...document,
      components: expandedComponents,
    },
    changed,
  };
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

function buildAnd(
  base: string,
  in1: string,
  in2: string,
  output: string,
  nextId: (prefix: string) => string,
): ComponentDocument[] {
  const nandOut = `${base}_nand`;
  return [
    {
      name: nextId(`${base}_nand`),
      type: "cmos_nand",
      pins: { in1, in2, out: nandOut },
    },
    {
      name: nextId(`${base}_inv`),
      type: "cmos_not",
      pins: { in1: nandOut, out: output },
    },
  ];
}

function buildOr(
  base: string,
  in1: string,
  in2: string,
  output: string,
  nextId: (prefix: string) => string,
): ComponentDocument[] {
  const norOut = `${base}_nor`;
  return [
    {
      name: nextId(`${base}_nor`),
      type: "cmos_nor",
      pins: { in1, in2, out: norOut },
    },
    {
      name: nextId(`${base}_inv`),
      type: "cmos_not",
      pins: { in1: norOut, out: output },
    },
  ];
}

function buildXor(
  base: string,
  in1: string,
  in2: string,
  output: string,
  nextId: (prefix: string) => string,
): ComponentDocument[] {
  const n1 = `${base}_n1`;
  const n2 = `${base}_n2`;
  const n3 = `${base}_n3`;
  return [
    {
      name: nextId(`${base}_nand1`),
      type: "cmos_nand",
      pins: { in1, in2, out: n1 },
    },
    {
      name: nextId(`${base}_nand2`),
      type: "cmos_nand",
      pins: { in1, in2: n1, out: n2 },
    },
    {
      name: nextId(`${base}_nand3`),
      type: "cmos_nand",
      pins: { in1: in2, in2: n1, out: n3 },
    },
    {
      name: nextId(`${base}_nand4`),
      type: "cmos_nand",
      pins: { in1: n2, in2: n3, out: output },
    },
  ];
}

function buildHalfAdder(
  base: string,
  a: string,
  b: string,
  sum: string,
  carry: string,
  nextId: (prefix: string) => string,
): ComponentDocument[] {
  return [
    {
      name: nextId(`${base}_xor`),
      type: "cmos_xor",
      pins: { in1: a, in2: b, out: sum },
    },
    {
      name: nextId(`${base}_and`),
      type: "cmos_and",
      pins: { in1: a, in2: b, out: carry },
    },
  ];
}

function buildFullAdder(
  base: string,
  a: string,
  b: string,
  cin: string,
  sum: string,
  cout: string,
  nextId: (prefix: string) => string,
): ComponentDocument[] {
  const xor1 = `${base}_xor1`;
  const and1 = `${base}_and1`;
  const and2 = `${base}_and2`;
  return [
    {
      name: nextId(`${base}_xor1`),
      type: "cmos_xor",
      pins: { in1: a, in2: b, out: xor1 },
    },
    {
      name: nextId(`${base}_xor2`),
      type: "cmos_xor",
      pins: { in1: xor1, in2: cin, out: sum },
    },
    {
      name: nextId(`${base}_and1`),
      type: "cmos_and",
      pins: { in1: a, in2: b, out: and1 },
    },
    {
      name: nextId(`${base}_and2`),
      type: "cmos_and",
      pins: { in1: xor1, in2: cin, out: and2 },
    },
    {
      name: nextId(`${base}_or`),
      type: "cmos_or",
      pins: { in1: and1, in2: and2, out: cout },
    },
  ];
}

export function createCmosGate(
  type:
    | "cmos_not"
    | "cmos_nand"
    | "cmos_nor"
    | "cmos_and"
    | "cmos_or"
    | "cmos_xor"
    | "cmos_half_adder"
    | "cmos_full_adder",
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
