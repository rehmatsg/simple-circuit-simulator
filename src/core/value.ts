import type { Unit, ValueExpr } from "./types.js";
import { DiagnosticCodes, errorDiagnostic } from "./diagnostics.js";

export type ValueParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ReturnType<typeof errorDiagnostic> };

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

const PREFIX_MULTIPLIERS: Record<string, number> = {
  p: 1e-12,
  n: 1e-9,
  u: 1e-6,
  m: 1e-3,
  k: 1e3,
  K: 1e3,
  M: 1e6,
  G: 1e9,
};

const UNIT_ALIASES: Record<string, Unit> = {
  v: "v",
  volt: "v",
  volts: "v",
  a: "a",
  amp: "a",
  amps: "a",
  ampere: "a",
  amperes: "a",
  f: "f",
  farad: "f",
  farads: "f",
  h: "h",
  henry: "h",
  henries: "h",
  ohm: "ohm",
  ohms: "ohm",
};

export function parseValueExpr(expr: ValueExpr): ValueParseResult<ParsedValue> {
  if (typeof expr === "number") {
    if (!Number.isFinite(expr)) {
      return {
        ok: false,
        error: errorDiagnostic(
          DiagnosticCodes.invalidNumeric,
          "Numeric value is not finite.",
        ),
      };
    }
    return { ok: true, value: { kind: "number", raw: expr, value: expr } };
  }

  const trimmed = expr.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      error: errorDiagnostic(
        DiagnosticCodes.invalidValue,
        "Value expression is empty.",
      ),
    };
  }

  if (trimmed.startsWith("$")) {
    const param = trimmed.slice(1).trim();
    if (param.length === 0) {
      return {
        ok: false,
        error: errorDiagnostic(
          DiagnosticCodes.invalidParameter,
          "Parameter reference is missing a name.",
        ),
      };
    }
    return { ok: true, value: { kind: "parameter", raw: expr, param } };
  }

  const numericMatch = trimmed.match(
    /^([+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:e[+-]?\d+)?)(.*)$/i,
  );

  if (!numericMatch) {
    return {
      ok: false,
      error: errorDiagnostic(
        DiagnosticCodes.invalidNumeric,
        `Unable to parse numeric value from "${expr}".`,
      ),
    };
  }

  const numericLiteral = numericMatch[1];
  const suffix = numericMatch[2]?.trim() ?? "";
  const baseValue = Number(numericLiteral);
  if (!Number.isFinite(baseValue)) {
    return {
      ok: false,
      error: errorDiagnostic(
        DiagnosticCodes.invalidNumeric,
        `Numeric literal "${numericLiteral}" is not finite.`,
      ),
    };
  }

  let prefix = "";
  let unitRaw = "";
  if (suffix.length > 0) {
    const firstChar = suffix.charAt(0);
    if (Object.prototype.hasOwnProperty.call(PREFIX_MULTIPLIERS, firstChar)) {
      prefix = firstChar;
      unitRaw = suffix.slice(1).trim();
    } else {
      unitRaw = suffix;
    }
  }

  const multiplier = prefix ? (PREFIX_MULTIPLIERS[prefix] ?? 1) : 1;
  const value = baseValue * multiplier;
  const unit = normalizeUnit(unitRaw);

  const parsedValue: ParsedValue = {
    kind: "number",
    raw: expr,
    value,
  };

  if (unit !== undefined) {
    parsedValue.unit = unit;
  }

  if (unitRaw.length > 0) {
    parsedValue.unitRaw = unitRaw;
  }

  return {
    ok: true,
    value: parsedValue,
  };
}

export function resolveNumberValue(
  expr: ValueExpr,
  options: ResolveValueOptions = {},
): ValueParseResult<ResolvedNumber> {
  const parsed = parseValueExpr(expr);
  if (!parsed.ok) {
    return parsed;
  }

  if (parsed.value.kind === "parameter") {
    const param = parsed.value.param;
    if (!param) {
      return {
        ok: false,
        error: errorDiagnostic(
          DiagnosticCodes.invalidParameter,
          "Parameter reference is missing a name.",
        ),
      };
    }
    const params = options.params ?? {};
    if (!Object.prototype.hasOwnProperty.call(params, param)) {
      return {
        ok: false,
        error: errorDiagnostic(
          DiagnosticCodes.unknownParameter,
          `Unknown parameter "$${param}".`,
        ),
      };
    }

    const paramValue = params[param];
    if (typeof paramValue === "number") {
      return resolveNumberValue(paramValue, {
        ...options,
        params,
      });
    }

    if (typeof paramValue === "string") {
      return resolveNumberValue(paramValue, {
        ...options,
        params,
      });
    }

    return {
      ok: false,
      error: errorDiagnostic(
        DiagnosticCodes.invalidValue,
        `Parameter "$${param}" is not a numeric value.`,
      ),
    };
  }

  const unit = parsed.value.unit;
  if (!unit && parsed.value.unitRaw) {
    return {
      ok: false,
      error: errorDiagnostic(
        DiagnosticCodes.unknownUnit,
        `Unknown unit "${parsed.value.unitRaw}".`,
      ),
    };
  }
  if (options.expectedUnit) {
    if (!unit) {
      if (options.allowUnitless === false) {
        return {
          ok: false,
          error: errorDiagnostic(
            DiagnosticCodes.unknownUnit,
            `Value is missing required unit "${options.expectedUnit}".`,
          ),
        };
      }
    } else if (unit !== options.expectedUnit) {
      return {
        ok: false,
        error: errorDiagnostic(
          DiagnosticCodes.unitMismatch,
          `Expected unit "${options.expectedUnit}" but found "${unit}".`,
        ),
      };
    }
  }

  const resolved: ResolvedNumber = {
    value: parsed.value.value!,
    raw: expr,
  };

  const resolvedUnit = unit ?? options.expectedUnit;
  if (resolvedUnit !== undefined) {
    resolved.unit = resolvedUnit;
  }

  return {
    ok: true,
    value: resolved,
  };
}

function normalizeUnit(raw: string): Unit | undefined {
  if (!raw) {
    return undefined;
  }
  const normalized = raw.trim().toLowerCase();
  return UNIT_ALIASES[normalized];
}
