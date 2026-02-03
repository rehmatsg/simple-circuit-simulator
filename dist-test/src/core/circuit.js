export class Circuit {
    components = new Map();
    schemaVersion;
    sim;
    groundNet;
    title;
    params;
    meta;
    constructor(document) {
        this.schemaVersion = document.schemaVersion;
        this.sim = { mode: document.sim.mode };
        this.groundNet = document.groundNet;
        if (document.title !== undefined) {
            this.title = document.title;
        }
        if (document.params !== undefined) {
            this.params = document.params;
        }
        if (document.meta !== undefined) {
            this.meta = document.meta;
        }
        for (const component of document.components) {
            this.components.set(component.name, cloneComponent(component));
        }
    }
    static create(init) {
        const document = {
            schemaVersion: init.schemaVersion,
            sim: { mode: init.mode },
            groundNet: init.groundNet,
            components: [],
        };
        if (init.title !== undefined) {
            document.title = init.title;
        }
        if (init.params !== undefined) {
            document.params = init.params;
        }
        if (init.meta !== undefined) {
            document.meta = init.meta;
        }
        return new Circuit(document);
    }
    listComponents() {
        return Array.from(this.components.values()).map(cloneComponent);
    }
    getComponent(name) {
        const component = this.components.get(name);
        return component ? cloneComponent(component) : undefined;
    }
    addComponent(component) {
        if (this.components.has(component.name)) {
            throw new Error(`Component "${component.name}" already exists.`);
        }
        this.components.set(component.name, cloneComponent(component));
    }
    removeComponent(name) {
        return this.components.delete(name);
    }
    updateComponentProps(name, props) {
        const component = this.components.get(name);
        if (!component) {
            throw new Error(`Component "${name}" does not exist.`);
        }
        component.props = { ...props };
    }
    updateComponentPins(name, pins) {
        const component = this.components.get(name);
        if (!component) {
            throw new Error(`Component "${name}" does not exist.`);
        }
        component.pins = { ...pins };
    }
    toJSON() {
        const components = Array.from(this.components.values())
            .map(cloneComponent)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((component) => ({
            name: component.name,
            type: component.type,
            pins: sortRecord(component.pins),
            ...(component.props ? { props: sortRecord(component.props) } : {}),
            ...(component.model ? { model: component.model } : {}),
        }));
        const document = {
            schemaVersion: this.schemaVersion,
            sim: { mode: this.sim.mode },
            groundNet: this.groundNet,
            components,
        };
        if (this.title) {
            document.title = this.title;
        }
        if (this.params) {
            document.params = sortRecord(this.params);
        }
        if (this.meta) {
            document.meta = sortRecord(this.meta);
        }
        return document;
    }
}
function cloneComponent(component) {
    return {
        name: component.name,
        type: component.type,
        pins: { ...component.pins },
        ...(component.props ? { props: { ...component.props } } : {}),
        ...(component.model ? { model: component.model } : {}),
    };
}
function sortRecord(record) {
    const entries = Object.entries(record).sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries);
}
//# sourceMappingURL=circuit.js.map