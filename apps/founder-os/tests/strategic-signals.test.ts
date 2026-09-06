import { describe, expect, it } from "vitest";

const API_URL = "http://127.0.0.1:3000/api/chat";

type Scenario = {
  name: string;
  message: string;
  expectedPriority: string;
};

const scenarios: Scenario[] = [
  {
    name: "Demand — empty pipeline, low churn",
    message:
      "Tenemos un pipeline casi vacío, el churn está en 3% y el producto es estable. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedPriority: "Demand and Acquisition",
  },
  {
    name: "Retention — high churn",
    message:
      "Tenemos un pipeline comercial saludable y el producto es estable, pero el churn subió al 12% y estamos perdiendo clientes de forma preocupante. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedPriority: "retención",
  },
  {
    name: "Product — product quality problems",
    message:
      "Tenemos un pipeline comercial saludable y el churn está en 3%, pero el producto presenta problemas importantes de estabilidad, calidad y experiencia de usuario. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedPriority: "Mejorar la calidad del producto",
  },
  {
    name: "Capital — short runway",
    message:
      "Tenemos un pipeline comercial saludable, el churn está en 3%, el producto es estable, pero solo tenemos 4 meses de runway. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedPriority: "capital",
  },
  {
    name: "Execution — team capacity",
    message:
      "Tenemos un pipeline comercial saludable, el churn está en 3% y el producto es estable, pero el equipo está sobrecargado y no tiene capacidad para ejecutar las prioridades actuales. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedPriority: "execution",
  },
  {
    name: "Unknown — insufficient evidence",
    message:
      "La empresa está funcionando normalmente y queremos saber qué debería priorizar el CEO durante los próximos 30 días.",
    expectedPriority: "unknown",
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

describe("Founder Brain — strategic signals", () => {
  for (const scenario of scenarios) {
    it(
      scenario.name,
      async () => {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: scenario.message,
          }),
        });

        expect(response.ok).toBe(true);

        const body = await response.json();

        expect(body.success).toBe(true);
        expect(typeof body.response).toBe("string");
        expect(body.response.length).toBeGreaterThan(50);

        const responseText = normalize(body.response);
        const expected = normalize(scenario.expectedPriority);

        expect(responseText).toContain(expected);
      },
      120_000,
    );
  }
});
