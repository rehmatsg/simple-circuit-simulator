export type ValueExpr = number | string;

export type DiagnosticSeverity = "error" | "warning";

export interface DiagnosticMessage {
  code: string;
  message: string;
  component?: string;
  net?: string;
  details?: Record<string, string | number>;
}

export interface Diagnostic extends DiagnosticMessage {
  severity: DiagnosticSeverity;
}

export type Unit = "ohm" | "v" | "a";
