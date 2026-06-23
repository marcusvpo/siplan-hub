import { describe, it, expect } from "vitest";
import { parseMachineInfo, checkServerRequirements } from "../utils/infra-validation";

describe("Infra Validation CPU Cores Tests", () => {
  it("should extract cores count from Windows/Linux processor strings", () => {
    const info1 = parseMachineInfo(`
=================== INFORMACOES DA MAQUINA ===================
[HOSTNAME]
ubuntu-conv
[PROCESSADOR]
Intel(R) Core(TM) i5-9500 CPU @ 3.00GHz (6 cpus)
==============================================================
    `);
    expect(info1.cores).toBe("6");

    const info2 = parseMachineInfo(`
=================== INFORMACOES DA MAQUINA ===================
[HOSTNAME]
server-xen
[PROCESSADOR]
Intel(R) Xeon(R) CPU E5-2620 v3 @ 2.40GHz (12 cpus)
==============================================================
    `);
    expect(info2.cores).toBe("12");

    const info3 = parseMachineInfo(`
=================== INFORMACOES DA MAQUINA ===================
[HOSTNAME]
win-server
[PROCESSADOR]
Intel(R) Core(TM) i5-9500 CPU @ 3.00GHz
==============================================================
    `);
    expect(info3.cores).toBe("");
  });

  it("should validate server CPU core requirements correctly", () => {
    // 5 workstations, server has 6 cores -> OK
    const res1 = checkServerRequirements({ cores: "6", processor: "Intel(R) Core(TM) i5-9500 CPU @ 3.00GHz (6 cpus)" }, 5);
    expect(res1.meets).toBe(true);

    // 5 workstations, server has 4 cores -> Fails (needs at least 6 cores)
    const res2 = checkServerRequirements({ cores: "4", processor: "Intel(R) Core(TM) i5-9500 CPU @ 3.00GHz (4 cpus)" }, 5);
    expect(res2.meets).toBe(false);
    expect(res2.issues[0]).toContain("Processador com 4 núcleos. Mínimo recomendado de 6 núcleos");

    // 5 workstations, server has processor with model number but cores not specified -> Ignored Model number >= 256
    const res3 = checkServerRequirements({ processor: "Intel(R) Core(TM) i5-9500 CPU @ 3.00GHz" }, 5);
    expect(res3.meets).toBe(true); // Should not report low core count error since it cannot extract a valid small core number
  });
});
