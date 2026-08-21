export interface BunnyVideoMetadata {
  tem_video: boolean;
  bunny_library_id?: string;
  bunny_video_id?: string;
  video_title?: string;
  video_url?: string;
  video_timestamp?: string;
  video_start_seconds?: number;
}

export interface KnowledgeArticleMetadata {
  id: string;
  titulo: string;
  tags: string[];
  objetivo: string;
  sinonimos: string[];
  perguntas_usuario: string[];
  video?: BunnyVideoMetadata;
  [key: string]: unknown;
}

export interface KnowledgeArticle {
  id: string;
  titulo: string;
  sectionIndex: number;
  sectionName: string;
  metadata: KnowledgeArticleMetadata;
  frontmatterRaw: string;
  body: string;
  startIndex: number;
  endIndex: number;
  fullLength: number;
}

export interface KnowledgeSection {
  index: number;
  title: string;
  description?: string;
  articleIds: string[];
}

export interface MasterKnowledgeDocument {
  header: string;
  version: string;
  lastUpdated: string;
  sections: KnowledgeSection[];
  articles: KnowledgeArticle[];
  rawContent: string;
}

export interface VersionDiffSummary {
  addedLinesCount: number;
  removedLinesCount: number;
  charDiffCount: number;
  oldSnippet?: string;
  newSnippet?: string;
  changeSummary?: string;
}

export interface KnowledgeVersion {
  id: string;
  version_number: number;
  version_tag: string;
  bucket: string;
  file_path: string;
  backup_file_path: string;
  article_id?: string | null;
  article_title?: string | null;
  summary_changes?: string | null;
  diff_summary?: VersionDiffSummary | null;
  author_id?: string | null;
  author_email?: string | null;
  author_name?: string | null;
  content_size_bytes?: number | null;
  webhook_sync_status: "pending" | "synced" | "failed";
  is_restoration: boolean;
  restored_from_version_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface KnowledgeSyncLog {
  id: string;
  bucket: string;
  file_path: string;
  article_id?: string | null;
  article_title?: string | null;
  updated_by?: string | null;
  updated_by_email?: string | null;
  status: "pending" | "syncing" | "synced" | "failed";
  content_size?: number | null;
  webhook_status?: number | null;
  webhook_response?: Record<string, unknown> | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
