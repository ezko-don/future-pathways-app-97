import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { GuardianContact } from "@/hooks/useGuardianContacts";

interface Props {
  open: boolean;
  onClose: () => void;
  contacts: GuardianContact[] | null;
  mode: "whatsapp" | "email";
  defaultValue?: string;
  onPick: (value: string, contact?: GuardianContact) => void;
}

export function GuardianPicker({ open, onClose, contacts, mode, defaultValue, onPick }: Props) {
  const [manual, setManual] = useState(defaultValue ?? "");
  if (!open) return null;

  const usable = (contacts ?? []).filter((c) =>
    mode === "whatsapp" ? !!c.whatsapp : !!c.email,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">
            {mode === "whatsapp" ? "Send via WhatsApp" : "Send via Email"}
          </h3>
          <Link
            to="/contacts"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={onClose}
          >
            Manage contacts
          </Link>
        </div>

        {usable.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Saved contacts
            </p>
            {usable.map((c) => {
              const value = mode === "whatsapp" ? c.whatsapp! : c.email!;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onPick(value, c);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left text-sm hover:bg-secondary"
                >
                  <span>
                    <span className="font-semibold">{c.name || c.label}</span>{" "}
                    <span className="text-xs text-muted-foreground">· {c.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{value}</span>
                  </span>
                  {c.is_primary && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Primary
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {mode === "whatsapp" ? "Or enter a WhatsApp number" : "Or enter an email"}
          </label>
          <input
            type={mode === "email" ? "email" : "tel"}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder={mode === "whatsapp" ? "2547XXXXXXXX" : "guardian@example.com"}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const v = manual.trim();
              if (!v && mode === "email") return;
              onPick(v);
              onClose();
            }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lift hover:opacity-95"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
