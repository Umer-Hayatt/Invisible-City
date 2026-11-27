"use client";

import { Mail, Phone, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { btn, field } from "@/components/ui";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { api, timeAgo } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import { useMe } from "@/lib/me";

interface Message {
  id: number;
  sender_role: "authority" | "office";
  sender_name: string | null;
  body: string;
  created_at: string;
}
interface Contact {
  name: string;
  phone: string | null;
  email: string | null;
}

/**
 * The conversation about one Issue between a Business and the Authorities of its area, with Call and Email buttons
 * for the other side. It checks for new messages every few seconds while it is open.
 * A Business leaves `officeId` out (the server uses its own); an Authority passes the Business it is talking to.
 */
export default function JobChat({ issueId, officeId }: { issueId: number; officeId?: number }) {
  const { me } = useMe();
  const url = `/api/issues/${issueId}/chat${officeId ? `?office=${officeId}` : ""}`;
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const list = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<{ messages: Message[]; contacts: Contact[] }>(url)
      .then((d) => {
        setMessages(d.messages);
        setContacts(d.contacts);
      })
      .catch((e) => setError(errorText((e as Error).message)));
  }, [url]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError("");
    try {
      await api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      setText("");
      load();
    } catch (err) {
      setError(errorText((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const mine = (m: Message) => m.sender_role === me?.role;

  return (
    <div className="rounded-[8px] border border-line bg-sunken/50 p-4">
      {contacts.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {contacts.map((c) => (
            <div key={c.email ?? c.name} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{c.name}</span>
              {c.phone && (
                <a href={`tel:${c.phone.replace(/\s/g, "")}`} className={`${btn.dark} min-h-9 px-3 py-1.5 text-sm`}>
                  <Phone size={14} aria-hidden /> {t("chat.call")} <span dir="ltr">{c.phone}</span>
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} className={`${btn.ghost} min-h-9 px-3 py-1.5 text-sm`}>
                  <Mail size={14} aria-hidden /> {t("chat.email")}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
      <div ref={list} className="max-h-72 space-y-2 overflow-y-auto pe-1" aria-live="polite">
        {messages === null ? (
          <p className="text-sm text-muted">{t("chat.loading")}</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted">{t("chat.empty")}</p>
        ) : (
          <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <m.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
              className={`flex ${mine(msg) ? "justify-end" : "justify-start"} ${mine(msg) ? "origin-bottom-right" : "origin-bottom-left"}`}
            >
              <div
                className={`max-w-[85%] rounded-[8px] px-3 py-2 text-[15px] ${
                  mine(msg) ? "bg-action text-on-action" : "border border-line bg-surface text-ink"
                }`}
              >
                <div className="whitespace-pre-wrap break-words" dir="auto">
                  {msg.body}
                </div>
                <div className={`mt-1 text-xs ${mine(msg) ? "text-on-action/75" : "text-muted"}`}>
                  {msg.sender_name ?? t(`role.${msg.sender_role}`)} · {timeAgo(msg.created_at)}
                </div>
              </div>
            </m.div>
          ))}
          </AnimatePresence>
        )}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
          className={field}
        />
        <button disabled={busy || !text.trim()} className={btn.primary} aria-label={t("chat.send")}>
          <Send size={16} aria-hidden />
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-danger-ink">{error}</p>}
    </div>
  );
}
