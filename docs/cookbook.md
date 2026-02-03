# Cookbook Examples

## Bulb + Switch
```json
{
  "schemaVersion": 1,
  "sim": { "mode": "dc" },
  "groundNet": "GND",
  "components": [
    { "name": "B1", "type": "battery", "pins": { "pos": "VCC", "neg": "GND" }, "props": { "voltage": "9V" } },
    { "name": "S1", "type": "switch", "pins": { "a": "VCC", "b": "N1" }, "props": { "state": "closed" } },
    { "name": "L1", "type": "bulb", "pins": { "a": "N1", "b": "GND" }, "props": { "resistance": "100" } }
  ]
}
```

## Voltage Divider
```json
{
  "schemaVersion": 1,
  "sim": { "mode": "dc" },
  "groundNet": "GND",
  "components": [
    { "name": "B1", "type": "battery", "pins": { "pos": "VCC", "neg": "GND" }, "props": { "voltage": "10V" } },
    { "name": "R1", "type": "resistor", "pins": { "a": "VCC", "b": "N1" }, "props": { "resistance": "1k" } },
    { "name": "R2", "type": "resistor", "pins": { "a": "N1", "b": "GND" }, "props": { "resistance": "1k" } }
  ]
}
```

## Parallel Loads
```json
{
  "schemaVersion": 1,
  "sim": { "mode": "dc" },
  "groundNet": "GND",
  "components": [
    { "name": "B1", "type": "battery", "pins": { "pos": "VCC", "neg": "GND" }, "props": { "voltage": "6V" } },
    { "name": "R1", "type": "resistor", "pins": { "a": "VCC", "b": "GND" }, "props": { "resistance": "1k" } },
    { "name": "R2", "type": "resistor", "pins": { "a": "VCC", "b": "GND" }, "props": { "resistance": "2k" } }
  ]
}
```

## Current Source into Resistor
```json
{
  "schemaVersion": 1,
  "sim": { "mode": "dc" },
  "groundNet": "GND",
  "components": [
    { "name": "I1", "type": "current_source", "pins": { "pos": "GND", "neg": "N1" }, "props": { "current": "10mA" } },
    { "name": "R1", "type": "resistor", "pins": { "a": "N1", "b": "GND" }, "props": { "resistance": "1k" } }
  ]
}
```
