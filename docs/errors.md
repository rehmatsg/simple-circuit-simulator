# Error and Warning Codes

Errors:
- `duplicate_component_name`
- `invalid_component_name`
- `invalid_component_type`
- `invalid_components`
- `invalid_net`
- `invalid_pin`
- `invalid_property_value`
- `invalid_schema_version`
- `invalid_sim_mode`
- `missing_ground`
- `missing_pin`
- `missing_pins`
- `missing_property`
- `missing_registry`
- `nonlinear_convergence_failure`
- `unknown_component_type`
- `invalid_value`
- `invalid_numeric_literal`
- `invalid_parameter_reference`
- `unknown_parameter`
- `unit_mismatch`
- `unknown_unit`
- `floating_reference`
- `singular_matrix`
- `duplicate_wire_id`
- `duplicate_junction_id`
- `invalid_wire`
- `invalid_junction`
- `invalid_wire_endpoint`
- `wire_net_mismatch`
- `wire_graph_disconnected`
- `wire_currents_requires_ok`
- `wire_missing_pin_current`

Warnings:
- `short_circuit_suspected`
- `wire_layout_missing`

Notes:
- Errors and warnings are returned as structured diagnostics with optional `component` and `net` fields.
- Diagnostics are sorted deterministically by code, component, net, and message.
- `details` may include additional context such as thresholds or valid pin names.
