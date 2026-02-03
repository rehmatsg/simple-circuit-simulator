export class ComponentRegistry {
    definitions = new Map();
    register(definition) {
        if (this.definitions.has(definition.type)) {
            throw new Error(`Component type "${definition.type}" is already registered.`);
        }
        this.definitions.set(definition.type, definition);
    }
    has(type) {
        return this.definitions.has(type);
    }
    get(type) {
        return this.definitions.get(type);
    }
    list() {
        return Array.from(this.definitions.values());
    }
}
//# sourceMappingURL=registry.js.map