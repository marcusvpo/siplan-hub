import { createContext } from "react";
import { Session, User } from "@supabase/supabase-js";

export type UserRole = "admin" | "user" | null;

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
