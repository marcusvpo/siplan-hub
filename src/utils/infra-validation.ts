import { ServerInfo, WorkstationInfo } from "@/types/ProjectV2";

export const extractGeneration = (processor: string): string => {
  if (!processor) return "";
  const lower = processor.toLowerCase();
  
  // Intel Core i3/i5/i7/i9 matches
  const intelMatch = lower.match(/i\d[- ](\d{1,2})\d{3}/);
  if (intelMatch) {
    const gen = parseInt(intelMatch[1]);
    return `${gen}ª Geração`;
  }
  
  // Direct gen matches: e.g. "8ª Geração", "8 gen", "10 generation"
  const directMatch = lower.match(/(\d{1,2})\s*(gen|generation|ª\s*geração|ª\s*gera|ª)/i);
  if (directMatch) {
    return `${directMatch[1]}ª Geração`;
  }
  
  // AMD Ryzen matches: e.g. Ryzen 5 3600 -> 3ª Geração
  if (lower.includes("ryzen")) {
    const ryzenMatch = lower.match(/ryzen\s+\d\s+(\d)\d{3}/);
    if (ryzenMatch) {
      return `${ryzenMatch[1]}ª Geração (Ryzen)`;
    }
  }
  return "";
};

export const checkWorkstationRequirements = (station: WorkstationInfo) => {
  const issues: string[] = [];

  // Check Processor & Gen
  if (station.processor) {
    const gen = station.generation || extractGeneration(station.processor);
    const genNum = parseInt(gen);
    const lowerProc = station.processor.toLowerCase();
    
    if (lowerProc.includes("celeron") || lowerProc.includes("atom") || lowerProc.includes("core 2")) {
      issues.push("Processador inadequado (Celeron/Atom/Core 2)");
    } else if (!isNaN(genNum) && genNum < 6 && (lowerProc.includes("core") || lowerProc.includes("i3") || lowerProc.includes("i5") || lowerProc.includes("i7"))) {
      issues.push("Processador abaixo da 6ª Geração");
    }
  }

  // Check RAM
  if (station.memory) {
    const ramMatch = station.memory.match(/(\d+)/);
    if (ramMatch) {
      const ram = parseInt(ramMatch[1]);
      const isFirma = station.sector && (
        station.sector.toLowerCase().includes("firma") || 
        station.sector.toLowerCase().includes("balc") ||
        station.sector.toLowerCase().includes("recep")
      );
      const minRam = isFirma ? 8 : 4;
      if (ram < minRam) {
        issues.push(`RAM baixa (${ram} GB). Mínimo de ${minRam} GB exigido para o setor.`);
      }
    }
  }

  // Check Disk space
  if (station.disk) {
    const freeMatch = station.disk.match(/Livre:\s*(\d+)/i);
    if (freeMatch) {
      const free = parseInt(freeMatch[1]);
      if (free < 10) {
        issues.push(`Espaço livre insuficiente (${free} GB). Mínimo 10 GB.`);
      }
    } else {
      const sizeMatch = station.disk.match(/(\d+)/);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[1]);
        if (size < 10) {
          issues.push(`Espaço de disco insuficiente (${size} GB).`);
        }
      }
    }
  }

  // Check OS
  if (station.os) {
    const lowerOs = station.os.toLowerCase();
    if (lowerOs.includes("windows 7") || lowerOs.includes("windows 8") || lowerOs.includes("windows xp") || lowerOs.includes("win7") || lowerOs.includes("win8")) {
      issues.push("Sistema Operacional descontinuado (Windows 7/8/XP)");
    }
  }

  return {
    meets: issues.length === 0,
    issues,
  };
};

