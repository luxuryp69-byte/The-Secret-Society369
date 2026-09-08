import { describe, expect, it } from "vitest";
import { ceoAgent } from "../lib/agents/ceo";

type Scenario = {
  name: string;
  message: string;
  expectedConstraint:
    | "demand"
    | "retention"
    | "product"
    | "capital"
    | "execution"
    | "unknown";
};

const scenarios: Scenario[] = [
  {
    name: "Demand — empty pipeline, low churn",
    message:
      "Tenemos un pipeline casi vacío, el churn está en 3% y el producto es estable. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedConstraint: "demand",
  },
  {
    name: "Retention — high churn",
    message:
      "Tenemos un pipeline comercial saludable y el producto es estable, pero el churn subió al 12% y estamos perdiendo clientes de forma preocupante. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedConstraint: "retention",
  },
  {
    name: "Product — product quality problems",
    message:
      "Tenemos un pipeline comercial saludable y el churn está en 3%, pero el producto presenta problemas importantes de estabilidad, calidad y experiencia de usuario. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedConstraint: "product",
  },
  {
    name: "Capital — short runway",
    message:
      "Tenemos un pipeline comercial saludable, el churn está en 3%, el producto es estable, pero solo tenemos 4 meses de runway. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedConstraint: "capital",
  },
  {
    name: "Execution — team capacity",
    message:
      "Tenemos un pipeline comercial saludable, el churn está en 3% y el producto es estable, pero el equipo está sobrecargado y no tiene capacidad para ejecutar las prioridades actuales. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedConstraint: "execution",
  },
  {
    name: "Unknown — insufficient evidence",
    message:
      "La empresa está funcionando normalmente y queremos saber qué debería priorizar el CEO durante los próximos 30 días.",
    expectedConstraint: "unknown",
  },
];

describe("Founder Brain — strategic signals", () => {
  for (const scenario of scenarios) {
    it(scenario.name, async () => {
      const response = await ceoAgent(scenario.message, {
        memory: {},
      });

      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(50);

      const normalized = response
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      switch (scenario.expectedConstraint) {
        case "demand":
          expect(normalized).toContain("demand and acquisition");
          break;

        case "retention":
          expect(normalized).toContain("retencion");
          break;

        case "product":
          expect(normalized).toContain("calidad del producto");
          break;

        case "capital":
          expect(normalized).toContain("capital");
          break;

        case "execution":
          expect(normalized).toContain("execution");
          break;

        case "unknown":
          expect(normalized).toContain("unknown");
          break;
      }
    }, 10_000);
  }
});
