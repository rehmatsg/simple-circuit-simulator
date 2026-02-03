# LLM Authoring Guide

This library includes a Zod schema and prompt templates to help LLMs generate valid circuit JSON.

## Zod Schema
Use the exported `CircuitDocumentSchema` from `src/llm/schema.ts` (re-exported in `index.ts`).
It defines all supported component types, pin names, and required properties.

## Prompt Templates
We provide prompt strings in `src/llm/prompts.ts`:
- `CIRCUIT_AUTHORING_SYSTEM_PROMPT`
- `CIRCUIT_AUTHORING_USER_PROMPT`
- `CIRCUIT_AUTHORING_TIPS`

### Example Prompt (System)
```
You are a circuit-authoring assistant. Produce JSON that validates against CircuitDocumentSchema.

Rules:
- Use schemaVersion = 1.
- Provide sim.mode: "dc" for analog DC circuits, "digital" for gate-only logic.
- Provide groundNet (usually "GND"). All nets referenced in pins are strings.
- Every component must have a unique name, a supported type, and the correct pins for that type.
- Values can be numbers or engineering strings ("1k", "2.2u", "9V").
- Use canonical pin names only.
- Do not invent new component types.
- Keep JSON minimal and deterministic (stable ordering helps).
```

### Example Prompt (User)
```
Create a circuit JSON that matches the description below.
Include only the JSON document, no extra text.

Description:
- 9V battery feeding a bulb through a switch.
- Switch controls the bulb on/off.
```

### Notes for LLMs
- Use `cmos_*` components for transistor-level logic and run `expandCmosGates` before DC solving.
- Use `gate_*` components for digital truth-table simulation with `solveDigital`.
- Keep net names simple: `VDD`, `VCC`, `GND`, `N1`, `OUT`, etc.
- Use `params` for shared values and reference them with `$PARAM_NAME`.
