import type { Unit, ValueExpr } from "./types.js";
import { errorDiagnostic } from "./diagnostics.js";
export type ValueParseResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: ReturnType<typeof errorDiagnostic>;
};
export interface ParsedValue {
    kind: "number" | "parameter";
    raw: ValueExpr;
    value?: number;
    unit?: Unit;
    unitRaw?: string;
    param?: string;
}
export interface ResolvedNumber {
    value: number;
    unit?: Unit;
    raw: ValueExpr;
}
export interface ResolveValueOptions {
    params?: Record<string, number | string | boolean>;
    expectedUnit?: Unit;
    allowUnitless?: boolean;
}
export declare function parseValueExpr(expr: ValueExpr): ValueParseResult<ParsedValue>;
export declare function resolveNumberValue(expr: ValueExpr, options?: ResolveValueOptions): ValueParseResult<ResolvedNumber>;
//# sourceMappingURL=value.d.ts.map