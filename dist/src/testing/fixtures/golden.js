export const goldenFixtures = {
    single_resistor: {
        schemaVersion: 1,
        sim: { mode: "dc" },
        groundNet: "GND",
        components: [
            {
                name: "B1",
                type: "battery",
                pins: { pos: "VCC", neg: "GND" },
                props: { voltage: "10V" },
            },
            {
                name: "R1",
                type: "resistor",
                pins: { a: "VCC", b: "GND" },
                props: { resistance: "1k" },
            },
        ],
    },
    series_resistors: {
        schemaVersion: 1,
        sim: { mode: "dc" },
        groundNet: "GND",
        components: [
            {
                name: "B1",
                type: "battery",
                pins: { pos: "VCC", neg: "GND" },
                props: { voltage: "12V" },
            },
            {
                name: "R1",
                type: "resistor",
                pins: { a: "VCC", b: "N1" },
                props: { resistance: "1k" },
            },
            {
                name: "R2",
                type: "resistor",
                pins: { a: "N1", b: "GND" },
                props: { resistance: "2k" },
            },
        ],
    },
    parallel_resistors: {
        schemaVersion: 1,
        sim: { mode: "dc" },
        groundNet: "GND",
        components: [
            {
                name: "B1",
                type: "battery",
                pins: { pos: "VCC", neg: "GND" },
                props: { voltage: "6V" },
            },
            {
                name: "R1",
                type: "resistor",
                pins: { a: "VCC", b: "GND" },
                props: { resistance: "1k" },
            },
            {
                name: "R2",
                type: "resistor",
                pins: { a: "VCC", b: "GND" },
                props: { resistance: "2k" },
            },
        ],
    },
    voltage_divider: {
        schemaVersion: 1,
        sim: { mode: "dc" },
        groundNet: "GND",
        components: [
            {
                name: "B1",
                type: "battery",
                pins: { pos: "VCC", neg: "GND" },
                props: { voltage: "10V" },
            },
            {
                name: "R1",
                type: "resistor",
                pins: { a: "VCC", b: "N1" },
                props: { resistance: "1k" },
            },
            {
                name: "R2",
                type: "resistor",
                pins: { a: "N1", b: "GND" },
                props: { resistance: "1k" },
            },
        ],
    },
    switch_open: {
        schemaVersion: 1,
        sim: { mode: "dc" },
        groundNet: "GND",
        components: [
            {
                name: "B1",
                type: "battery",
                pins: { pos: "VCC", neg: "GND" },
                props: { voltage: "5V" },
            },
            {
                name: "S1",
                type: "switch",
                pins: { a: "VCC", b: "N1" },
                props: { state: "open" },
            },
            {
                name: "R1",
                type: "resistor",
                pins: { a: "N1", b: "GND" },
                props: { resistance: "1k" },
            },
        ],
    },
    switch_closed: {
        schemaVersion: 1,
        sim: { mode: "dc" },
        groundNet: "GND",
        components: [
            {
                name: "B1",
                type: "battery",
                pins: { pos: "VCC", neg: "GND" },
                props: { voltage: "5V" },
            },
            {
                name: "S1",
                type: "switch",
                pins: { a: "VCC", b: "N1" },
                props: { state: "closed" },
            },
            {
                name: "R1",
                type: "resistor",
                pins: { a: "N1", b: "GND" },
                props: { resistance: "1k" },
            },
        ],
    },
    short_circuit: {
        schemaVersion: 1,
        sim: { mode: "dc" },
        groundNet: "GND",
        components: [
            {
                name: "B1",
                type: "battery",
                pins: { pos: "VCC", neg: "GND" },
                props: { voltage: "5V" },
            },
            {
                name: "R1",
                type: "resistor",
                pins: { a: "VCC", b: "GND" },
                props: { resistance: "0.01" },
            },
        ],
    },
    floating_no_ground: {
        schemaVersion: 1,
        sim: { mode: "dc" },
        groundNet: "GND",
        components: [
            {
                name: "R1",
                type: "resistor",
                pins: { a: "N1", b: "N2" },
                props: { resistance: "1k" },
            },
        ],
    },
};
//# sourceMappingURL=golden.js.map