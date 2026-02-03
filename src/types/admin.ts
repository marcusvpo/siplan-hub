export interface Team {
  id: string;
  label: string;
  value: string;
  description?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

export interface AdminStats {
  totalUsers: number;
  activeProjects: number;
}
