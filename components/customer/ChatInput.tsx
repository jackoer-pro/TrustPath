"use client";

import { useState, type FormEvent } from "react";
import { SendHorizontal } from "lucide-react";

export function ChatInput({ disabled, onSend }: { disabled: boolean; onSend: (text: string) => void }) {
  const [text, setText] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  }

  return (
    <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-line bg-surface p-3">
      <input
        aria-label="Message TrustPath"
        placeholder="Message TrustPath…"
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        className="h-11 flex-1 rounded-md bg-sunken px-3 text-base placeholder:text-muted disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        aria-label="Send"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-white hover:bg-navy-strong disabled:opacity-50"
      >
        <SendHorizontal className="h-5 w-5" aria-hidden />
      </button>
    </form>
  );
}
