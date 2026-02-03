import { z } from "zod";

const NetNameSchema = z
  .string()
  .min(1)
  .describe("Net name. Pins that share the same net are electrically connected.");

const ComponentNameSchema = z
  .string()
  .min(1)
  .describe("Unique component name within the circuit.");

export const ValueExprSchema = z
  .union([z.number(), z.string()])
  .describe(
    "Value expression: number (e.g. 1000), engineering string (e.g. '1k', '2.2u', '9V'), or parameter reference (e.g. '$R1').",
  );

const MetaSchema = z
  .record(z.string())
  .describe("Optional metadata for visualization or annotations.");

const WireEndpointSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("pin"),
      component: z.string().min(1),
      pin: z.string().min(1),
    })
    .describe("Pin endpoint referencing a component and pin."),
  z
    .object({
      kind: z.literal("junction"),
      id: z.string().min(1),
    })
    .describe("Junction endpoint referencing a junction id."),
]);

const JunctionSchema = z
  .object({
    id: z.string().min(1).describe("Unique junction id."),
    net: z.string().min(1).describe("Net name the junction belongs to."),
    meta: MetaSchema.optional(),
  })
  .strict()
  .describe("Wire junction used for UI layout.");

const WireSchema = z
  .object({
    id: z.string().min(1).describe("Unique wire id."),
    net: z.string().min(1).describe("Net name the wire belongs to."),
    from: WireEndpointSchema.describe("Wire start endpoint."),
    to: WireEndpointSchema.describe("Wire end endpoint."),
    meta: MetaSchema.optional(),
  })
  .strict()
  .describe("Wire segment used for UI layout.");

const BaseComponentSchema = z.object({
  name: ComponentNameSchema,
  model: z
    .string()
    .min(1)
    .describe("Optional model identifier (future extension).")
    .optional(),
  meta: MetaSchema.optional(),
});

const BatterySchema = BaseComponentSchema.extend({
  type: z.literal("battery").describe("Ideal DC voltage source."),
  pins: z
    .object({ pos: NetNameSchema, neg: NetNameSchema })
    .strict()
    .describe("Battery pins: pos (positive), neg (negative)."),
  props: z
    .object({ voltage: ValueExprSchema })
    .strict()
    .describe("Battery properties."),
});

const CurrentSourceSchema = BaseComponentSchema.extend({
  type: z.literal("current_source").describe("Ideal DC current source."),
  pins: z
    .object({ pos: NetNameSchema, neg: NetNameSchema })
    .strict()
    .describe("Current source pins: pos, neg."),
  props: z
    .object({ current: ValueExprSchema })
    .strict()
    .describe("Current source properties."),
});

const ResistorSchema = BaseComponentSchema.extend({
  type: z.literal("resistor"),
  pins: z
    .object({ a: NetNameSchema, b: NetNameSchema })
    .strict()
    .describe("Resistor pins: a, b."),
  props: z
    .object({ resistance: ValueExprSchema })
    .strict()
    .describe("Resistance in ohms (unit optional)."),
});

const BulbSchema = BaseComponentSchema.extend({
  type: z.literal("bulb").describe("Bulb modeled as a resistor."),
  pins: z
    .object({ a: NetNameSchema, b: NetNameSchema })
    .strict()
    .describe("Bulb pins: a, b."),
  props: z
    .object({ resistance: ValueExprSchema })
    .strict()
    .describe("Bulb resistance in ohms."),
});

const SwitchSchema = BaseComponentSchema.extend({
  type: z.literal("switch"),
  pins: z
    .object({ a: NetNameSchema, b: NetNameSchema })
    .strict()
    .describe("Switch pins: a, b."),
  props: z
    .object({ state: z.enum(["open", "closed"]) })
    .strict()
    .describe("Switch state: open or closed."),
});

