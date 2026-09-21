import { describe, it, expect } from "vitest";
import {
  MAIN_SYSTEMS,
  SYSTEM_SPECIALTY_MAP,
  SPECIALTY_OPTIONS,
  getSpecialtyForSystem,
  normalizeSpecialty,
} from "../utils/projectSpecialty";

describe("projectSpecialty utils", () => {
  describe("MAIN_SYSTEMS", () => {
    it("deve conter os sistemas principais esperados incluindo WEBRI", () => {
      expect(MAIN_SYSTEMS).toContain("Orion TN");
      expect(MAIN_SYSTEMS).toContain("Orion PRO");
      expect(MAIN_SYSTEMS).toContain("Orion REG");
      expect(MAIN_SYSTEMS).toContain("WEBRI");
      expect(MAIN_SYSTEMS).toContain("Modelos TN");
    });
  });

  describe("getSpecialtyForSystem", () => {
    it("deve mapear Orion TN para Notas", () => {
      expect(getSpecialtyForSystem("Orion TN")).toBe("Notas");
    });

    it("deve mapear Orion PRO para Protesto", () => {
      expect(getSpecialtyForSystem("Orion PRO")).toBe("Protesto");
    });

    it("deve mapear Orion REG para TDPJ", () => {
      expect(getSpecialtyForSystem("Orion REG")).toBe("TDPJ");
      expect(getSpecialtyForSystem("Orion Reg TDPJ")).toBe("TDPJ");
    });

    it("deve mapear WEBRI para Registro de Imóveis", () => {
      expect(getSpecialtyForSystem("WEBRI")).toBe("Registro de Imóveis");
      expect(getSpecialtyForSystem("WebRI")).toBe("Registro de Imóveis");
      expect(getSpecialtyForSystem("WEB RI")).toBe("Registro de Imóveis");
    });

    it("deve retornar undefined para sistemas sem mapeamento ou vazios", () => {
      expect(getSpecialtyForSystem("Modelos TN")).toBeUndefined();
      expect(getSpecialtyForSystem("")).toBeUndefined();
      expect(getSpecialtyForSystem(null)).toBeUndefined();
      expect(getSpecialtyForSystem(undefined)).toBeUndefined();
    });
  });

  describe("normalizeSpecialty", () => {
    it("deve normalizar valores legados em minúsculo e com underline", () => {
      expect(normalizeSpecialty("notas")).toBe("Notas");
      expect(normalizeSpecialty("protesto")).toBe("Protesto");
      expect(normalizeSpecialty("tdpj")).toBe("TDPJ");
      expect(normalizeSpecialty("registro_imoveis")).toBe("Registro de Imóveis");
      expect(normalizeSpecialty("registro_civil")).toBe("Registro Civil");
    });

    it("deve preservar valores já formatados", () => {
      expect(normalizeSpecialty("Notas")).toBe("Notas");
      expect(normalizeSpecialty("Protesto")).toBe("Protesto");
      expect(normalizeSpecialty("TDPJ")).toBe("TDPJ");
      expect(normalizeSpecialty("Registro de Imóveis")).toBe("Registro de Imóveis");
      expect(normalizeSpecialty("Registro Civil")).toBe("Registro Civil");
    });

    it("deve retornar string vazia para valores nulos ou vazios", () => {
      expect(normalizeSpecialty("")).toBe("");
      expect(normalizeSpecialty(null)).toBe("");
      expect(normalizeSpecialty(undefined)).toBe("");
    });
  });

  describe("SPECIALTY_OPTIONS", () => {
    it("deve listar as 5 especialidades padronizadas", () => {
      expect(SPECIALTY_OPTIONS).toEqual([
        "Notas",
        "Protesto",
        "TDPJ",
        "Registro de Imóveis",
        "Registro Civil",
      ]);
    });
  });
});
