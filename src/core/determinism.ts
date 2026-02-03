import type { DiagnosticMessage } from "./types.js";

export function sortDiagnostics<T extends DiagnosticMessage>(items: T[]): T[] {
  return items
    .slice()
    .sort((a, b) =>
      compareStrings(a.code, b.code) ||
      compareStrings(a.component ?? "", b.component ?? "") ||
      compareStrings(a.net ?? "", b.net ?? "") ||
      compareStrings(a.message, b.message),
    );
}

function compareStrings(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}
