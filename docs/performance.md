# Performance and Limits

Target usage:
- 10 to 200 components in browser or Node environments.

Current implementation:
- Dense matrix solver with partial pivoting.
- Performance scales roughly with O(n^3) for the number of unknowns.

Benchmarking:
- Run `npm run bench` to benchmark series resistor circuits of size 10, 50, 100, 200.
- Benchmarks are informational and not part of automated tests.

Notes:
- For larger circuits, a sparse solver may be required in a future version.
