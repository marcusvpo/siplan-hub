import React, { useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthContext, UserRole } from "./AuthContextValue";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Use ref to track loading state for the timeout callback
  const loadingRef = React.useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Get initial session with timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: Session | null }, error: Error }>((resolve) => 
            setTimeout(() => resolve({ data: { session: null }, error: new Error("Auth timeout") }), 5000)
        );

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (error) {
            // If timeout or specific error, clear session to prevent infinite loop
            if (error.message === "Auth timeout") {
                console.warn("Session fetch timed out. Retrying once...");
                
                // Retry once with longer timeout
                const retrySessionPromise = supabase.auth.getSession();
                const retryTimeoutPromise = new Promise<{ data: { session: Session | null }, error: Error }>((resolve) => 
                    setTimeout(() => resolve({ data: { session: null }, error: new Error("Auth timeout retry") }), 8000)
                );
                
                const { data: { session: retrySession }, error: retryError } = await Promise.race([retrySessionPromise, retryTimeoutPromise]);

                if (!retryError && retrySession) {
                     if (mounted) {
                        setSession(retrySession);
                        setUser(retrySession.user ?? null);
                        // Don't await this, let it run in background to not block UI
                        fetchUserRole(retrySession.user.id);
                        setLoading(false); 
                     }
                     return;
                }

                console.warn("Retry failed or timed out. Clearing session.");
                
                // Force sign out without waiting to prevent blocking
                supabase.auth.signOut().catch(console.error);
                
                // Manually clear ALL Supabase keys from local storage
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-')) {
                        localStorage.removeItem(key);
                    }
                });

                if (mounted) {
                    setSession(null);
                    setUser(null);
                    setRole(null);
                    setLoading(false);
                }
                return;
            }
            
            console.error("Error getting session:", error);
            if (mounted) setLoading(false);
            return;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Don't await role fetch to prevent blocking initial load
            fetchUserRole(session.user.id);
            setLoading(false);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
           // Don't await role fetch here either
           fetchUserRole(session.user.id);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    });

    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
        if (mounted && loadingRef.current) {
            console.warn("Auth loading timed out, forcing completion.");
            setLoading(false);
        }
    }, 10000); // 10 seconds timeout

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Role fetch timeout")), 6000)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchPromise = (supabase as any)
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      // Race the fetch against the timeout
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        console.error("Error fetching role:", error);
        setRole("user"); 
      } else {
        setRole(data?.role as UserRole);
      }
    } catch (error) {
        // If timeout, try one more time
        if (error instanceof Error && error.message === "Role fetch timeout") {
             console.warn("Role fetch timed out. Retrying once...");
             try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error: retryError } = await (supabase as any)
                    .from("profiles")
                    .select("role")
                    .eq("id", userId)
                    .single();
                
                if (retryError) {
                    console.error("Error fetching role (retry):", retryError);
                    setRole("user");
                } else {
                    setRole(data?.role as UserRole);
                }
             } catch (retryErr) {
                 console.error("Error in fetchUserRole (retry):", retryErr);
                 setRole("user");
             }
        } else {
            console.error("Error in fetchUserRole:", error);
            setRole("user");
        }
    } finally {
      // Ensure loading is set to false regardless of outcome
      // We check if loading is still true to avoid unnecessary state updates
      if (loadingRef.current) {
          setLoading(false);
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message,
      });
    }
  };

  const value = {
    session,
    user,
    role,
    loading,
    signOut,
    isAdmin: role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
