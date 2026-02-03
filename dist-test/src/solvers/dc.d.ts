import type { Circuit } from "../core/circuit.js";
import type { ComponentRegistry } from "../components/registry.js";
import type { Netlist } from "../netlist/types.js";
import type { SimulationResult } from "./types.js";
export interface SolveDCOptions {
    registry?: ComponentRegistry;
    tolerance?: number;
    nonlinearTolerance?: number;
    maxIterations?: number;
    nonlinearDamping?: number;
    shortCircuitThreshold?: number;
    switchClosedResistance?: number;
}
export declare function solveDC(input: Circuit | Netlist, options?: SolveDCOptions): SimulationResult;
//# sourceMappingURL=dc.d.ts.map