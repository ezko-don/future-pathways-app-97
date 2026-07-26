import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/hooks/useAuth";
import {
  useGuardianContacts,
  saveContact,
  deleteContact,
  type GuardianContact,
} from "@/hooks/useGuardianContacts";

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({
    meta: [
      { title: "Guardian Contacts · KaziFuture" },
      { name: "description", content: "Save parent and guardian contacts for quick sharing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContactsPage,
});

interface FormState {
  id?: string;
  label: string;
  name: string;
  whatsapp: string;
  email: string;
  is_primary: boolean;
}

const EMPTY: FormState = {
  label: "Guardian",
  name: "",
  whatsapp: "",
  email: "",
  is_primary: false,
};

function ContactsPage() {
  const { user } = useSession();
  const { contacts, loading, refresh } = useGuardianContacts(user?.id);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function edit(c: GuardianContact) {
    setForm({
      id: c.id,
      label: c.label,
      name: c.name ?? "",
      whatsapp: c.whatsapp ?? "",
      email: c.email ?? "",
      is_primary: c.is_primary,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.whatsapp.trim() && !form.email.trim()) {
      setError("Add a WhatsApp number or an email (or both).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveContact(user.id, form);
      setForm(EMPTY);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this contact?")) return;
    await deleteContact(id);
    await refresh();
  }

  return (
    <div className="min-h-screen bg-background bg-grain">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="text-sm font-semibold hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-clay">
          Contactbook
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-balance">
          Your parents & guardians
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Save WhatsApp numbers and emails once. Reuse them one-tap when sharing quiz
          results or requesting reports.
        </p>

        <section className="mt-8 grid gap-8 md:grid-cols-[1fr_1fr]">
          <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <h2 className="font-display text-lg font-bold">
              {form.id ? "Edit contact" : "Add a contact"}
            </h2>

            <div className="mt-4 space-y-3">
              <Field
                label="Label"
                value={form.label}
                onChange={(v) => setForm({ ...form, label: v })}
                placeholder="Mum, Dad, Uncle James…"
              />
              <Field
                label="Name (optional)"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />
              <Field
                label="WhatsApp number"
                value={form.whatsapp}
                onChange={(v) => setForm({ ...form, whatsapp: v })}
                placeholder="2547XXXXXXXX"
                type="tel"
              />
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="guardian@example.com"
                type="email"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                />
                Set as primary contact
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lift hover:opacity-95 disabled:opacity-50"
              >
                {saving ? "Saving…" : form.id ? "Save changes" : "Add contact"}
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm(EMPTY)}
                  className="rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div>
            <h2 className="font-display text-lg font-bold">Saved</h2>
            <div className="mt-4 space-y-3">
              {loading && (
                <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
              )}
              {!loading && contacts && contacts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No contacts yet. Add your parent or guardian to speed up sharing.
                </div>
              )}
              {contacts?.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-display text-base font-bold">
                          {c.name || c.label}
                        </p>
                        {c.is_primary && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                      {c.whatsapp && (
                        <p className="mt-2 text-sm">💬 {c.whatsapp}</p>
                      )}
                      {c.email && <p className="text-sm">✉ {c.email}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => edit(c)}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold hover:bg-secondary"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}
