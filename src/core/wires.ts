export type WireEndpoint =
  | { kind: "pin"; component: string; pin: string }
  | { kind: "junction"; id: string };

export interface JunctionDocument {
  id: string;
  net: string;
  meta?: Record<string, string>;
}

export interface WireDocument {
  id: string;
  net: string;
  from: WireEndpoint;
  to: WireEndpoint;
  meta?: Record<string, string>;
}
