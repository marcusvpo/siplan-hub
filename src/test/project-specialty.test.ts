import { describe, it, expect } from "vitest";
import {
  MAIN_SYSTEMS,
  SYSTEM_SPECIALTY_MAP,
  SPECIALTY_OPTIONS,
  getSpecialtyForSystem,
  normalizeSpecialty,
  normalizeSystemType,
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

  describe("normalizeSystemType", () => {
    it("deve normalizar variações de Orion REG para o nome canônico 'Orion REG'", () => {
      expect(normalizeSystemType("Orion REG (TDPJ)")).toBe("Orion REG");
      expect(normalizeSystemType("OrionREG (TDPJ)")).toBe("Orion REG");
      expect(normalizeSystemType("Orion Reg TDPJ")).toBe("Orion REG");
      expect(normalizeSystemType("Orion Reg (TDPJ)")).toBe("Orion REG");
      expect(normalizeSystemType("Orion REG TDPJ")).toBe("Orion REG");
      expect(normalizeSystemType("OrionREG")).toBe("Orion REG");
      expect(normalizeSystemType("Orion Reg")).toBe("Orion REG");
      expect(normalizeSystemType("Licenciamento do Software Orion Registro TDPJ")).toBe("Orion REG");
      expect(normalizeSystemType("Orion REG")).toBe("Orion REG");
    });

    it("não deve colidir Orion GED com Orion REG", () => {
      expect(normalizeSystemType("Orion GED")).toBe("Orion GED");
    });

    it("deve normalizar variações de Orion TN", () => {
      expect(normalizeSystemType("OrionTN")).toBe("Orion TN");
      expect(normalizeSystemType("Orion - TN")).toBe("Orion TN");
      expect(normalizeSystemType("Orion TN")).toBe("Orion TN");
    });

    it("deve normalizar variações de Orion PRO", () => {
      expect(normalizeSystemType("OrionPRO")).toBe("Orion PRO");
      expect(normalizeSystemType("Orion - PRO")).toBe("Orion PRO");
      expect(normalizeSystemType("Orion PRO")).toBe("Orion PRO");
    });

    it("deve normalizar variações de Modelos TN", () => {
      expect(normalizeSystemType("ModelosTN")).toBe("Modelos TN");
      expect(normalizeSystemType("Modelos TN")).toBe("Modelos TN");
    });

    it("deve normalizar variações de WebRI", () => {
      expect(normalizeSystemType("WEBRI")).toBe("WebRI");
      expect(normalizeSystemType("WEB RI")).toBe("WebRI");
      expect(normalizeSystemType("WebRI")).toBe("WebRI");
    });

    it("deve retornar vazio se nulo ou indefinido", () => {
      expect(normalizeSystemType("")).toBe("");
      expect(normalizeSystemType(null)).toBe("");
      expect(normalizeSystemType(undefined)).toBe("");
    });
  });

  describe("getSpecialtyForSystem", () => {
    it("deve mapear Orion TN para Notas", () => {
      expect(getSpecialtyForSystem("Orion TN")).toBe("Notas");
      expect(getSpecialtyForSystem("OrionTN")).toBe("Notas");
    });

    it("deve mapear Orion PRO para Protesto", () => {
      expect(getSpecialtyForSystem("Orion PRO")).toBe("Protesto");
      expect(getSpecialtyForSystem("OrionPRO")).toBe("Protesto");
    });

    it("deve mapear Orion REG e variações para TDPJ", () => {
      expect(getSpecialtyForSystem("Orion REG")).toBe("TDPJ");
      expect(getSpecialtyForSystem("Orion Reg TDPJ")).toBe("TDPJ");
      expect(getSpecialtyForSystem("Orion REG (TDPJ)")).toBe("TDPJ");
      expect(getSpecialtyForSystem("OrionREG (TDPJ)")).toBe("TDPJ");
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
