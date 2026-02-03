# Value Expressions and Units

Accepted formats:
- number: `1000`
- engineering string: `"1k"`, `"2.2u"`, `"9V"`, `"10ohm"`
- parameter reference: `"$R_BULB"`

Engineering prefixes:
- `p` 1e-12
- `n` 1e-9
- `u` 1e-6
- `m` 1e-3
- `k` 1e3
- `M` 1e6
- `G` 1e9

Units (v1):
- volts: `V`, `volt`, `volts`
- amps: `A`, `amp`, `amps`, `ampere`, `amperes`
- ohms: `ohm`, `ohms`

Rules:
- Units are optional but recommended.
- Unit validation is enforced per property definition.
- Unknown units or non-numeric strings produce `invalid_value` errors.
- Parameter references resolve through `params` in the circuit document.