const DiodeSchema = BaseComponentSchema.extend({
  type: z.literal("diode"),
  pins: z
    .object({ anode: NetNameSchema, cathode: NetNameSchema })
    .strict()
    .describe("Diode pins: anode, cathode."),
  props: z
    .object({
      is: ValueExprSchema.optional(),
      n: ValueExprSchema.optional(),
      vt: ValueExprSchema.optional(),
    })
    .strict()
    .optional()
    .describe("Optional diode parameters (saturation current, emission, thermal voltage)."),
});

const LedSchema = BaseComponentSchema.extend({
  type: z.literal("led"),
  pins: z
    .object({ anode: NetNameSchema, cathode: NetNameSchema })
    .strict()
    .describe("LED pins: anode, cathode."),
  props: z
    .object({
      is: ValueExprSchema.optional(),
      n: ValueExprSchema.optional(),
      vt: ValueExprSchema.optional(),
    })
    .strict()
    .optional()
    .describe("Optional LED parameters (saturation current, emission, thermal voltage)."),
});

const GateAndSchema = BaseComponentSchema.extend({
  type: z.literal("gate_and"),
  pins: z
    .object({ in1: NetNameSchema, in2: NetNameSchema, out: NetNameSchema })
    .strict()
    .describe("AND gate pins: in1, in2, out."),
});

const GateOrSchema = BaseComponentSchema.extend({
  type: z.literal("gate_or"),
  pins: z
    .object({ in1: NetNameSchema, in2: NetNameSchema, out: NetNameSchema })
    .strict()
    .describe("OR gate pins: in1, in2, out."),
});

const GateNotSchema = BaseComponentSchema.extend({
  type: z.literal("gate_not"),
  pins: z
    .object({ in1: NetNameSchema, out: NetNameSchema })
    .strict()
    .describe("NOT gate pins: in1, out."),
});

const CapacitorSchema = BaseComponentSchema.extend({
  type: z.literal("capacitor"),
  pins: z
    .object({ a: NetNameSchema, b: NetNameSchema })
    .strict()
    .describe("Capacitor pins: a, b."),
  props: z
    .object({ capacitance: ValueExprSchema })
    .strict()
    .describe("Capacitance in farads."),
});

const InductorSchema = BaseComponentSchema.extend({
  type: z.literal("inductor"),
  pins: z
    .object({ a: NetNameSchema, b: NetNameSchema })
    .strict()
    .describe("Inductor pins: a, b."),
  props: z
    .object({ inductance: ValueExprSchema })
    .strict()
    .describe("Inductance in henries."),
});

const MosfetNSchema = BaseComponentSchema.extend({
  type: z.literal("mosfet_n"),
  pins: z
    .object({
      d: NetNameSchema,
      g: NetNameSchema,
      s: NetNameSchema,
      b: NetNameSchema.optional(),
    })
    .strict()
    .describe("NMOS pins: d (drain), g (gate), s (source), optional b (body)."),
  props: z
    .object({
      vth: ValueExprSchema.optional(),
      ron: ValueExprSchema.optional(),
      roff: ValueExprSchema.optional(),
    })
    .strict()
    .optional()
    .describe("Optional NMOS parameters: threshold, on/off resistance."),
});

const MosfetPSchema = BaseComponentSchema.extend({
  type: z.literal("mosfet_p"),
  pins: z
    .object({
      d: NetNameSchema,
      g: NetNameSchema,
      s: NetNameSchema,
      b: NetNameSchema.optional(),
    })
    .strict()
    .describe("PMOS pins: d (drain), g (gate), s (source), optional b (body)."),
  props: z
    .object({
      vth: ValueExprSchema.optional(),
      ron: ValueExprSchema.optional(),
      roff: ValueExprSchema.optional(),
    })
    .strict()
    .optional()
    .describe("Optional PMOS parameters: threshold, on/off resistance."),
});

const CmosNotSchema = BaseComponentSchema.extend({
  type: z.literal("cmos_not"),
  pins: z
    .object({ in1: NetNameSchema, out: NetNameSchema })
    .strict()
    .describe("CMOS inverter pins: in1, out."),
});

