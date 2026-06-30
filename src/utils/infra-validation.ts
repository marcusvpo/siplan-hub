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
  let cores: number | null = null;
  if (server.cores) {
    const cMatch = server.cores.toString().match(/(\d+)/);
    if (cMatch) {
      cores = parseInt(cMatch[1]);
    }
  }
  if (cores === null && server.processor) {
    const coresMatch = server.processor.match(/(\d+)\s*(?:cores|cpus|núcleos|nucleos|threads)/i) || 
                       server.processor.match(/\((\d+)\s*(?:cpu)/i);
    if (coresMatch) {
      cores = parseInt(coresMatch[1]);
    } else {
      const fallbackMatch = server.processor.match(/(\d+)\s*(nucleo|núcleo|core|thread|cpu)/i);
      if (fallbackMatch) {
        const val = parseInt(fallbackMatch[1]);
        if (val < 256) {
          cores = val;
        }
      }
    }
  }

  if (cores !== null) {
    const minCores = count > 15 ? 8 : 6;
    if (cores < minCores) {
      issues.push(`Processador com ${cores} núcleos. Mínimo recomendado de ${minCores} núcleos para ${count} estações.`);
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

  const os = info["SO"]?.[0] || info["SISTEMA OPERACIONAL"]?.[0] || info["WINDOWS"]?.[0] || "";

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
  let virtualized = info["VIRTUALIZADO"]?.[0] || info["VIRTUALIZADO?"]?.[0] || "";
  if (virtualized) {
    const vLower = virtualized.trim().toLowerCase();
    if (vLower.startsWith("sim")) {
      virtualized = "Sim";
    } else if (vLower.startsWith("nao") || vLower.includes("n?o") || vLower.startsWith("não")) {
      virtualized = "Não";
    }
  }
  const antivirus = info["ANTI-VIRUS"]?.[0] || info["ANTIVIRUS"]?.[0] || info["ANTI-VÍRUS"]?.[0] || "";
  const backup = info["BACKUP"]?.[0] || "";
  const spaceOrion = info["ESPACO ORION"]?.[0] || info["ESPAÇO PARA O ORION"]?.[0] || info["ESPACO PARA O ORION"]?.[0] || "";

  let cores = "";
  if (processor) {
    const coresMatch = processor.match(/(\d+)\s*(?:cores|cpus|núcleos|nucleos|threads)/i) || 
                       processor.match(/\((\d+)\s*(?:cpu)/i);
    if (coresMatch) {
      cores = coresMatch[1];
    } else {
      const fallbackMatch = processor.match(/(\d+)\s*(nucleo|núcleo|core|thread|cpu)/i);
      if (fallbackMatch) {
        const val = parseInt(fallbackMatch[1]);
        if (val < 256) {
          cores = val.toString();
        }
      }
    }
  }

  let environment = info["AMBIENTE"]?.[0] || "";
  if (environment) {
    const envLower = environment.toLowerCase().trim();
    if (envLower.startsWith("loc")) environment = "Local";
    else if (envLower.startsWith("nuv") || envLower.includes("cloud")) environment = "Nuvem";
  } else {
    environment = "Local";
  }

  let networkFailover = info["REDE FAILOVER"]?.[0] || "";
  if (networkFailover) {
    const netLower = networkFailover.toLowerCase().trim();
    if (netLower.startsWith("s") || netLower === "yes" || netLower === "y") networkFailover = "Sim";
    else if (netLower.startsWith("n")) networkFailover = "Não";
  } else {
    networkFailover = "Não";
  }

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
    cores,
    environment,
    networkFailover,
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

export const formatDiskFreeSpace = (diskStr: string): string => {
  if (!diskStr) return "-";
  
  // If the diskStr has '|', split and process each partition
  if (diskStr.includes("|")) {
    const parts = diskStr.split("|").map(p => p.trim());
    const formattedParts: string[] = [];

    for (const part of parts) {
      if (!part) continue;

      let mount = "";
      let free = "";

      // Match patterns like "C: Total: 238 GB Livre: 150 GB" or "/ Total: 53G Livre: 35G"
      const pattern1 = part.match(/^([^:]+):?\s*Total:.*?(?:Livre|Free):\s*([\d.,]+\s*[A-Z]*B?)/i);
      const pattern2 = part.match(/^([^:]+):?\s*(?:Livre|Free):\s*([\d.,]+\s*[A-Z]*B?)/i);
      
      if (pattern1) {
        mount = pattern1[1].trim();
        free = pattern1[2].trim();
      } else if (pattern2) {
        mount = pattern2[1].trim();
        free = pattern2[2].trim();
      } else {
        // Fallback: search for any "Livre: X" in this part
        const searchFree = part.match(/(?:Livre|Free):\s*([\d.,]+\s*[A-Z]*B?)/i);
        if (searchFree) {
          free = searchFree[1].trim();
          const mountMatch = part.match(/^([^:\s]+:?)/);
          if (mountMatch) {
            mount = mountMatch[1].replace(":", "").trim();
          }
        }
      }

      if (!free) {
        const totalMatch = part.match(/Total:\s*([\d.,]+\s*[A-Z]*B?)/i);
        if (totalMatch) {
          free = totalMatch[1].trim();
        } else if (part.length < 20) {
          free = part;
        }
      }

      if (free) {
        // Skip Linux system filesystems (e.g. /sys/, loop, etc.)
        if (mount) {
          const mLower = mount.toLowerCase();
          if (
            mLower.includes("/sys/") || 
            mLower.includes("loop") || 
            mLower.includes("tmpfs") || 
            mLower.includes("devtmpfs") || 
            mLower.includes("overlay") || 
            mLower.includes("udev") || 
            mLower.includes("shm") || 
            mLower.includes("/run") ||
            mLower.includes("efivars")
          ) {
            continue;
          }
        }

        // Skip tiny KB/MB partitions unless they are the only ones
        const freeLower = free.toLowerCase();
        if (freeLower.endsWith("k") || freeLower.endsWith("kb") || freeLower.endsWith("m") || freeLower.endsWith("mb")) {
          continue;
        }

        const formattedLabel = mount ? `${mount}: ${free} livre` : `${free} livre`;
        formattedParts.push(formattedLabel);
      }
    }

    if (formattedParts.length > 0) {
      return formattedParts.join(", ");
    }
    
    // Fallback: if all were filtered out, just format the first part
    const firstPart = parts[0];
    const freeMatch = firstPart.match(/(?:Livre|Free):\s*([\d.,]+\s*[A-Z]*B?)/i);
    const mountMatch = firstPart.match(/^([^:\s]+:?)/);
    const mount = mountMatch ? mountMatch[1].trim() : "";
    const free = freeMatch ? freeMatch[1].trim() : firstPart;
    return mount ? `${mount} ${free} livre` : `${free} livre`;
  }

  // If there's no '|', process it as a single string
  const freeMatch = diskStr.match(/(?:Livre|Free):\s*([\d.,]+\s*[A-Z]*B?)/i);
  if (freeMatch) {
    const space = freeMatch[1].trim();
    return `${space} livre`;
  }

  const rawSizeMatch = diskStr.match(/^([\d.,]+\s*[A-Z]*B?)$/i);
  if (rawSizeMatch) {
    return `${rawSizeMatch[1].trim()} livre`;
  }

  const totalMatch = diskStr.match(/Total:\s*([\d.,]+\s*[A-Z]*B?)/i);
  if (totalMatch) {
    return `${totalMatch[1].trim()}`;
  }

  return diskStr.length > 25 ? diskStr.substring(0, 22) + "..." : diskStr;
};

export const formatNetworkSpeed = (netStr: string): string => {
  if (!netStr) return "-";
  
  // Clean up virtual/local/docker interfaces to avoid extremely long lines
  const parts = netStr.split(/[\s,|]+/).map(p => p.trim()).filter(Boolean);
  
  // Filter out loopback, docker, virtual interfaces, veth container links, etc.
  let filteredParts = parts.filter(p => {
    const lower = p.toLowerCase();
    return !(
      lower === "lo" ||
      lower.includes("docker") ||
      lower.includes("veth") ||
      lower.includes("br-") ||
      lower.includes("virbr") ||
      lower.includes("vbox") ||
      lower.includes("tap") ||
      lower.includes("dummy") ||
      lower.includes("loopback") ||
      lower.includes("npcap")
    );
  });

  // If we filtered out everything, fallback to the original parts
  if (filteredParts.length === 0) {
    filteredParts = parts;
  }

  // Join back the cleaned list
  const cleanedNetStr = filteredParts.join(" ");
  const lower = cleanedNetStr.toLowerCase();
  
  // 1. Detect explicit speeds
  if (lower.includes("10000 mbps") || lower.includes("10 gbps") || lower.includes("10gbps")) {
    return `10 Gbps - ${cleanedNetStr}`;
  }
  if (lower.includes("1000 mbps") || lower.includes("1000mbps") || lower.includes("1 gbps") || lower.includes("1gbps") || lower.includes("gigabit") || lower.includes("gbe")) {
    return `1000 Mbps - ${cleanedNetStr}`;
  }
  if (lower.includes("100 mbps") || lower.includes("100mbps") || lower.includes("fast ethernet")) {
    return `100 Mbps - ${cleanedNetStr}`;
  }
  if (lower.includes("10 mbps") || lower.includes("10mbps")) {
    return `10 Mbps - ${cleanedNetStr}`;
  }

  // 2. Guess based on common adapter names/interfaces if no speed is explicitly written
  // If it's a physical Ethernet port on a modern server (like eno1, eth0, enp3s0)
  if (lower.includes("eno") || lower.includes("eth") || lower.includes("enp") || lower.includes("intel") || lower.includes("realtek")) {
    return `1000 Mbps (Gigabit) - ${cleanedNetStr}`;
  }
  
  return cleanedNetStr;
};

export const getNetworkSpeedShort = (netStr: string): string => {
  if (!netStr) return "-";
  const lower = netStr.toLowerCase();
  if (lower.includes("10000 mbps") || lower.includes("10 gbps") || lower.includes("10gbps")) {
    return "/10000";
  }
  if (lower.includes("1000 mbps") || lower.includes("1000mbps") || lower.includes("1 gbps") || lower.includes("1gbps") || lower.includes("gigabit") || lower.includes("gbe")) {
    return "/1000";
  }
  if (lower.includes("100 mbps") || lower.includes("100mbps") || lower.includes("fast ethernet")) {
    return "/100";
  }
  if (lower.includes("10 mbps") || lower.includes("10mbps")) {
    return "/10";
  }
  // Guess based on common adapter names
  if (lower.includes("eno") || lower.includes("eth") || lower.includes("enp") || lower.includes("intel") || lower.includes("realtek")) {
    return "/1000";
  }
  return "-";
};

