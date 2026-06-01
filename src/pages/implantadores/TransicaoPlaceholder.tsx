import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Share2, ClipboardCheck, MessageSquare, Sparkles } from "lucide-react";

export default function TransicaoPlaceholder() {
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link to="/implantadores">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Voltar ao Painel</span>
      </div>

      <div className="text-center py-12 space-y-4">
        <div className="inline-flex p-4 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-2">
          <FileText className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground bg-gradient-to-r from-rose-500 to-red-600 bg-clip-text text-transparent">
          Documento de Transição Operacional (DTC)
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Elabore e valide o documento de encerramento do projeto, transferindo a responsabilidade da
          implantação e go-live para as equipes de suporte pós-vendas e atendimento contínuo.
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
          <Sparkles className="h-3 w-3 animate-pulse" />
          Em Planejamento
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-muted/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-500">
              <ClipboardCheck className="h-4 w-4" />
              Checklist de Pendências
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Consolide todos os Gaps de Produto solucionados, homologações concluídas e pendências que ficarão acordadas com o suporte.
          </CardContent>
        </Card>

        <Card className="border-muted/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-500">
              <MessageSquare className="h-4 w-4" />
              Ata de Handover
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Reunião e alinhamento técnico entre implantadores e analistas de suporte, registrando observações de regras do cliente.
          </CardContent>
        </Card>

        <Card className="border-muted/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-500">
              <Share2 className="h-4 w-4" />
              Compartilhar com Suporte
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Gere um link público ou envie por e-mail a versão finalizada do DTC assinada pelas partes interessadas.
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/30 border rounded-2xl p-6 text-center">
        <p className="text-xs text-muted-foreground">
          O desenvolvimento desta funcionalidade faz parte do planejamento da etapa F5 (Encerramento e DTC).
          Caso queira obter os modelos em documento PDF, contate a gerência de projetos.
        </p>
      </div>
    </div>
  );
}
