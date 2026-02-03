import type { ValueExpr } from "./types.js";
import type { Diagnostic } from "./types.js";
import type { JunctionDocument, WireDocument } from "./wires.js";

export type SimMode = "dc" | "transient" | "digital" | "hybrid";

export interface CircuitDocument {
  schemaVersion: number;
  sim: { mode: SimMode };
  groundNet: string;
  components: ComponentDocument[];
  title?: string;
  params?: Record<string, number | string | boolean>;
  meta?: Record<string, string>;
  junctions?: JunctionDocument[];
  wires?: WireDocument[];
}

export interface ComponentDocument {
  name: string;
  type: string;
  pins: Record<string, string>;
  props?: Record<string, ValueExpr>;
  model?: string;
  meta?: Record<string, string>;
}

export interface CircuitInit {
  schemaVersion: number;
  mode: SimMode;
  groundNet: string;
  title?: string;
  params?: Record<string, number | string | boolean>;
  meta?: Record<string, string>;
  junctions?: JunctionDocument[];
  wires?: WireDocument[];
}

export type CircuitParseResult =
  | { ok: true; circuit: Circuit; warnings: Diagnostic[] }
  | { ok: false; errors: Diagnostic[]; warnings: Diagnostic[] };

export class Circuit {
  private readonly components = new Map<string, ComponentDocument>();
  private readonly junctions: JunctionDocument[] = [];
  private readonly wires: WireDocument[] = [];

  readonly schemaVersion: number;
  readonly sim: { mode: SimMode };
  readonly groundNet: string;
  readonly title?: string;
  readonly params?: Record<string, number | string | boolean>;
  readonly meta?: Record<string, string>;

  constructor(document: CircuitDocument) {
    this.schemaVersion = document.schemaVersion;
    this.sim = { mode: document.sim.mode };
    this.groundNet = document.groundNet;
    if (document.title !== undefined) {
      this.title = document.title;
    }

    if (document.params !== undefined) {
      this.params = document.params;
    }

    if (document.meta !== undefined) {
      this.meta = document.meta;
    }

    for (const component of document.components) {
      this.components.set(component.name, cloneComponent(component));
    }

    if (document.junctions) {
      for (const junction of document.junctions) {
        this.junctions.push(cloneJunction(junction));
      }
    }

    if (document.wires) {
      for (const wire of document.wires) {
        this.wires.push(cloneWire(wire));
      }
    }
  }

  static create(init: CircuitInit): Circuit {
    const document: CircuitDocument = {
      schemaVersion: init.schemaVersion,
      sim: { mode: init.mode },
      groundNet: init.groundNet,
      components: [],
    };

    if (init.title !== undefined) {
      document.title = init.title;
    }

    if (init.params !== undefined) {
      document.params = init.params;
    }

    if (init.meta !== undefined) {
      document.meta = init.meta;
    }

    if (init.junctions) {
      document.junctions = init.junctions.map(cloneJunction);
    }

    if (init.wires) {
      document.wires = init.wires.map(cloneWire);
    }

    return new Circuit(document);
  }

  listComponents(): ComponentDocument[] {
    return Array.from(this.components.values()).map(cloneComponent);
  }

  listJunctions(): JunctionDocument[] {
    return this.junctions.map(cloneJunction);
  }

  listWires(): WireDocument[] {
    return this.wires.map(cloneWire);
  }

  getComponent(name: string): ComponentDocument | undefined {
    const component = this.components.get(name);
    return component ? cloneComponent(component) : undefined;
  }

  addComponent(component: ComponentDocument): void {
    if (this.components.has(component.name)) {
      throw new Error(`Component "${component.name}" already exists.`);
    }
    this.components.set(component.name, cloneComponent(component));
  }

  removeComponent(name: string): boolean {
    return this.components.delete(name);
  }

  updateComponentProps(name: string, props: Record<string, ValueExpr>): void {
    const component = this.components.get(name);
    if (!component) {
      throw new Error(`Component "${name}" does not exist.`);
    }
    component.props = { ...props };
  }

  updateComponentPins(name: string, pins: Record<string, string>): void {
    const component = this.components.get(name);
    if (!component) {
      throw new Error(`Component "${name}" does not exist.`);
    }
    component.pins = { ...pins };
  }

  toJSON(): CircuitDocument {
    const components = Array.from(this.components.values())
      .map(cloneComponent)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((component) => ({
        name: component.name,
        type: component.type,
        pins: sortRecord(component.pins),
        ...(component.props ? { props: sortRecord(component.props) } : {}),
        ...(component.model ? { model: component.model } : {}),
        ...(component.meta ? { meta: sortRecord(component.meta) } : {}),
      }));

    const document: CircuitDocument = {
      schemaVersion: this.schemaVersion,
      sim: { mode: this.sim.mode },
      groundNet: this.groundNet,
      components,
    };

    if (this.title) {
      document.title = this.title;
    }

    if (this.params) {
      document.params = sortRecord(this.params);
    }

    if (this.meta) {
      document.meta = sortRecord(this.meta);
    }

    if (this.junctions.length > 0) {
      document.junctions = this.junctions
        .map(cloneJunction)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((junction) => ({
          id: junction.id,
          net: junction.net,
          ...(junction.meta ? { meta: sortRecord(junction.meta) } : {}),
        }));
    }

    if (this.wires.length > 0) {
      document.wires = this.wires
        .map(cloneWire)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((wire) => ({
          id: wire.id,
          net: wire.net,
          from: normalizeEndpoint(wire.from),
          to: normalizeEndpoint(wire.to),
          ...(wire.meta ? { meta: sortRecord(wire.meta) } : {}),
        }));
    }

    return document;
  }
}

function cloneComponent(component: ComponentDocument): ComponentDocument {
  return {
    name: component.name,
    type: component.type,
    pins: { ...component.pins },
    ...(component.props ? { props: { ...component.props } } : {}),
    ...(component.model ? { model: component.model } : {}),
    ...(component.meta ? { meta: { ...component.meta } } : {}),
  };
}

function cloneJunction(junction: JunctionDocument): JunctionDocument {
  return {
    id: junction.id,
    net: junction.net,
    ...(junction.meta ? { meta: { ...junction.meta } } : {}),
  };
}

function cloneWire(wire: WireDocument): WireDocument {
  return {
    id: wire.id,
    net: wire.net,
    from: normalizeEndpoint(wire.from),
    to: normalizeEndpoint(wire.to),
    ...(wire.meta ? { meta: { ...wire.meta } } : {}),
  };
}

function normalizeEndpoint(endpoint: WireDocument["from"]): WireDocument["from"] {
  if (endpoint.kind === "pin") {
    return {
      kind: "pin",
      component: endpoint.component,
      pin: endpoint.pin,
    };
  }
  return {
    kind: "junction",
    id: endpoint.id,
  };
}

function sortRecord<T extends Record<string, unknown>>(record: T): T {
  const entries = Object.entries(record).sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries) as T;
}
