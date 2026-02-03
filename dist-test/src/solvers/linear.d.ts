import type { Diagnostic } from "../core/types.js";
export interface LinearSolveResult {
    ok: true;
    solution: number[];
}
export interface LinearSolveError {
    ok: false;
    error: Diagnostic;
}
export type LinearSolveResponse = LinearSolveResult | LinearSolveError;
export interface LinearSolveOptions {
    tolerance?: number;
}
export declare function solveLinearSystem(matrix: number[][], rhs: number[], options?: LinearSolveOptions): LinearSolveResponse;
//# sourceMappingURL=linear.d.ts.map