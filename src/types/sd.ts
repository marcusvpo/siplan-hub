export interface SdFamilia {
  id: string;
  nome: string;
  descricao: string | null;
  criado_em: string;
}

export interface SdSistema {
  id: string;
  nome: string;
  familia_id: string | null;
  criado_em: string;
  familia?: Pick<SdFamilia, "id" | "nome" | "descricao"> | null;
}

export interface SdRotina {
  id: string;
  nome: string;
  sistema_id: string;
  criado_em: string;
}

export interface SdAnexo {
  id: string;
  solucao_id: string;
  nome_arquivo: string;
  caminho_storage: string;
  tipo_mime: string | null;
  tamanho_bytes: number;
  criado_em: string;
  criado_por: string | null;
}

export interface SdSolucao {
  id: string;
  titulo: string;
  descricao: string | null;
  sistema_id: string;
  rotina_id: string | null;
  palavras_chave: string[];
  criado_em: string;
  atualizado_em: string | null;
  criado_por: string | null;
  atualizado_por: string | null;
  sistema?: Pick<SdSistema, "id" | "nome"> | null;
  rotina?: Pick<SdRotina, "id" | "nome"> | null;
  anexos?: SdAnexo[];
}

export interface SdSistemaComRotinas extends SdSistema {
  rotinas: SdRotina[];
}

export interface SdSolucaoPayload {
  titulo: string;
  descricao: string | null;
  sistema_id: string;
  rotina_id: string | null;
  palavras_chave: string[];
}
