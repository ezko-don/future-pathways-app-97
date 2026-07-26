import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GuardianContact {
  id: string;
  label: string;
  name: string | null;
  whatsapp: string | null;
  email: string | null;
  is_primary: boolean;
  created_at: string;
}

export function useGuardianContacts(userId: string | undefined) {
  const [contacts, setContacts] = useState<GuardianContact[] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("guardian_contacts")
      .select("id, label, name, whatsapp, email, is_primary, created_at")
      .eq("user_id", userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    setContacts((data as GuardianContact[] | null) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { contacts, loading, refresh };
}

export async function saveContact(
  userId: string,
  input: {
    id?: string;
    label: string;
    name?: string;
    whatsapp?: string;
    email?: string;
    is_primary?: boolean;
  },
) {
  if (input.is_primary) {
    await supabase
      .from("guardian_contacts")
      .update({ is_primary: false })
      .eq("user_id", userId);
  }
  const payload = {
    user_id: userId,
    label: input.label.trim() || "Guardian",
    name: input.name?.trim() || null,
    whatsapp: input.whatsapp?.replace(/[^\d+]/g, "") || null,
    email: input.email?.trim() || null,
    is_primary: !!input.is_primary,
  };
  if (input.id) {
    const { error } = await supabase
      .from("guardian_contacts")
      .update(payload)
      .eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("guardian_contacts").insert(payload);
    if (error) throw error;
  }
}

export async function deleteContact(id: string) {
  const { error } = await supabase.from("guardian_contacts").delete().eq("id", id);
  if (error) throw error;
}
