import { InfraStageV2, ServerInfo, WorkstationInfo } from "@/types/ProjectV2";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Megaphone, 
  Server as ServerIcon, 
  Laptop, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Upload, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  BookOpen, 
  Info, 
  RefreshCw, 
  FileText,
  HelpCircle,
  Activity,
  Check,
  ClipboardList,
  Share2,
  Lock,
  Unlock
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { StatusType } from "./types";
import { jsPDF } from "jspdf";
import { format } from "date-fns";

interface InfraStageFormProps {
  stage: InfraStageV2;
  canEditProjects: boolean;
  notifying: boolean;
  onUpdate: (updates: Partial<InfraStageV2>) => void;
  onNotifyComercial: () => void;
  projectId?: string;
  lastUpdatedBy?: string;
  clientName?: string;
}

import {
  extractGeneration,
  checkWorkstationRequirements,
  checkServerRequirements,
  parseMachineInfo,
  parseExcelPastedText,
  formatDiskFreeSpace,
  formatNetworkSpeed,
  getNetworkSpeedShort,
} from "@/utils/infra-validation";

// -------------------------------------------------------------
// EDITABLE CELL COMPONENT FOR FLAT/FLUID TABLE
// -------------------------------------------------------------
interface EditableCellProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function EditableCell({ value, onChange, placeholder, disabled, className }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  if (disabled) {
    return (
      <div className={cn("text-[10.5px] px-1.5 py-0.5 break-all select-text whitespace-pre-wrap leading-tight", className)}>
        {value || <span className="text-muted-foreground/30 italic">{placeholder || "-"}</span>}
      </div>
    );
  }

  if (isEditing) {
    return (
      <Input
        value={tempValue}
        onChange={e => setTempValue(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          onChange(tempValue);
        }}
        onKeyDown={e => {
          if (e.key === "Enter") {
            setIsEditing(false);
            onChange(tempValue);
          } else if (e.key === "Escape") {
            setTempValue(value);
            setIsEditing(false);
          }
        }}
        autoFocus
        className={cn("h-7 text-[10.5px] px-1.5 w-full", className)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "text-[10.5px] px-1.5 py-1 break-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded min-h-7 flex items-center transition-colors w-full whitespace-pre-wrap leading-tight",
        !value && "text-muted-foreground/30 italic",
        className
      )}
    >
      {value || <span className="text-muted-foreground/30 italic">{placeholder || "-"}</span>}
    </div>
  );
}

// -------------------------------------------------------------
// COMPONENT IMPLEMENTATION
// -------------------------------------------------------------

