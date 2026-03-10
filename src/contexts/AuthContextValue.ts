import { createContext } from "react";
import { Session, User } from "@supabase/supabase-js";

export type UserRole = string | null;

export interface Permission {
  resource: string;
  action: string;
}

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole;
  team: string | null;
  permissions: Permission[];
  permissionsLoaded: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  hasPermission: (resource: string, action: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