const CmosNandSchema = BaseComponentSchema.extend({
  type: z.literal("cmos_nand"),
  pins: z
    .object({ in1: NetNameSchema, in2: NetNameSchema, out: NetNameSchema })
    .strict()
    .describe("CMOS NAND pins: in1, in2, out."),
});

const CmosNorSchema = BaseComponentSchema.extend({
  type: z.literal("cmos_nor"),
  pins: z
    .object({ in1: NetNameSchema, in2: NetNameSchema, out: NetNameSchema })
    .strict()
    .describe("CMOS NOR pins: in1, in2, out."),
});

const CmosAndSchema = BaseComponentSchema.extend({
  type: z.literal("cmos_and"),
  pins: z
    .object({ in1: NetNameSchema, in2: NetNameSchema, out: NetNameSchema })
    .strict()
    .describe("CMOS AND pins: in1, in2, out."),
});

const CmosOrSchema = BaseComponentSchema.extend({
  type: z.literal("cmos_or"),
  pins: z
    .object({ in1: NetNameSchema, in2: NetNameSchema, out: NetNameSchema })
    .strict()
    .describe("CMOS OR pins: in1, in2, out."),
});

const CmosXorSchema = BaseComponentSchema.extend({
  type: z.literal("cmos_xor"),
  pins: z
    .object({ in1: NetNameSchema, in2: NetNameSchema, out: NetNameSchema })
    .strict()
    .describe("CMOS XOR pins: in1, in2, out."),
});

const CmosHalfAdderSchema = BaseComponentSchema.extend({
  type: z.literal("cmos_half_adder"),
  pins: z
    .object({ a: NetNameSchema, b: NetNameSchema, sum: NetNameSchema, carry: NetNameSchema })
    .strict()
    .describe("CMOS half adder pins: a, b, sum, carry."),
});

const CmosFullAdderSchema = BaseComponentSchema.extend({
  type: z.literal("cmos_full_adder"),
  pins: z
    .object({
      a: NetNameSchema,
      b: NetNameSchema,
      cin: NetNameSchema,
      sum: NetNameSchema,
      cout: NetNameSchema,
    })
    .strict()
    .describe("CMOS full adder pins: a, b, cin, sum, cout."),
});

export const ComponentSchema = z.discriminatedUnion("type", [
  BatterySchema,
  CurrentSourceSchema,
  ResistorSchema,
  BulbSchema,
  SwitchSchema,
  DiodeSchema,
  LedSchema,
  GateAndSchema,
  GateOrSchema,
  GateNotSchema,
  CapacitorSchema,
  InductorSchema,
  MosfetNSchema,
  MosfetPSchema,
  CmosNotSchema,
  CmosNandSchema,
  CmosNorSchema,
  CmosAndSchema,
  CmosOrSchema,
  CmosXorSchema,
  CmosHalfAdderSchema,
  CmosFullAdderSchema,
]);

export const CircuitDocumentSchema = z.object({
  schemaVersion: z
    .number()
    .int()
    .describe("Schema version. Use 1 for the current format."),
  sim: z
    .object({
      mode: z
        .enum(["dc", "transient", "digital", "hybrid"])
        .describe("Simulation mode. Use 'dc' for analog DC circuits."),
    })
    .strict()
    .describe("Simulation configuration."),
  groundNet: NetNameSchema.describe("Name of the ground reference net."),
  components: z
    .array(ComponentSchema)
    .min(1)
    .describe("List of circuit components."),
  title: z.string().optional().describe("Optional circuit title."),
  params: z
    .record(z.union([z.number(), z.string(), z.boolean()]))
    .optional()
    .describe("Optional shared parameters for value expressions."),
  meta: MetaSchema.optional().describe("Optional circuit-level metadata."),
  junctions: z.array(JunctionSchema).optional().describe("Optional wire junctions."),
  wires: z.array(WireSchema).optional().describe("Optional wire segments."),
});

export type CircuitDocumentInput = z.input<typeof CircuitDocumentSchema>;
export type CircuitDocumentOutput = z.output<typeof CircuitDocumentSchema>;
