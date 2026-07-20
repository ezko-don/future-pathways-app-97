import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "parent" | "student" | "admin";

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export function useSession(): AuthState {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });

  useEffect(() => {
    // Register listener BEFORE the initial getSession call.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, user: session?.user ?? null, loading: false });
    });

    supabase.auth.getSession().then(({ data }) => {
      setState({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      });
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}

export function useRole(userId: string | undefined): {
  role: AppRole | null;
  loading: boolean;
} {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRole((data?.role as AppRole | undefined) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { role, loading };
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProfile(data ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return profile;
}
