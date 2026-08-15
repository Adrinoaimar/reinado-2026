import { describe, expect, it } from "vitest";
import { normalizeModuleReferences } from "../apps/votacion/lib/normalize-module";

describe("normalizeModuleReferences", () => {
  it.each([
    ["Cosmetología - Módulo 1", "Cosmetología - Módulo I"],
    ["Cosmetología - 1er módulo", "Cosmetología - módulo I"],
    ["Estudiante de Cosmetología, primer módulo.", "Estudiante de Cosmetología, módulo I."],
    ["Estudiante del tercer módulo", "Estudiante del módulo III"],
    ["MÓDULO número 4", "MÓDULO IV"],
    ["módulo siete", "módulo VII"],
    ["Módulo IX", "Módulo IX"]
  ])("normaliza %s", (input, expected) => {
    expect(normalizeModuleReferences(input)).toBe(expected);
  });

  it("no cambia referencias sin número reconocible", () => {
    expect(normalizeModuleReferences("Módulo profesional")).toBe("Módulo profesional");
  });
});
