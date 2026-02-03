import type { Circuit } from "../core/circuit.js";
import type { Diagnostic } from "../core/types.js";
import type { ComponentRegistry } from "../components/registry.js";
import type { Netlist } from "./types.js";
export interface BuildNetlistOptions {
    registry: ComponentRegistry;
    switchClosedResistance?: number;
}
export type NetlistBuildResult = {
    ok: true;
    netlist: Netlist;
    warnings: Diagnostic[];
} | {
    ok: false;
    errors: Diagnostic[];
    warnings: Diagnostic[];
};
export declare function buildNetlist(circuit: Circuit, options: BuildNetlistOptions): NetlistBuildResult;
//# sourceMappingURL=builder.d.ts.map