import { createDefaultRegistry, solveDC, Circuit } from "../dist/index.js";

function buildSeriesCircuit(count) {
  const circuit = Circuit.create({ schemaVersion: 1, mode: "dc", groundNet: "GND" });
  circuit.addComponent({
    name: "B1",
    type: "battery",
    pins: { pos: "VCC", neg: "GND" },
    props: { voltage: 10 },
  });

  let prevNet = "VCC";
  for (let i = 1; i <= count; i += 1) {
    const net = i === count ? "GND" : `N${i}`;
    circuit.addComponent({
      name: `R${i}`,
      type: "resistor",
      pins: { a: prevNet, b: net },
      props: { resistance: 10 },
    });
    prevNet = net;
  }

  return circuit;
}

const registry = createDefaultRegistry();
const sizes = [10, 50, 100, 200];

for (const size of sizes) {
  const circuit = buildSeriesCircuit(size);
  const start = performance.now();
  const result = solveDC(circuit, { registry });
  const end = performance.now();
  if (result.status !== "ok") {
    console.error(`Solve failed for size ${size}`, result.errors);
    process.exitCode = 1;
  } else {
    console.log(`Series ${size} -> ${(end - start).toFixed(3)} ms`);
  }
}
