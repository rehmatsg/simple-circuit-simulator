export declare const goldenFixtures: {
    single_resistor: {
        schemaVersion: number;
        sim: {
            mode: "dc";
        };
        groundNet: string;
        components: ({
            name: string;
            type: string;
            pins: {
                pos: string;
                neg: string;
                a?: never;
                b?: never;
            };
            props: {
                voltage: string;
                resistance?: never;
            };
        } | {
            name: string;
            type: string;
            pins: {
                a: string;
                b: string;
                pos?: never;
                neg?: never;
            };
            props: {
                resistance: string;
                voltage?: never;
            };
        })[];
    };
    series_resistors: {
        schemaVersion: number;
        sim: {
            mode: "dc";
        };
        groundNet: string;
        components: ({
            name: string;
            type: string;
            pins: {
                pos: string;
                neg: string;
                a?: never;
                b?: never;
            };
            props: {
                voltage: string;
                resistance?: never;
            };
        } | {
            name: string;
            type: string;
            pins: {
                a: string;
                b: string;
                pos?: never;
                neg?: never;
            };
            props: {
                resistance: string;
                voltage?: never;
            };
        })[];
    };
    parallel_resistors: {
        schemaVersion: number;
        sim: {
            mode: "dc";
        };
        groundNet: string;
        components: ({
            name: string;
            type: string;
            pins: {
                pos: string;
                neg: string;
                a?: never;
                b?: never;
            };
            props: {
                voltage: string;
                resistance?: never;
            };
        } | {
            name: string;
            type: string;
            pins: {
                a: string;
                b: string;
                pos?: never;
                neg?: never;
            };
            props: {
                resistance: string;
                voltage?: never;
            };
        })[];
    };
    voltage_divider: {
        schemaVersion: number;
        sim: {
            mode: "dc";
        };
        groundNet: string;
        components: ({
            name: string;
            type: string;
            pins: {
                pos: string;
                neg: string;
                a?: never;
                b?: never;
            };
            props: {
                voltage: string;
                resistance?: never;
            };
        } | {
            name: string;
            type: string;
            pins: {
                a: string;
                b: string;
                pos?: never;
                neg?: never;
            };
            props: {
                resistance: string;
                voltage?: never;
            };
        })[];
    };
    switch_open: {
        schemaVersion: number;
        sim: {
            mode: "dc";
        };
        groundNet: string;
        components: ({
            name: string;
            type: string;
            pins: {
                pos: string;
                neg: string;
                a?: never;
                b?: never;
            };
            props: {
                voltage: string;
                state?: never;
                resistance?: never;
            };
        } | {
            name: string;
            type: string;
            pins: {
                a: string;
                b: string;
                pos?: never;
                neg?: never;
            };
            props: {
                state: string;
                voltage?: never;
                resistance?: never;
            };
        } | {
            name: string;
            type: string;
            pins: {
                a: string;
                b: string;
                pos?: never;
                neg?: never;
            };
            props: {
                resistance: string;
                voltage?: never;
                state?: never;
            };
        })[];
    };
    switch_closed: {
        schemaVersion: number;
        sim: {
            mode: "dc";
        };
        groundNet: string;
        components: ({
            name: string;
            type: string;
            pins: {
                pos: string;
                neg: string;
                a?: never;
                b?: never;
            };
            props: {
                voltage: string;
                state?: never;
                resistance?: never;
            };
        } | {
            name: string;
            type: string;
            pins: {
                a: string;
                b: string;
                pos?: never;
                neg?: never;
            };
            props: {
                state: string;
                voltage?: never;
                resistance?: never;
            };
        } | {
            name: string;
            type: string;
            pins: {
                a: string;
                b: string;
                pos?: never;
                neg?: never;
            };
            props: {
                resistance: string;
                voltage?: never;
                state?: never;
            };
        })[];
    };
    short_circuit: {
        schemaVersion: number;
        sim: {
            mode: "dc";
        };
        groundNet: string;
        components: ({
            name: string;
            type: string;
            pins: {
                pos: string;
                neg: string;
                a?: never;
                b?: never;
            };
            props: {
                voltage: string;
                resistance?: never;
            };
        } | {
            name: string;
            type: string;
            pins: {
                a: string;
                b: string;
                pos?: never;
                neg?: never;
            };
            props: {
                resistance: string;
                voltage?: never;
            };
        })[];
    };
    floating_no_ground: {
        schemaVersion: number;
        sim: {
            mode: "dc";
        };
        groundNet: string;
        components: {
            name: string;
            type: string;
            pins: {
                a: string;
                b: string;
            };
            props: {
                resistance: string;
            };
        }[];
    };
};
//# sourceMappingURL=golden.d.ts.map