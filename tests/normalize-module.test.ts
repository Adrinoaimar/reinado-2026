import { describe, expect, it } from "vitest";
import { normalizeModuleReferences } from "../apps/votacion/lib/normalize-module";

describe("normalizeModuleReferences", () => {
  it.each([
    ["Cosmetología - Módulo 1", "Cosmetología - I"],
    ["Cosmetología - 1er módulo", "Cosmetología - I"],
    ["Estudiante de Cosmetología, primer módulo.", "Estudiante de Cosmetología, I."],
    ["Estudiante del tercer módulo", "Estudiante del III"],
    ["MÓDULO número 4", "IV"],
    ["módulo siete", "VII"],
    ["Módulo IX", "IX"]
  ])("normaliza %s", (input, expected) => {
    expect(normalizeModuleReferences(input)).toBe(expected);
  });

  it("elimina la palabra incluso sin número reconocible", () => {
    expect(normalizeModuleReferences("Módulo profesional")).toBe("profesional");
  });
});
