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
  onlineUsersCount: number;
  activeNowCount: number;
  onlineUsers: {
    id: string;
    userName: string;
    lastAction: string;
    status: 'active' | 'away';
  }[];
  mostActiveUsers: {
    userId: string;
    userName: string;
    actionCount: number;
  }[];
  projectDistribution: Record<string, number>;
  storage: {
    dbSizeMB: number;
    storageSizeMB: number;
  };
}
