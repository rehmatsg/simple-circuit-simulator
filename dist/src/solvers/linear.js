import { DiagnosticCodes, errorDiagnostic } from "../core/diagnostics.js";
const DEFAULT_TOLERANCE = 1e-12;
export function solveLinearSystem(matrix, rhs, options = {}) {
    const n = matrix.length;
    if (n === 0 || rhs.length !== n) {
        return {
            ok: false,
            error: errorDiagnostic(DiagnosticCodes.singularMatrix, "Matrix dimensions do not match RHS."),
        };
    }
    const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
    const A = matrix.map((row) => row.slice());
    const b = rhs.slice();
    for (let col = 0; col < n; col += 1) {
        const pivotRowData = A[col];
        if (!pivotRowData) {
            return {
                ok: false,
                error: errorDiagnostic(DiagnosticCodes.singularMatrix, "Matrix row is missing."),
            };
        }
        let pivotRow = col;
        let maxValue = Math.abs(pivotRowData[col] ?? 0);
        for (let row = col + 1; row < n; row += 1) {
            const rowData = A[row];
            if (!rowData) {
                return {
                    ok: false,
                    error: errorDiagnostic(DiagnosticCodes.singularMatrix, "Matrix row is missing."),
                };
            }
            const value = Math.abs(rowData[col] ?? 0);
            if (value > maxValue) {
                maxValue = value;
                pivotRow = row;
            }
        }
        if (maxValue < tolerance) {
            return {
                ok: false,
                error: errorDiagnostic(DiagnosticCodes.singularMatrix, "Matrix is singular or ill-conditioned."),
            };
        }
        if (pivotRow !== col) {
            const rowData = A[pivotRow];
            const currentRow = A[col];
            if (!rowData || !currentRow) {
                return {
                    ok: false,
                    error: errorDiagnostic(DiagnosticCodes.singularMatrix, "Matrix row is missing."),
                };
            }
            A[col] = rowData;
            A[pivotRow] = currentRow;
            const temp = b[col] ?? 0;
            b[col] = b[pivotRow] ?? 0;
            b[pivotRow] = temp;
        }
        const pivotRowNow = A[col];
        if (!pivotRowNow) {
            return {
                ok: false,
                error: errorDiagnostic(DiagnosticCodes.singularMatrix, "Matrix row is missing."),
            };
        }
        const pivot = pivotRowNow[col] ?? 0;
        for (let row = col + 1; row < n; row += 1) {
            const rowData = A[row];
            if (!rowData) {
                return {
                    ok: false,
                    error: errorDiagnostic(DiagnosticCodes.singularMatrix, "Matrix row is missing."),
                };
            }
            const factor = (rowData[col] ?? 0) / pivot;
            if (factor === 0) {
                continue;
            }
            for (let k = col; k < n; k += 1) {
                rowData[k] = (rowData[k] ?? 0) - factor * (pivotRowNow[k] ?? 0);
            }
            b[row] = (b[row] ?? 0) - factor * (b[col] ?? 0);
        }
    }
    const solution = new Array(n);
    for (let row = n - 1; row >= 0; row -= 1) {
        let sum = b[row] ?? 0;
        for (let col = row + 1; col < n; col += 1) {
            const rowData = A[row];
            if (!rowData) {
                return {
                    ok: false,
                    error: errorDiagnostic(DiagnosticCodes.singularMatrix, "Matrix row is missing."),
                };
            }
            sum -= (rowData[col] ?? 0) * (solution[col] ?? 0);
        }
        const rowData = A[row];
        if (!rowData) {
            return {
                ok: false,
                error: errorDiagnostic(DiagnosticCodes.singularMatrix, "Matrix row is missing."),
            };
        }
        const pivot = rowData[row] ?? 0;
        if (Math.abs(pivot) < tolerance) {
            return {
                ok: false,
                error: errorDiagnostic(DiagnosticCodes.singularMatrix, "Matrix is singular or ill-conditioned."),
            };
        }
        solution[row] = sum / pivot;
    }
    return { ok: true, solution };
}
//# sourceMappingURL=linear.js.map