export function InfraStageForm({
  stage,
  canEditProjects,
  notifying,
  onUpdate,
  onNotifyComercial,
  projectId,
  lastUpdatedBy,
  clientName,
}: InfraStageFormProps) {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<string>("geral");
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [excelText, setExcelText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  
  const serverFileInputRef = useRef<HTMLInputElement>(null);
  const workstationFileInputRef = useRef<HTMLInputElement>(null);

  const servers: ServerInfo[] = stage.servers || [];
  const workstations: WorkstationInfo[] = stage.workstations || [];
  const workstationsCount = stage.workstationsCount || workstations.length || 0;

  const handleGenerateAnalyticalReport = () => {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let posY = 20;

      const drawHeader = () => {
        pdf.setFillColor(141, 12, 45); // Dark Burgundy top bar
        pdf.rect(0, 0, pageWidth, 4, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text("SIPLAN HUB - ECOSSISTEMA DE GESTÃO", margin, 11);

        pdf.setFont("helvetica", "normal");
        pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - margin - 45, 11);

        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, 13, pageWidth - margin, 13);
      };

      const drawFooter = (pageNum: number, totalPages: number) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(148, 163, 184);
        pdf.text("Siplan HUB © 2026 - Auditoria e Implantação de Infraestrutura", margin, pageHeight - 10);

        const pageText = `Página ${pageNum} de ${totalPages}`;
        const textWidth = pdf.getTextWidth(pageText);
        pdf.text(pageText, pageWidth - margin - textWidth, pageHeight - 10);
      };

      const checkAddPage = (neededHeight: number) => {
        if (posY + neededHeight > pageHeight - margin - 15) {
          pdf.addPage();
          posY = 25;
          return true;
        }
        return false;
      };

      // Document Content
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(15, 23, 42);
      pdf.text("RELATÓRIO DE INFRAESTRUTURA TÉCNICA", margin, posY);
      posY += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Serventia/Cartório: ${clientName || "Não identificada"}`, margin, posY);
      posY += 5;

      pdf.text(`Responsável (Siplan): ${stage.responsible || "Não informado"}`, margin, posY);
      posY += 5;

      pdf.text(`Responsável (Serventia): ${stage.clientResponsible || "Não informado"}`, margin, posY);
      posY += 5;

      posY += 4;

      checkAddPage(32);
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, posY, pageWidth - 2 * margin, 26, 2, 2, "FD");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text("Resumo de Compatibilidade da Infraestrutura", margin + 5, posY + 6);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text("Status Geral do Servidor:", margin + 5, posY + 13);
      
      const srvStatus = stage.serverStatus || "Não Avaliado";
      pdf.setFont("helvetica", "bold");
      if (srvStatus === "Adequado") {
        pdf.setTextColor(16, 185, 129);
      } else {
        pdf.setTextColor(239, 68, 68);
      }
      pdf.text(srvStatus, margin + 42, posY + 13);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      pdf.text("Status das Estações:", margin + 5, posY + 19);

      const wsStatus = stage.workstationsStatus || "Não Avaliado";
      pdf.setFont("helvetica", "bold");
      if (wsStatus === "Adequado") {
        pdf.setTextColor(16, 185, 129);
      } else {
        pdf.setTextColor(239, 68, 68);
      }
      pdf.text(wsStatus, margin + 42, posY + 19);

      const stationsOk = workstations.filter(w => checkWorkstationRequirements(w).meets).length;
      const stationsFail = workstations.length - stationsOk;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Estações de Trabalho: ${workstations.length} total (${stationsOk} OK, ${stationsFail} Incompatíveis)`, margin + 85, posY + 13);
      pdf.text(`Estações declaradas comercialmente: ${workstationsCount}`, margin + 85, posY + 19);

      posY += 32;

      checkAddPage(20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(141, 12, 45);
      pdf.text("SERVIDORES DETECTADOS / ANALISADOS", margin, posY);
      posY += 3;
      pdf.setDrawColor(141, 12, 45);
      pdf.line(margin, posY, pageWidth - margin, posY);
      posY += 6;

      if (servers.length === 0) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8.5);
        pdf.setTextColor(148, 163, 184);
        pdf.text("Nenhum servidor cadastrado para esta serventia.", margin, posY);
        posY += 8;
      } else {
        servers.forEach((srv, idx) => {
          const validation = checkServerRequirements(srv, workstationsCount);
          checkAddPage(96);

          // Inline spec validations for red text highlights
          let coresVal: number | null = null;
          if (srv.cores) {
            const cMatch = srv.cores.toString().match(/(\d+)/);
            if (cMatch) coresVal = parseInt(cMatch[1]);
          }
          if (coresVal === null && srv.processor) {
            const coresMatch = srv.processor.match(/(\d+)\s*(?:cores|cpus|núcleos|nucleos|threads)/i) || 
                               srv.processor.match(/\((\d+)\s*(?:cpu)/i);
            if (coresMatch) {
              coresVal = parseInt(coresMatch[1]);
            } else {
              const fallbackMatch = srv.processor.match(/(\d+)\s*(nucleo|núcleo|core|thread|cpu)/i);
              if (fallbackMatch) {
                const val = parseInt(fallbackMatch[1]);
                if (val < 256) coresVal = val;
              }
            }
          }
          const minCores = workstationsCount > 15 ? 8 : 6;
          const cpuInconsistent = coresVal !== null && coresVal < minCores;

          let ramInconsistent = false;
          if (srv.memory) {
            const ramMatch = srv.memory.match(/(\d+)/);
            if (ramMatch) {
              const ram = parseInt(ramMatch[1]);
              const minRam = workstationsCount <= 5 ? 20 : (workstationsCount <= 10 ? 24 : 48);
              if (ram < minRam) ramInconsistent = true;
            }
          }

          let osInconsistent = false;
          if (srv.os) {
            const lowerOs = srv.os.toLowerCase();
            if (lowerOs.includes("windows server 2012") || lowerOs.includes("windows server 2008") || lowerOs.includes("windows server 2016") || lowerOs.includes("2012 r2")) {
              osInconsistent = true;
            }
          }

          // Card Background (height increased to 92)
          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(226, 232, 240);
          pdf.roundedRect(margin, posY, pageWidth - 2 * margin, 92, 1, 1, "FD");

          // Card Header Bar
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, posY, pageWidth - 2 * margin, 7.5, "F");
          pdf.setDrawColor(226, 232, 240);
          pdf.line(margin, posY + 7.5, pageWidth - margin, posY + 7.5);

          // Server Header Title & Status Badge
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8.5);
          pdf.setTextColor(15, 23, 42);
          pdf.text(srv.hostname || `SERVIDOR ${idx + 1}`, margin + 4, posY + 5);

          const meetsLabel = validation.meets ? "REQUISITOS SATISFEITOS" : "COMPATIBILIDADE COM ALERTAS";
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          if (validation.meets) {
            pdf.setTextColor(16, 185, 129);
          } else {
            pdf.setTextColor(239, 68, 68);
          }
          const badgeWidth = pdf.getTextWidth(meetsLabel);
          pdf.text(meetsLabel, pageWidth - margin - badgeWidth - 4, posY + 5);

          // Spec details (Helvetica Normal 7.5pt)
          pdf.setFontSize(7.5);
          pdf.setTextColor(100, 116, 139);
          pdf.setFont("helvetica", "normal");
          
          const labelX = margin + 4;
          const valX = margin + 34;

          // Row 1: Marca/Modelo
          pdf.text("Marca/Modelo:", labelX, posY + 13);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(15, 23, 42);
          const brandTrunc = srv.brandModel && srv.brandModel.length > 80 ? srv.brandModel.substring(0, 80) + "..." : (srv.brandModel || "-");
          pdf.text(brandTrunc, valX, posY + 13);

          // Row 2: Virtualizado
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Virtualizado:", labelX, posY + 18.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(15, 23, 42);
          pdf.text(srv.virtualized === true || srv.virtualized === "Sim" ? "Sim" : "Não", valX, posY + 18.5);

          // Row 3: Processador
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Processador:", labelX, posY + 24);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(cpuInconsistent ? 220 : 15, cpuInconsistent ? 38 : 23, cpuInconsistent ? 38 : 42);
          const cpuTrunc = srv.processor && srv.processor.length > 80 ? srv.processor.substring(0, 80) + "..." : (srv.processor || "-");
          pdf.text(cpuTrunc, valX, posY + 24);

          // Row 4: Núcleos
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Núcleos:", labelX, posY + 29.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(cpuInconsistent ? 220 : 15, cpuInconsistent ? 38 : 23, cpuInconsistent ? 38 : 42);
          pdf.text(String(srv.cores || "-"), valX, posY + 29.5);

          // Row 5: Memória RAM
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Memória RAM:", labelX, posY + 35);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(ramInconsistent ? 220 : 15, ramInconsistent ? 38 : 23, ramInconsistent ? 38 : 42);
          const ramTrunc = srv.memory && srv.memory.length > 50 ? srv.memory.substring(0, 50) + "..." : (srv.memory || "-");
          pdf.text(ramTrunc, valX, posY + 35);

          // Row 6: Disco (Espaço)
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Disco (Espaço):", labelX, posY + 40.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(15, 23, 42);
          const diskFormatted = formatDiskFreeSpace(srv.disk || "");
          const diskTrunc = diskFormatted.length > 80 ? diskFormatted.substring(0, 80) + "..." : diskFormatted;
          pdf.text(diskTrunc, valX, posY + 40.5);

          // Row 7: Espaço p/ Orion
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Espaço p/ Orion:", labelX, posY + 46);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(15, 23, 42);
          const spaceTrunc = srv.spaceOrion && srv.spaceOrion.length > 50 ? srv.spaceOrion.substring(0, 50) + "..." : (srv.spaceOrion || "-");
          pdf.text(spaceTrunc, valX, posY + 46);

          // Row 8: Sistema Op.
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Sistema Op.:", labelX, posY + 51.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(osInconsistent ? 220 : 15, osInconsistent ? 38 : 23, osInconsistent ? 38 : 42);
          const osTrunc = srv.os && srv.os.length > 70 ? srv.os.substring(0, 70) + "..." : (srv.os || "-");
          pdf.text(osTrunc, valX, posY + 51.5);

          // Row 9: Rede
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Rede:", labelX, posY + 57);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(15, 23, 42);
          const netFormatted = formatNetworkSpeed(srv.network || "");
          const netTrunc = netFormatted.length > 110 ? netFormatted.substring(0, 110) + "..." : netFormatted;
          pdf.text(netTrunc, valX, posY + 57);

          // Row 10: Anti-Vírus
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Anti-Vírus:", labelX, posY + 62.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(15, 23, 42);
          const antivirusTrunc = srv.antivirus && srv.antivirus.length > 60 ? srv.antivirus.substring(0, 60) + "..." : (srv.antivirus || "-");
          pdf.text(antivirusTrunc, valX, posY + 62.5);

          // Row 11: Backup
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Backup:", labelX, posY + 68);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(15, 23, 42);
          const backupTrunc = srv.backup && srv.backup.length > 70 ? srv.backup.substring(0, 70) + "..." : (srv.backup || "-");
          pdf.text(backupTrunc, valX, posY + 68);

          // Row 12: Ambiente
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Ambiente:", labelX, posY + 73.5);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(15, 23, 42);
          pdf.text(srv.environment || "Local", valX, posY + 73.5);

          // Row 13: Rede Failover
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Rede Failover:", labelX, posY + 79);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(15, 23, 42);
          pdf.text(srv.networkFailover || "Não", valX, posY + 79);

          // Row 14: Observações
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text("Observações:", labelX, posY + 84.5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(71, 85, 105);
          const obsVal = srv.observations || "Nenhuma observação cadastrada.";
          const obsTrunc = obsVal.length > 85 ? obsVal.substring(0, 85) + "..." : obsVal;
          pdf.text(obsTrunc, valX, posY + 84.5);

          posY += 96;

          if (validation.issues.length > 0) {
            checkAddPage(validation.issues.length * 4.5 + 8);
            pdf.setFillColor(254, 242, 242);
            pdf.setDrawColor(254, 226, 226);
            const alertHeight = validation.issues.length * 4 + 4;
            pdf.roundedRect(margin, posY - 2, pageWidth - 2 * margin, alertHeight, 1, 1, "FD");

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7);
            pdf.setTextColor(220, 38, 38);
            pdf.text("Alertas do Servidor:", margin + 4, posY + 1.5);

            pdf.setFont("helvetica", "normal");
            validation.issues.forEach((issue, issueIdx) => {
              pdf.text(`• ${issue}`, margin + 6, posY + 5 + (issueIdx * 4));
            });

            posY += alertHeight + 5;
          }
        });
      }

      posY += 2;

      checkAddPage(25);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(141, 12, 45);
      pdf.text("PARQUE DE MÁQUINAS (ESTAÇÕES DE TRABALHO)", margin, posY);
      posY += 3;
      pdf.setDrawColor(141, 12, 45);
      pdf.line(margin, posY, pageWidth - margin, posY);
      posY += 6;

      if (workstations.length === 0) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8.5);
        pdf.setTextColor(148, 163, 184);
        pdf.text("Nenhuma estação cadastrada para esta serventia.", margin, posY);
        posY += 8;
      } else {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, posY, pageWidth - 2 * margin, 7.5, "F");
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(margin, posY, pageWidth - 2 * margin, 7.5, "D");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(71, 85, 105);
        pdf.text("Item", margin + 2, posY + 5);
        pdf.text("Hostname", margin + 9, posY + 5);
        pdf.text("Setor", margin + 31, posY + 5);
        pdf.text("Usuário", margin + 53, posY + 5);
        pdf.text("Processador / Geração", margin + 75, posY + 5);
        pdf.text("RAM", margin + 107, posY + 5);
        pdf.text("Armazenamento", margin + 118, posY + 5);
        pdf.text("Rede", margin + 146, posY + 5);
        pdf.text("Atende?", margin + 168, posY + 5);

        posY += 7.5;

        workstations.forEach((ws, idx) => {
          const validation = checkWorkstationRequirements(ws);
          
          // Split the wrapped columns dynamically
          const cpuVal = ws.processor || "-";
          const cpuLines = pdf.splitTextToSize(cpuVal, 30);
          
          const diskFormatted = formatDiskFreeSpace(ws.disk || "");
          const diskLines = pdf.splitTextToSize(diskFormatted, 25);
          
          const maxLines = Math.max(cpuLines.length, diskLines.length, 1);
          const rowHeight = 3.5 + maxLines * 3; // 6.5mm for 1 line, 9.5mm for 2 lines

          // Verify if page break is needed
          const alertHeight = (!validation.meets && validation.issues.length > 0) ? 5 : 0;
          checkAddPage(rowHeight + alertHeight);

          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(226, 232, 240);
          pdf.rect(margin, posY, pageWidth - 2 * margin, rowHeight, "FD");

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          pdf.setTextColor(71, 85, 105);
          pdf.text(String(idx + 1), margin + 2, posY + 4.2);
          
          const wsHostname = ws.hostname || "-";
          const wsHostnameTrunc = wsHostname.length > 15 ? wsHostname.substring(0, 15) + "..." : wsHostname;
          pdf.text(wsHostnameTrunc, margin + 9, posY + 4.2);
          
          const wsSector = ws.sector || "-";
          const wsSectorTrunc = wsSector.length > 15 ? wsSector.substring(0, 15) + "..." : wsSector;
          pdf.text(wsSectorTrunc, margin + 31, posY + 4.2);
          
          const wsUser = ws.user || "-";
          const wsUserTrunc = wsUser.length > 15 ? wsUser.substring(0, 15) + "..." : wsUser;
          pdf.text(wsUserTrunc, margin + 53, posY + 4.2);

          // Wrapped Processador Geração column
          pdf.text(cpuLines, margin + 75, posY + 4.2);
          
          const wsMemory = ws.memory || "-";
          const wsMemoryTrunc = wsMemory.length > 10 ? wsMemory.substring(0, 10) + "..." : wsMemory;
          pdf.text(wsMemoryTrunc, margin + 107, posY + 4.2);

          // Wrapped Armazenamento column
          pdf.text(diskLines, margin + 118, posY + 4.2);

          const wsNetworkSpeed = getNetworkSpeedShort(ws.network || "");
          pdf.text(wsNetworkSpeed, margin + 146, posY + 4.2);

          pdf.setFont("helvetica", "bold");
          if (validation.meets) {
            pdf.setTextColor(16, 185, 129);
            pdf.text("Sim", margin + 168, posY + 4.2);
          } else {
            pdf.setTextColor(239, 68, 68);
            pdf.text("Não", margin + 168, posY + 4.2);
          }

          posY += rowHeight;

          if (!validation.meets && validation.issues.length > 0) {
            checkAddPage(5.5);
            pdf.setFillColor(254, 242, 242);
            pdf.rect(margin, posY, pageWidth - 2 * margin, 5, "FD");
            pdf.setFont("helvetica", "italic");
            pdf.setFontSize(6.5);
            pdf.setTextColor(220, 38, 38);
            pdf.text(`Alertas: ${validation.issues.join(" | ")}`, margin + 10, posY + 3.5);
            posY += 5;
          }
        });
      }

      posY += 5;

      checkAddPage(30);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(141, 12, 45);
      pdf.text("PARECER DE VIABILIDADE TÉCNICA", margin, posY);
      posY += 3;
      pdf.setDrawColor(141, 12, 45);
      pdf.line(margin, posY, pageWidth - margin, posY);
      posY += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text("Servidor em uso atual:", margin, posY);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text(stage.serverInUse || "Não informado", margin + 45, posY);
      posY += 5;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text("Servidor cotado/necessário:", margin, posY);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text(stage.serverNeeded || "Não cotado", margin + 45, posY);
      posY += 7;

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text("Notas e Parecer de Viabilidade da Siplan:", margin, posY);
      posY += 5.5;

      const techNotes = stage.technicalNotes || "Nenhum parecer técnico ou notas registradas.";
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(71, 85, 105);

      const wrappedNotes = pdf.splitTextToSize(techNotes, pageWidth - 2 * margin);
      wrappedNotes.forEach((line: string) => {
        checkAddPage(5);
        pdf.text(line, margin, posY);
        posY += 4.5;
      });

      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        drawHeader();
        drawFooter(i, totalPages);
      }

      const formattedDate = format(new Date(), "ddMMyyyy");
      const clientSanitized = (clientName || "Serventia")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .substring(0, 20);
      
      pdf.save(`relatorio_infra_${clientSanitized}_${formattedDate}.pdf`);

      toast({
        title: "Relatório Gerado com Sucesso",
        description: "O PDF do relatório analítico foi gerado e baixado no seu dispositivo.",
        className: "bg-emerald-500 text-white border-emerald-600",
      });
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast({
        title: "Erro ao Gerar Relatório",
        description: "Ocorreu um erro ao processar e exportar o relatório para PDF.",
        variant: "destructive",
      });
    }
  };

  // Auto-calculate statuses when workstations, servers, or workstationsCount changes
  useEffect(() => {
    if (!canEditProjects) return;

    let updated = false;
    const updates: Partial<InfraStageV2> = {};

    // 1. Calculate Workstations Status
    if (workstations.length > 0) {
      const okCount = workstations.filter(w => {
        if (w.meetsRequirements === "Sim") return true;
        if (w.meetsRequirements === "Não") return false;
        return checkWorkstationRequirements(w).meets;
      }).length;
      const failCount = workstations.length - okCount;

      let calculated: StatusType = "Aguardando Adequação";
      if (okCount === workstations.length) {
        calculated = "Adequado";
      } else if (failCount === workstations.length) {
        calculated = "Inadequado";
      } else {
        calculated = "Parcialmente Adequado";
      }

      // Preserve "Aguardando Adequação" if already set and calculated is not fully adequate
      if (stage.workstationsStatus === "Aguardando Adequação" && calculated !== "Adequado") {
        calculated = "Aguardando Adequação";
      }

      if (stage.workstationsStatus !== calculated) {
        updates.workstationsStatus = calculated;
        updated = true;
      }
    }

    // 2. Calculate Server Status
    if (servers.length > 0) {
      const okCount = servers.filter(srv => {
        return checkServerRequirements(srv, workstationsCount).meets;
      }).length;
      const failCount = servers.length - okCount;

      let calculated: StatusType = "Aguardando Adequação";
      if (okCount === servers.length) {
        calculated = "Adequado";
      } else if (failCount === servers.length) {
        calculated = "Inadequado";
      } else {
        calculated = "Parcialmente Adequado";
      }

      // Preserve "Aguardando Adequação" if already set and calculated is not fully adequate
      if (stage.serverStatus === "Aguardando Adequação" && calculated !== "Adequado") {
        calculated = "Aguardando Adequação";
      }

      if (stage.serverStatus !== calculated) {
        updates.serverStatus = calculated;
        updated = true;
      }
    }

    if (updated) {
      onUpdate(updates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workstations, servers, workstationsCount]);

  // Sync count on change
  const handleWorkstationsChange = (newWorkstations: WorkstationInfo[]) => {
    onUpdate({
      workstations: newWorkstations,
      workstationsCount: newWorkstations.length
    });
  };

  const handleServersChange = (newServers: ServerInfo[]) => {
    onUpdate({ servers: newServers });
  };

  // Add Item Helpers
  const addServer = () => {
    const newServers = [...servers, {
      hostname: `SERVIDOR-0${servers.length + 1}`,
      brandModel: "",
      virtualized: "Não",
      processor: "",
      memory: "",
      disk: "",
      os: "",
      antivirus: "",
      network: "",
      backup: "",
      spaceOrion: "",
      observations: ""
    }];
    handleServersChange(newServers);
  };

  const deleteServer = (idx: number) => {
    const newServers = servers.filter((_, i) => i !== idx);
    handleServersChange(newServers);
  };

  const addWorkstation = () => {
    const newStations = [...workstations, {
      id: workstations.length + 1,
      hostname: "",
      sector: "",
      user: "",
      processor: "",
      generation: "",
      memory: "",
      disk: "",
      network: "",
      os: "",
      antivirus: "",
      meetsRequirements: undefined
    }];
    handleWorkstationsChange(newStations);
  };

  const deleteWorkstation = (idx: number) => {
    const newStations = workstations.filter((_, i) => i !== idx);
    handleWorkstationsChange(newStations);
  };

  // Bulk Validation helper
  const runAutoValidateAll = () => {
    const validated = workstations.map(ws => {
      const res = checkWorkstationRequirements(ws);
      return {
        ...ws,
        meetsRequirements: (res.meets ? "Sim" : "Não") as "Sim" | "Não"
      };
    });
    handleWorkstationsChange(validated);
    toast({
      title: "Sucesso",
      description: "Validação automática concluída para todas as estações!",
    });
  };

  // Excel Paste Parser
  const handleExcelImport = () => {
    if (!excelText.trim()) return;
    try {
      const parsed = parseExcelPastedText(excelText);
      if (parsed.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhuma linha válida identificada no texto colado.",
          variant: "destructive"
        });
        return;
      }
      
      // Auto-validate pasted rows
      const validated = parsed.map(ws => {
        if (ws.meetsRequirements !== undefined) return ws;
        const res = checkWorkstationRequirements(ws);
        return {
          ...ws,
          meetsRequirements: (res.meets ? "Sim" : "Não") as "Sim" | "Não"
        };
      });

      handleWorkstationsChange([...workstations, ...validated]);
      setExcelText("");
      setExcelImportOpen(false);
      
      toast({
        title: "Sucesso",
        description: `Importado ${validated.length} estações com sucesso!`,
        className: "bg-green-500 text-white border-green-600",
      });
    } catch (e) {
      toast({
        title: "Erro",
        description: "Falha ao processar texto colado. Verifique o formato.",
        variant: "destructive"
      });
    }
  };

  // File Upload (TXT info-system)
  const handleServerFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const parsed = parseMachineInfo(content);
      const newServers = [...servers];
      
      // If we have at least one server, update the first one or ask to append
      if (newServers.length === 0) {
        newServers.push({
          hostname: parsed.hostname,
          processor: parsed.processor,
          cores: parsed.cores || "",
          memory: parsed.memory,
          disk: parsed.disk,
          network: parsed.network,
          os: parsed.os,
          virtualized: parsed.virtualized || "Não",
          brandModel: parsed.brandModel || "",
          antivirus: parsed.antivirus || "",
          backup: parsed.backup || "",
          spaceOrion: parsed.spaceOrion || "",
          environment: parsed.environment || "Local",
          networkFailover: parsed.networkFailover || "Não"
        });
      } else {
        newServers[0] = {
          ...newServers[0],
          hostname: parsed.hostname,
          processor: parsed.processor,
          cores: parsed.cores || newServers[0].cores || "",
          memory: parsed.memory,
          disk: parsed.disk,
          network: parsed.network,
          os: parsed.os,
          virtualized: parsed.virtualized || newServers[0].virtualized || "Não",
          brandModel: parsed.brandModel || newServers[0].brandModel || "",
          antivirus: parsed.antivirus || newServers[0].antivirus || "",
          backup: parsed.backup || newServers[0].backup || "",
          spaceOrion: parsed.spaceOrion || newServers[0].spaceOrion || "",
          environment: parsed.environment || newServers[0].environment || "Local",
          networkFailover: parsed.networkFailover || newServers[0].networkFailover || "Não"
        };
      }

      handleServersChange(newServers);
      toast({
        title: "Servidor Importado",
        description: `Dados carregados do arquivo TXT para o servidor ${parsed.hostname}!`,
        className: "bg-green-500 text-white border-green-600",
      });
    };
    reader.readAsText(file);
    if (serverFileInputRef.current) serverFileInputRef.current.value = "";
  };
  const handleWorkstationFilesImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleWorkstationFilesImport triggered");
    const files = event.target.files;
    console.log("Files list:", files);
    if (!files || files.length === 0) {
      console.log("No files selected or files list is empty");
      return;
    }

    const totalFiles = files.length; // Capture static total count before resetting the input
    let loadedCount = 0;
    const newStations: WorkstationInfo[] = [];

    Array.from(files).forEach((file, idx) => {
      console.log(`Processing file index ${idx}:`, file.name);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        console.log(`FileReader onload for: ${file.name}`);
        const content = e.target?.result as string;
        if (!content) {
          console.warn(`File content is empty or failed to load for: ${file.name}`);
          return;
        }

        console.log(`Content length for ${file.name}: ${content.length}`);
        try {
          const parsed = parseMachineInfo(content);
          console.log(`Parsed info for ${file.name}:`, parsed);
          
          const wsData: WorkstationInfo = {
            hostname: parsed.hostname,
            sector: parsed.sector,
            user: parsed.user,
            processor: parsed.processor,
            generation: parsed.generation,
            memory: parsed.memory,
            disk: parsed.disk,
            network: parsed.network,
            os: parsed.os,
          };

          const res = checkWorkstationRequirements(wsData);
          wsData.meetsRequirements = (res.meets ? "Sim" : "Não") as "Sim" | "Não";
          
          newStations.push(wsData);
          loadedCount++;
          console.log(`Successfully parsed file ${file.name}. Loaded: ${loadedCount} of ${totalFiles}`);

          if (loadedCount === totalFiles) {
            console.log("All files read. Updating workstations list with:", newStations);
            handleWorkstationsChange([...workstations, ...newStations]);
            toast({
              title: "Estações Importadas em Lote",
              description: `Importadas ${newStations.length} estações com sucesso!`,
              className: "bg-green-500 text-white border-green-600",
            });
          }
        } catch (err) {
          console.error(`Error parsing machine info for file ${file.name}:`, err);
        }
      };

      reader.onerror = (err) => {
        console.error(`FileReader error for file ${file.name}:`, err);
      };

      reader.readAsText(file);
    });

    if (workstationFileInputRef.current) {
      console.log("Resetting file input value");
      workstationFileInputRef.current.value = "";
    }
  };
  // Drag and drop handlers for workstations
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canEditProjects) setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEditProjects) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const txtFiles = Array.from(files).filter(f => f.name.endsWith(".txt"));
    if (txtFiles.length === 0) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Apenas arquivos .txt do info-system são suportados.",
        variant: "destructive"
      });
      return;
    }

    let loadedCount = 0;
    const newStations: WorkstationInfo[] = [];

    txtFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        if (!content) return;

        const parsed = parseMachineInfo(content);
        const wsData: WorkstationInfo = {
          hostname: parsed.hostname,
          sector: parsed.sector,
          user: parsed.user,
          processor: parsed.processor,
          generation: parsed.generation,
          memory: parsed.memory,
          disk: parsed.disk,
          network: parsed.network,
          os: parsed.os,
        };

        const res = checkWorkstationRequirements(wsData);
        wsData.meetsRequirements = (res.meets ? "Sim" : "Não") as "Sim" | "Não";
        
        newStations.push(wsData);
        loadedCount++;

        if (loadedCount === txtFiles.length) {
          handleWorkstationsChange([...workstations, ...newStations]);
          toast({
            title: "Estações Importadas em Lote",
            description: `Importadas ${newStations.length} estações via Drag & Drop!`,
            className: "bg-green-500 text-white border-green-600",
          });
        }
      };
      reader.readAsText(file);
    });
  };

  // Metrics for Overview
  const stationsOkCount = workstations.filter(w => w.meetsRequirements === "Sim").length;
  const stationsFailCount = workstations.filter(w => w.meetsRequirements === "Não").length;
  const stationsPendingCount = workstations.filter(w => !w.meetsRequirements).length;

  const serverValidationResults = servers.map(srv => checkServerRequirements(srv, workstationsCount));
  const serversOkCount = serverValidationResults.filter(r => r.meets).length;
  const serversFailCount = serverValidationResults.filter(r => !r.meets).length;

  return (
    <>
      {/* Botões e Status originais no topo */}
      <div className="col-span-full mb-2.5 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={notifying || !canEditProjects}
              className="font-bold shadow-sm h-8 text-xs"
            >
              <Megaphone className="mr-1.5 h-3.5 w-3.5" />
              {notifying ? "Notificando..." : "Notificar Comercial"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar notificação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja notificar o comercial? Um e-mail será
                enviado informando a infraestrutura inadequada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onNotifyComercial}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
          </AlertDialog>

          {projectId && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = `${window.location.origin}/public/infra-coleta/${projectId}`;
                  navigator.clipboard.writeText(link);
                  toast({
                    title: "Link de Coleta Copiado",
                    description: "O link foi copiado para a área de transferência. Envie para o técnico do cartório!",
                    className: "bg-emerald-500 text-white border-emerald-600",
                  });
                }}
                disabled={stage.publicLinkClosed === true}
                className="font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 shadow-sm h-8 text-xs"
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
                Copiar Link Público
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newClosed = !stage.publicLinkClosed;
                  onUpdate({ publicLinkClosed: newClosed });
                  toast({
                    title: newClosed ? "Link Público Fechado" : "Link Público Reaberto",
                    description: newClosed 
                      ? "O link público foi encerrado e não aceitará mais visualizações ou envios." 
                      : "O link público foi reaberto e está pronto para receber coletas.",
                    className: newClosed ? "bg-amber-600 text-white border-amber-700" : "bg-emerald-500 text-white border-emerald-600",
                  });
                }}
                disabled={!canEditProjects}
                className={cn(
                  "font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 shadow-sm h-8 text-xs",
                  stage.publicLinkClosed && "border-slate-200 text-slate-500 bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-800 dark:text-slate-400 dark:bg-slate-900/30"
                )}
              >
                {stage.publicLinkClosed ? (
                  <>
                    <Unlock className="mr-1.5 h-3.5 w-3.5" />
                    Reabrir Link Público
                  </>
                ) : (
                  <>
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                    Fechar Link Público
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateAnalyticalReport}
                className="font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 shadow-sm h-8 text-xs"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Gerar Relatório Analítico
              </Button>
            </>
          )}
        </div>

        {/* Resumo Rápido da Compatibilidade */}
        <div className="flex gap-2.5 items-center flex-wrap">
          {lastUpdatedBy && (
            <Badge 
              variant="secondary" 
              className={cn(
                "font-bold text-[10px] px-2 py-0.5 shadow-sm rounded-md border",
                (lastUpdatedBy === 'Coleta Pública (Técnico)' || lastUpdatedBy.includes('Coleta Pública'))
                  ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              )}
            >
              {(lastUpdatedBy === 'Coleta Pública (Técnico)' || lastUpdatedBy.includes('Coleta Pública')) 
                ? "Dados enviados pela serventia" 
                : "Preenchido pela Siplan"}
            </Badge>
          )}
          {workstations.length > 0 && (
            <>
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200">
                {stationsOkCount} Estações OK
              </Badge>
              {stationsFailCount > 0 && (
                <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 animate-pulse">
                  {stationsFailCount} Incompatíveis
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ServerIcon className="h-3.5 w-3.5" />
          Status Servidor
        </Label>
        <Select
          value={stage.serverStatus || ""}
          onValueChange={(v) => onUpdate({ serverStatus: v as StatusType })}
          disabled={!canEditProjects}
        >
          <SelectTrigger
            className="h-9 border border-input bg-background font-medium text-xs text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all duration-200"
          >
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Adequado" className="text-green-600 dark:text-emerald-400 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Adequado
              </div>
            </SelectItem>
            <SelectItem
              value="Parcialmente Adequado"
              className="text-orange-600 dark:text-orange-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                Parcialmente Adequado
              </div>
            </SelectItem>
            <SelectItem value="Inadequado" className="text-red-600 dark:text-red-400 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Inadequado
              </div>
            </SelectItem>
            <SelectItem
              value="Aguardando Adequação"
              className="text-gray-600 dark:text-slate-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                Aguardando Adequação
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
          Status Estações
        </Label>
        <Select
          value={stage.workstationsStatus || ""}
          onValueChange={(v) =>
            onUpdate({ workstationsStatus: v as StatusType })
          }
          disabled={!canEditProjects}
        >
          <SelectTrigger
            className="h-9 border border-input bg-background font-medium text-xs text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all duration-200"
          >
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Adequado" className="text-green-600 dark:text-emerald-400 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Adequado
              </div>
            </SelectItem>
            <SelectItem
              value="Parcialmente Adequado"
              className="text-orange-600 dark:text-orange-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                Parcialmente Adequado
              </div>
            </SelectItem>
            <SelectItem value="Inadequado" className="text-red-600 dark:text-red-400 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Inadequado
              </div>
            </SelectItem>
            <SelectItem
              value="Aguardando Adequação"
              className="text-gray-600 dark:text-slate-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                Aguardando Adequação
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
          Qtd. de Estações
        </Label>
        <Input
          type="number"
          value={workstationsCount}
          onChange={(e) =>
            onUpdate({
              workstationsCount: parseInt(e.target.value) || 0,
            })
          }
          disabled={!canEditProjects}
          className="h-9 border border-input bg-background text-foreground hover:bg-slate-50/50 dark:hover:bg-slate-900/50 focus-visible:ring-1 focus-visible:ring-ring font-medium text-xs"
        />
      </div>

      {/* ABAS DE DETALHES DE INFRAESTRUTURA (COL-SPAN-FULL) */}
      <div className="col-span-full border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-2">
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
          <TabsList className="bg-slate-100/80 dark:bg-slate-950/40 p-0.5 border dark:border-slate-800/60 rounded-lg flex flex-wrap h-auto gap-0.5">
            <TabsTrigger 
              value="geral" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 py-1.5 px-3 font-bold data-[state=active]:text-[hsl(346,84%,45%)] flex items-center gap-1.5 text-xs text-[11px]"
            >
              <Activity className="h-3.5 w-3.5" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger 
              value="servidores" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 py-1.5 px-3 font-bold data-[state=active]:text-[hsl(346,84%,45%)] flex items-center gap-1.5 text-xs text-[11px]"
            >
              <ServerIcon className="h-3.5 w-3.5" />
              Servidores ({servers.length})
            </TabsTrigger>
            <TabsTrigger 
              value="estacoes" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 py-1.5 px-3 font-bold data-[state=active]:text-[hsl(346,84%,45%)] flex items-center gap-1.5 text-xs text-[11px]"
            >
              <Laptop className="h-3.5 w-3.5" />
              Estações ({workstations.length})
            </TabsTrigger>
            <TabsTrigger 
              value="manual" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 py-1.5 px-3 font-bold data-[state=active]:text-[hsl(346,84%,45%)] flex items-center gap-1.5 text-xs text-[11px]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Manual Técnico
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: VISÃO GERAL */}
          <TabsContent value="geral" className="pt-2 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="bg-slate-50/50 dark:bg-slate-950/10 border dark:border-slate-800/60 shadow-sm rounded-lg">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    Servidor(es)
                    <ServerIcon className="h-3.5 w-3.5 text-sky-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {servers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum cadastrado</p>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-lg font-bold">{servers.length} Servidor(es)</div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5", serversFailCount > 0 ? "bg-red-50 text-red-700 dark:bg-red-950/20" : "bg-green-50 text-green-700 dark:bg-emerald-950/20")}>
                          {serversOkCount} OK
                        </Badge>
                        {serversFailCount > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">{serversFailCount} Avisos</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-50/50 dark:bg-slate-950/10 border dark:border-slate-800/60 shadow-sm rounded-lg">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    Estações Cadastradas
                    <Laptop className="h-3.5 w-3.5 text-purple-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-lg font-bold">{workstations.length} / {workstationsCount}</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Computadores de acordo com a quantidade total declarada.</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-50/50 dark:bg-slate-950/10 border dark:border-slate-800/60 shadow-sm rounded-lg">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    Compatibilidade Estações
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {workstations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem dados de estações</p>
                  ) : (
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${(stationsOkCount / workstations.length) * 100}%` }}
                        />
                        <div 
                          className="bg-rose-500 h-full transition-all duration-300"
                          style={{ width: `${(stationsFailCount / workstations.length) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-semibold mt-0.5">
                        <span className="text-emerald-600 dark:text-emerald-400">{stationsOkCount} OK ({( (stationsOkCount / workstations.length) * 100 ).toFixed(0)}%)</span>
                        <span className="text-rose-600 dark:text-rose-400">{stationsFailCount} Inc ({( (stationsFailCount / workstations.length) * 100 ).toFixed(0)}%)</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-950/10 border dark:border-slate-800/60 p-3 rounded-lg space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-indigo-500" />
                Notas Técnicas e Observações
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Servidor em Uso Atual</Label>
                  <Input 
                    value={stage.serverInUse || ""} 
                    onChange={e => onUpdate({ serverInUse: e.target.value })}
                    placeholder="Ex: Servidor HP ProLiant antigo, Xeon 4 cores, 16GB"
                    disabled={!canEditProjects}
                    className="border-slate-200 dark:border-slate-800/60 h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Servidor Necessário/Cotado</Label>
                  <Input 
                    value={stage.serverNeeded || ""} 
                    onChange={e => onUpdate({ serverNeeded: e.target.value })}
                    placeholder="Ex: Novo Servidor Dell PowerEdge T350 cotado comercialmente"
                    disabled={!canEditProjects}
                    className="border-slate-200 dark:border-slate-800/60 h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Notas de Viabilidade e Parecer Técnico</Label>
                <Textarea 
                  value={stage.technicalNotes || ""} 
                  onChange={e => onUpdate({ technicalNotes: e.target.value })}
                  placeholder="Descreva detalhes da viabilidade da infraestrutura, bloqueios específicos encontrados, se há necessidade de upgrades rápidos..."
                  disabled={!canEditProjects}
                  rows={2}
                  className="border-slate-200 dark:border-slate-800/60 text-xs py-1"
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: SERVIDORES */}
          <TabsContent value="servidores" className="pt-4 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex gap-2">
                {/* File input invisível para importar txt do servidor */}
                <input 
                  type="file" 
                  ref={serverFileInputRef} 
                  onChange={handleServerFileImport} 
                  accept=".txt" 
                  className="hidden" 
                />
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEditProjects}
                  onClick={() => serverFileInputRef.current?.click()}
                  className="text-xs font-bold border-cyan-300 hover:bg-cyan-50 dark:border-cyan-900/40 dark:hover:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400"
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Importar de TXT (info-system)
                </Button>
              </div>

              <Button 
                type="button"
                size="sm"
                disabled={!canEditProjects}
                onClick={addServer}
                className="bg-[hsl(346,84%)] bg-gradient-to-r from-[hsl(346,84%,45%)] to-[hsl(346,84%,55%)] hover:opacity-90 text-white font-bold"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar Servidor
              </Button>
            </div>

            {servers.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-xl bg-slate-50/30 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800/60">
                <ServerIcon className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-500">Nenhum servidor cadastrado nesta etapa.</p>
                <p className="text-xs text-muted-foreground mt-1">Adicione manualmente ou importe do script PowerShell.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {servers.map((srv, idx) => {
                  const validation = checkServerRequirements(srv, workstationsCount);
                  return (
                    <Card key={idx} className="border dark:border-slate-800/80 shadow-sm relative overflow-hidden bg-card/65">
                      {/* Indicador lateral de status de compatibilidade */}
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", validation.meets ? "bg-emerald-500" : "bg-rose-500")} />
                      
                      <CardHeader className="py-2 px-4 flex flex-row items-center justify-between border-b dark:border-slate-800/50">
                        <div className="flex items-center gap-2">
                          <ServerIcon className="h-4 w-4 text-slate-400" />
                          <CardTitle className="text-xs font-bold tracking-tight">
                            {srv.hostname || `SERVIDOR ${idx + 1}`}
                          </CardTitle>
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0.5", validation.meets ? "bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20" : "bg-rose-50/50 text-rose-700 dark:bg-rose-950/20")}>
                            {validation.meets ? "Requisitos OK" : "Incompatível"}
                          </Badge>
                        </div>
                        {canEditProjects && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteServer(idx)}
                            className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="p-3 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2 text-xs">
                          <div className="space-y-0.5 col-span-1 sm:col-span-1 md:col-span-3">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hostname</Label>
                            <Input 
                              value={srv.hostname || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].hostname = e.target.value;
                                handleServersChange(list);
                              }}
                              disabled={!canEditProjects}
                              className="h-8 text-xs border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-1 md:col-span-3">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Marca/Modelo</Label>
                            <Input 
                              value={srv.brandModel || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].brandModel = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: Dell T340"
                              disabled={!canEditProjects}
                              className="h-8 text-xs border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-1 md:col-span-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Virtualizado?</Label>
                            <Select
                              value={srv.virtualized === true || srv.virtualized === "Sim" ? "Sim" : "Não"}
                              onValueChange={v => {
                                const list = [...servers];
                                list[idx].virtualized = v as "Sim" | "Não";
                                handleServersChange(list);
                              }}
                              disabled={!canEditProjects}
                            >
                              <SelectTrigger className="h-8 text-xs border-slate-200 dark:border-slate-800/60">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-1 md:col-span-4">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Processador</Label>
                            <Input 
                              value={srv.processor || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].processor = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: Intel Xeon E5-2620"
                              disabled={!canEditProjects}
                              className="h-8 text-xs border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-1 md:col-span-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Núcleos</Label>
                            <Input 
                              value={srv.cores || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].cores = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: 6"
                              disabled={!canEditProjects}
                              className="h-8 text-xs border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-1 md:col-span-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Memória RAM</Label>
                            <Input 
                              value={srv.memory || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].memory = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: 32 GB"
                              disabled={!canEditProjects}
                              className="h-8 text-xs border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-1 md:col-span-3">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Disco (Armazenamento)</Label>
                            <Input 
                              value={srv.disk || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].disk = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: 2 TB SAS RAID 1"
                              disabled={!canEditProjects}
                              className="h-8 text-xs border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-1 md:col-span-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Espaço para o Orion</Label>
                            <Input 
                              value={srv.spaceOrion || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].spaceOrion = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: 500 GB"
                              disabled={!canEditProjects}
                              className="h-8 text-xs border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-2 md:col-span-3">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sistema Operacional</Label>
                            <Input 
                              value={srv.os || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].os = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: Windows Server 2022"
                              disabled={!canEditProjects}
                              className="h-8 text-xs border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-1 md:col-span-4">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Anti-Vírus</Label>
                            <Input 
                              value={srv.antivirus || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].antivirus = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: Bitdefender"
                              disabled={!canEditProjects}
                              className="h-8 text-xs border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-1 md:col-span-4">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rede</Label>
                            <Input 
                              value={srv.network || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].network = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: 1000 Mbps"
                              disabled={!canEditProjects}
                              className="h-8 text-xs border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-2 md:col-span-4">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Backup</Label>
                            <Input 
                              value={srv.backup || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].backup = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Ex: Nuvem + HD Externo"
                              disabled={!canEditProjects}
                              className="h-8 text-xs border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-1 md:col-span-6">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ambiente (Servidor)</Label>
                            <Select
                              value={srv.environment || "Local"}
                              onValueChange={v => {
                                const list = [...servers];
                                list[idx].environment = v;
                                handleServersChange(list);
                              }}
                              disabled={!canEditProjects}
                            >
                              <SelectTrigger className="h-8 text-xs border-slate-200 dark:border-slate-800/60">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                <SelectItem value="Local">Local</SelectItem>
                                <SelectItem value="Nuvem">Nuvem</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-1 md:col-span-6">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rede Failover?</Label>
                            <Select
                              value={srv.networkFailover || "Não"}
                              onValueChange={v => {
                                const list = [...servers];
                                list[idx].networkFailover = v;
                                handleServersChange(list);
                              }}
                              disabled={!canEditProjects}
                            >
                              <SelectTrigger className="h-8 text-xs border-slate-200 dark:border-slate-800/60">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-0.5 col-span-1 sm:col-span-2 md:col-span-12">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Observações</Label>
                            <Input 
                              value={srv.observations || ""} 
                              onChange={e => {
                                const list = [...servers];
                                list[idx].observations = e.target.value;
                                handleServersChange(list);
                              }}
                              placeholder="Detalhes adicionais..."
                              disabled={!canEditProjects}
                              className="h-8 text-xs border-slate-200 dark:border-slate-800/60"
                            />
                          </div>
                        </div>
 
                        {/* Listar erros ou avisos se existirem */}
                        {validation.issues.length > 0 && (
                          <div className="mt-2.5 p-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-lg flex items-start gap-2.5">
                            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                            <div className="text-xs text-rose-800 dark:text-rose-300">
                              <p className="font-bold mb-1">Alertas de Compatibilidade:</p>
                              <ul className="list-disc pl-4 space-y-0.5">
                                {validation.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: ESTAÇÕES */}
          <TabsContent value="estacoes" className="pt-4 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div className="flex flex-wrap gap-2">
                {/* File Input invisível para lote de TXT */}
                <input 
                  type="file" 
                  ref={workstationFileInputRef} 
                  onChange={handleWorkstationFilesImport} 
                  accept=".txt" 
                  multiple 
                  className="hidden" 
                />
                
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEditProjects}
                  onClick={() => workstationFileInputRef.current?.click()}
                  className="text-xs font-bold border-cyan-300 hover:bg-cyan-50 dark:border-cyan-900/40 dark:hover:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Importar TXT(s) (Lote)
                </Button>

                <Dialog open={excelImportOpen} onOpenChange={setExcelImportOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canEditProjects}
                      className="text-xs font-bold border-green-300 hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-950/20 text-green-700 dark:text-emerald-400"
                    >
                      <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                      Importar do Excel (Páginas)
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Importar Estações do Excel</DialogTitle>
                      <DialogDescription>
                        Copie as linhas da tabela de estações no Excel (incluindo as colunas Item, Hostname, Setor...) e cole-as na caixa abaixo:
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea 
                      value={excelText}
                      onChange={e => setExcelText(e.target.value)}
                      placeholder="Cole aqui (ex: 1	DANI	ADM	Daniela...)"
                      rows={10}
                      className="font-mono text-xs border-slate-200 dark:border-slate-800/80"
                    />
                    <DialogFooter>
                      <Button variant="outline" size="sm" onClick={() => setExcelText("")}>Limpar</Button>
                      <Button size="sm" onClick={handleExcelImport} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Importar Dados</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={runAutoValidateAll}
                  disabled={workstations.length === 0 || !canEditProjects}
                  className="text-xs font-bold border-violet-300 hover:bg-violet-50 dark:border-violet-900/40 dark:hover:bg-violet-950/20 text-violet-700 dark:text-violet-400"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Auto-Validar Requisitos
                </Button>
              </div>

              <Button 
                type="button"
                size="sm"
                disabled={!canEditProjects}
                onClick={addWorkstation}
                className="bg-[hsl(346,84%)] bg-gradient-to-r from-[hsl(346,84%,45%)] to-[hsl(346,84%,55%)] hover:opacity-90 text-white font-bold"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar Estação
              </Button>
            </div>

            {/* Drag & Drop Area */}
            {canEditProjects && (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-4 text-center text-xs transition-colors cursor-pointer",
                  dragOver 
                    ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-400" 
                    : "border-slate-200 dark:border-slate-800/60 hover:bg-slate-50/40 dark:hover:bg-slate-900/10"
                )}
              >
                <ClipboardList className="mx-auto h-5 w-5 text-slate-400 mb-1.5" />
                Arrastar e soltar múltiplos arquivos **.txt** coletados das estações aqui para importar de uma vez!
              </div>
            )}

            {workstations.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-xl bg-slate-50/30 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800/60">
                <Laptop className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-500">Nenhuma estação cadastrada.</p>
                <p className="text-xs text-muted-foreground mt-1">Adicione uma estação ou use as opções de importação acima.</p>
              </div>
            ) : (
              <div className="border dark:border-slate-800/60 rounded-xl overflow-x-auto shadow-sm bg-card">
                <Table className="w-full table-fixed border-collapse">
                  <TableHeader className="bg-slate-50/60 dark:bg-slate-950/20">
                    <TableRow className="h-9">
                      <TableHead className="w-[35px] font-bold text-center text-[10.5px] px-1 py-1">Item</TableHead>
                      <TableHead className="w-[11%] font-bold text-[10.5px] px-2 py-1">Hostname</TableHead>
                      <TableHead className="w-[9%] font-bold text-[10.5px] px-2 py-1">Setor</TableHead>
                      <TableHead className="w-[11%] font-bold text-[10.5px] px-2 py-1">Usuário</TableHead>
                      <TableHead className="w-[22%] font-bold text-[10.5px] px-2 py-1">Processador / Geração</TableHead>
                      <TableHead className="w-[6%] font-bold text-center text-[10.5px] px-2 py-1">RAM</TableHead>
                      <TableHead className="w-[21%] font-bold text-[10.5px] px-2 py-1">Disco (Espaço Livre)</TableHead>
                      <TableHead className="w-[13%] font-bold text-[10.5px] px-2 py-1">S.O.</TableHead>
                      <TableHead className="w-[7%] font-bold text-[10.5px] px-2 py-1">Atende?</TableHead>
                      <TableHead className="w-[35px] px-1 py-1"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workstations.map((ws, idx) => {
                      const validation = checkWorkstationRequirements(ws);
                      return (
                        <TableRow key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 h-auto">
                          {/* Item / ID */}
                          <TableCell className="font-semibold text-slate-500 text-center py-1.5 px-1 text-[10.5px]">
                            {idx + 1}
                          </TableCell>

                          {/* Hostname */}
                          <TableCell className="p-0.5">
                            <EditableCell
                              value={ws.hostname || ""}
                              onChange={val => {
                                const list = [...workstations];
                                list[idx].hostname = val;
                                handleWorkstationsChange(list);
                              }}
                              disabled={!canEditProjects}
                              placeholder="Hostname"
                            />
                          </TableCell>

                          {/* Setor */}
                          <TableCell className="p-0.5">
                            <EditableCell
                              value={ws.sector || ""}
                              onChange={val => {
                                const list = [...workstations];
                                list[idx].sector = val;
                                handleWorkstationsChange(list);
                              }}
                              placeholder="Ex: Balcão"
                              disabled={!canEditProjects}
                            />
                          </TableCell>

                          {/* Usuário */}
                          <TableCell className="p-0.5">
                            <EditableCell
                              value={ws.user || ""}
                              onChange={val => {
                                const list = [...workstations];
                                list[idx].user = val;
                                handleWorkstationsChange(list);
                              }}
                              placeholder="Usuário"
                              disabled={!canEditProjects}
                            />
                          </TableCell>

                          {/* Processador & Geração */}
                          <TableCell className="p-0.5">
                            <div className="flex flex-col gap-0.5">
                              <EditableCell
                                value={ws.processor || ""}
                                onChange={val => {
                                  const list = [...workstations];
                                  list[idx].processor = val;
                                  list[idx].generation = extractGeneration(val);
                                  handleWorkstationsChange(list);
                                }}
                                placeholder="Processador"
                                disabled={!canEditProjects}
                                className="font-medium"
                              />
                              <div className="pl-1.5 flex items-center">
                                <span className="text-[9px] text-muted-foreground mr-1 select-none font-bold uppercase tracking-wider">Geração:</span>
                                <div className="flex-1">
                                  <EditableCell
                                    value={ws.generation || ""}
                                    onChange={val => {
                                      const list = [...workstations];
                                      list[idx].generation = val;
                                      handleWorkstationsChange(list);
                                    }}
                                    placeholder="8ª Geração"
                                    disabled={!canEditProjects}
                                    className="text-muted-foreground text-[10px] leading-none py-0.5 min-h-max"
                                  />
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Memória */}
                          <TableCell className="p-0.5 text-center">
                            <EditableCell
                              value={ws.memory || ""}
                              onChange={val => {
                                const list = [...workstations];
                                list[idx].memory = val;
                                handleWorkstationsChange(list);
                              }}
                              placeholder="RAM"
                              disabled={!canEditProjects}
                              className="justify-center text-center"
                            />
                          </TableCell>

                          {/* Disco */}
                          <TableCell className="p-0.5">
                            <EditableCell
                              value={ws.disk || ""}
                              onChange={val => {
                                const list = [...workstations];
                                list[idx].disk = val;
                                handleWorkstationsChange(list);
                              }}
                              placeholder="Disco"
                              disabled={!canEditProjects}
                            />
                          </TableCell>

                          {/* Sistema Operacional */}
                          <TableCell className="p-0.5">
                            <EditableCell
                              value={ws.os || ""}
                              onChange={val => {
                                const list = [...workstations];
                                list[idx].os = val;
                                handleWorkstationsChange(list);
                              }}
                              placeholder="S.O."
                              disabled={!canEditProjects}
                            />
                          </TableCell>

                          {/* Compatibilidade */}
                          <TableCell className="p-0.5">
                            <div className="flex items-center gap-1">
                              <Select
                                value={ws.meetsRequirements || ""}
                                onValueChange={v => {
                                  const list = [...workstations];
                                  list[idx].meetsRequirements = v as "Sim" | "Não";
                                  handleWorkstationsChange(list);
                                }}
                                disabled={!canEditProjects}
                              >
                                <SelectTrigger className={cn("h-7 text-[10px] font-semibold w-full border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-indigo-500 bg-transparent focus:bg-white dark:focus:bg-slate-900 transition-all px-1.5",
                                  ws.meetsRequirements === "Sim" && "text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300",
                                  ws.meetsRequirements === "Não" && "text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 border-rose-300"
                                )}>
                                  <SelectValue placeholder="..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Sim">Sim</SelectItem>
                                  <SelectItem value="Não">Não</SelectItem>
                                </SelectContent>
                              </Select>

                              {/* Mostrar popover de erros caso seja inadequado */}
                              {validation.issues.length > 0 && ws.meetsRequirements === "Não" && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-full shrink-0">
                                      <HelpCircle className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Problemas Encontrados: {ws.hostname || `Estação ${idx + 1}`}</DialogTitle>
                                    </DialogHeader>
                                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                                      {validation.issues.map((iss, i) => (
                                        <li key={i}>{iss}</li>
                                      ))}
                                    </ul>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </TableCell>

                          {/* Botão de Deletar */}
                          <TableCell className="p-0.5 text-center">
                            {canEditProjects && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => deleteWorkstation(idx)}
                                className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* TAB 4: MANUAL TÉCNICO */}
          <TabsContent value="manual" className="pt-4 space-y-4">
            <Card className="border dark:border-slate-800/60 shadow-sm bg-card">
              <CardHeader className="border-b dark:border-b-slate-800/50 bg-slate-50/50 dark:bg-slate-950/15">
                <CardTitle className="text-md font-bold tracking-tight text-slate-800 dark:text-slate-200">
                  Manual de Compatibilidade do Cartório (Orion TN / PRO)
                </CardTitle>
                <CardDescription>
                  Especificações de infraestrutura recomendadas de acordo com as diretrizes da Siplan.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h4 className="font-bold text-sm text-[hsl(346,84%,45%)] mb-2 flex items-center gap-1.5">
                    <ServerIcon className="h-4.5 w-4.5" />
                    Requisitos dos Servidores (Minimos e Recomendados)
                  </h4>
                  <div className="border dark:border-slate-800/60 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50/60 dark:bg-slate-950/20">
                        <TableRow>
                          <TableHead className="font-bold text-xs">Quantidade de Estações</TableHead>
                          <TableHead className="font-bold text-xs">Requisitos Mínimos (SATA/Virtualizado)</TableHead>
                          <TableHead className="font-bold text-xs">Requisitos Recomendados (SSD/Físico)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        <TableRow>
                          <TableCell className="font-semibold">Até 5 Estações</TableCell>
                          <TableCell>Proc: 4 núcleos | RAM: 20GB dedicados | Disco: 7200 RPM SATA, RAID 1/5/10 (120GB livres)</TableCell>
                          <TableCell>Proc: 6 núcleos dedicados | RAM: 24GB dedicados | Disco: 10K SAS ou SSD (120GB livres)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Até 15 Estações</TableCell>
                          <TableCell>Proc: 4 núcleos | RAM: 24GB dedicados | Disco: 7200 RPM SATA, RAID 1/5/10 (120GB livres)</TableCell>
                          <TableCell>Proc: 8 núcleos dedicados | RAM: 32GB dedicados | Disco: 10K SAS ou SSD (120GB livres)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Até 25 Estações</TableCell>
                          <TableCell>Proc: 6 núcleos | RAM: 32GB dedicados | Disco: 7200 RPM SATA, RAID 1/5/10 (120GB livres)</TableCell>
                          <TableCell>Proc: 8 núcleos dedicados | RAM: 48GB dedicados | Disco: 10K SAS ou SSD (120GB livres)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Acima de 25 Estações</TableCell>
                          <TableCell>Proc: 6 núcleos | RAM: 48GB dedicados | Disco: 7200 RPM SATA, RAID 1/5/10 (120GB livres)</TableCell>
                          <TableCell>Proc: 12 núcleos dedicados | RAM: 64GB dedicados | Disco: 10K SAS ou SSD (120GB livres)</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-sm text-[hsl(346,84%,45%)] mb-2 flex items-center gap-1.5">
                      <Laptop className="h-4.5 w-4.5" />
                      Requisitos das Estações
                    </h4>
                    <div className="border dark:border-slate-800/60 rounded-lg p-4 bg-slate-50/40 dark:bg-slate-950/10 space-y-2 text-xs">
                      <p><strong>Processador:</strong> Intel Core i3 6ª Ger + / AMD Ryzen 3 (Mínimo) | Intel Core i5 8ª Ger + / AMD Ryzen 5 (Recomendado)</p>
                      <p><strong>Memória RAM:</strong> 4 GB para estações comuns | 8 GB para Balcão de Firmas (Recomendado Dual-Channel)</p>
                      <p><strong>Disco:</strong> 7200 RPM SATA com 10GB livres (Mínimo) | SSD com 10GB livres (Recomendado)</p>
                      <p><strong>S.O.:</strong> Windows 10 Pro / Windows 11 Pro 64-bits</p>
                      <p><strong>Rede:</strong> Cabeada 100/1000 Mbps (Velocidade alinhada ao servidor. Wi-Fi não suportada)</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[hsl(346,84%,45%)] mb-2 flex items-center gap-1.5">
                      <ClipboardList className="h-4.5 w-4.5" />
                      Recomendações de Rede & Segurança
                    </h4>
                    <div className="border dark:border-slate-800/60 rounded-lg p-4 bg-slate-50/40 dark:bg-slate-950/10 space-y-2 text-xs">
                      <p><strong>Redes Sem Fio (Wi-Fi):</strong> A Siplan alerta para a **NÃO utilização de Wi-Fi** nas estações de processamento dos softwares, por conta de lentidão no tráfego de imagens e instabilidade.</p>
                      <p><strong>Anti-Vírus:</strong> Recomenda-se soluções corporativas com gerenciamento centralizado (ex: Bitdefender Corporate).</p>
                      <p><strong>Nobreak:</strong> Gerenciável e adequado para desligar automaticamente o servidor em faltas de energia.</p>
                      <p><strong>Backup:</strong> Duas rotinas: backup de banco de dados e backup completo (SQL + arquivos/imagens) em local físico secundário e em nuvem.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
