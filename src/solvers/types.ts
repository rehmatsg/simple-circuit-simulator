import type { DiagnosticMessage } from "../core/types.js";

export interface DebugInfo {
  nodeCount: number;
  voltageSourceCount: number;
  matrixSize: number;
}

export interface SimulationResult {
  status: "ok" | "error";
  mode: "dc" | "transient" | "digital" | "hybrid";
  nodeVoltages: Record<string, number>;
  componentCurrents: Record<string, number | Record<string, number>>;
  componentPinCurrents: Record<string, Record<string, number>>;
  componentPower: Record<string, number>;
  errors: DiagnosticMessage[];
  warnings: DiagnosticMessage[];
  debug?: DebugInfo;
}
