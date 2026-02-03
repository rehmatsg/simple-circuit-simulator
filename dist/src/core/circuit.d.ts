import type { ValueExpr } from "./types.js";
import type { Diagnostic } from "./types.js";
export type SimMode = "dc" | "transient" | "digital" | "hybrid";
export interface CircuitDocument {
    schemaVersion: number;
    sim: {
        mode: SimMode;
    };
    groundNet: string;
    components: ComponentDocument[];
    title?: string;
    params?: Record<string, number | string | boolean>;
    meta?: Record<string, string>;
}
export interface ComponentDocument {
    name: string;
    type: string;
    pins: Record<string, string>;
    props?: Record<string, ValueExpr>;
    model?: string;
}
export interface CircuitInit {
    schemaVersion: number;
    mode: SimMode;
    groundNet: string;
    title?: string;
    params?: Record<string, number | string | boolean>;
    meta?: Record<string, string>;
}
export type CircuitParseResult = {
    ok: true;
    circuit: Circuit;
    warnings: Diagnostic[];
} | {
    ok: false;
    errors: Diagnostic[];
    warnings: Diagnostic[];
};
export declare class Circuit {
    private readonly components;
    readonly schemaVersion: number;
    readonly sim: {
        mode: SimMode;
    };
    readonly groundNet: string;
    readonly title?: string;
    readonly params?: Record<string, number | string | boolean>;
    readonly meta?: Record<string, string>;
    constructor(document: CircuitDocument);
    static create(init: CircuitInit): Circuit;
    listComponents(): ComponentDocument[];
    getComponent(name: string): ComponentDocument | undefined;
    addComponent(component: ComponentDocument): void;
    removeComponent(name: string): boolean;
    updateComponentProps(name: string, props: Record<string, ValueExpr>): void;
    updateComponentPins(name: string, pins: Record<string, string>): void;
    toJSON(): CircuitDocument;
}
//# sourceMappingURL=circuit.d.ts.map