export const checkServerRequirements = (server: ServerInfo, workstationsCount: number) => {
  const issues: string[] = [];
  const count = workstationsCount || 0;

  // CPU cores check
  if (server.processor) {
    const coresMatch = server.processor.match(/(\d+)\s*(nucleo|núcleo|core|thread|cpu)/i);
    if (coresMatch) {
      const cores = parseInt(coresMatch[1]);
      const minCores = count > 15 ? 8 : 6;
      if (cores < minCores) {
        issues.push(`Processador com ${cores} núcleos. Mínimo recomendado de ${minCores} núcleos para ${count} estações.`);
      }
    }
  }

  // RAM check
  if (server.memory) {
    const ramMatch = server.memory.match(/(\d+)/);
    if (ramMatch) {
      const ram = parseInt(ramMatch[1]);
      let minRam = 20;
      if (count <= 5) minRam = 20;
      else if (count <= 10) minRam = 24;
      else minRam = 48; // > 10 stations requires 48GB as per spreadsheet rules

      if (ram < minRam) {
        issues.push(`Memória RAM baixa (${ram} GB). Mínimo de ${minRam} GB recomendado para ${count} estações.`);
      }
    }
  }

  // OS check
  if (server.os) {
    const lowerOs = server.os.toLowerCase();
    if (lowerOs.includes("windows server 2012") || lowerOs.includes("windows server 2008") || lowerOs.includes("windows server 2016") || lowerOs.includes("2012 r2")) {
      issues.push("Sistema Operacional do servidor desatualizado ou não recomendado (requer Server 2019/2022 ou Linux)");
    }
  }

  return {
    meets: issues.length === 0,
    issues,
  };
};

export const parseMachineInfo = (text: string) => {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const info: Record<string, string[]> = {};
  let currentSection = "";

  for (const line of lines) {
    if (line.startsWith("===")) continue;
    if (line.startsWith("[")) {
      currentSection = line.replace("[", "").replace("]", "").trim();
      info[currentSection] = [];
    } else if (currentSection && line) {
      info[currentSection].push(line);
    }
  }

  const hostname = info["HOSTNAME"]?.[0] || "";
  const processor = info["PROCESSADOR"]?.[0] || "";
  const memory = info["MEMORIA RAM"]?.[0] || "";
  
  const diskLines = info["DISCO"] || [];
  const disk = diskLines.join(" | ");

  const networkLines = info["REDE"] || [];
  const network = networkLines.join(" | ");

  const os = info["WINDOWS"]?.[0] || "";

  // Setor e Usuários
  const sector = info["SETOR"]?.[0] || "";
  const userRaw = info["USUARIOS"]?.[0] || "";
  
  let user = "";
  if (userRaw) {
    if (userRaw.includes("Atual:")) {
      const match = userRaw.match(/Atual:\s*([^|]+)/);
      if (match) {
        user = match[1].trim();
        if (user.includes("\\")) {
          user = user.split("\\").pop() || user;
        }
      }
    } else {
      user = userRaw;
    }
  }

  const generation = extractGeneration(processor);

  // Campos extras de servidor
  const brandModel = info["MARCA/MODELO"]?.[0] || info["MARCA MODELO"]?.[0] || "";
  const virtualized = info["VIRTUALIZADO?"]?.[0] || info["VIRTUALIZADO"]?.[0] || "";
  const antivirus = info["ANTI-VIRUS"]?.[0] || info["ANTIVIRUS"]?.[0] || info["ANTI-VÍRUS"]?.[0] || "";
  const backup = info["BACKUP"]?.[0] || "";
  const spaceOrion = info["ESPACO ORION"]?.[0] || info["ESPAÇO PARA O ORION"]?.[0] || "";

  return {
    hostname,
    processor,
    generation,
    memory,
    disk,
    network,
    os,
    sector,
    user,
    brandModel,
    virtualized,
    antivirus,
    backup,
    spaceOrion,
  };
};

export const parseExcelPastedText = (text: string): WorkstationInfo[] => {
  const lines = text.split(/\r?\n/);
  const stations: WorkstationInfo[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split("\t").map(c => c.trim());
    if (cols.length < 2) continue;
    
    if (cols[0].toLowerCase() === "item" || cols[1].toLowerCase() === "hostname") {
      continue;
    }

    const hostname = cols[1];
    const sector = cols[2] || "";
    const user = cols[3] || "";
    const processor = cols[4] || "";
    const generation = cols[5] || extractGeneration(processor);
    const memory = cols[6] || "";
    const disk = cols[7] || "";
    const network = cols[8] || "";
    const os = cols[9] || "";
    const antivirus = cols[10] || "";
    const meetsReqs = cols[11];

    let meetsRequirements: "Sim" | "Não" | undefined;
    if (meetsReqs) {
      meetsRequirements = (meetsReqs.toLowerCase() === "sim" || meetsReqs.toLowerCase() === "s") ? "Sim" : "Não";
    }

    stations.push({
      hostname,
      sector,
      user,
      processor,
      generation,
      memory,
      disk,
      network,
      os,
      antivirus,
      meetsRequirements
    });
  }

  return stations;
};
