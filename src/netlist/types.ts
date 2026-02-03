export type NodeId = number;

export type ElementType = "resistor" | "voltage_source" | "current_source" | "diode" | "capacitor" | "inductor";

export interface TerminalRef {
  component: string;
  pin: string;
}

export interface NetlistNode {
  id: NodeId;
  name: string;
  terminals: TerminalRef[];
}

export interface NetlistElement {
  id: string;
  type: ElementType;
  component: string;
  originalType: string;
  nodes: [NodeId, NodeId];
  pins: [string, string];
  params: Record<string, number>;
}

export interface Netlist {
  nodes: NetlistNode[];
  groundNodeId: NodeId;
  elements: NetlistElement[];
  nodeByName: Record<string, NodeId>;
}
