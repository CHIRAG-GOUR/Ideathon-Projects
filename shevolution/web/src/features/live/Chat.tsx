'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { ChatMessage } from '@shared/types';
import { api } from '@/lib/api';
import { Card, cn, inputCls } from '@/components/ui';

/** Emergency-only chat between the person and their Safety Circle while the SOS is active. */
export function Chat({ sosId, messages, myUid, quick }: { sosId: string; messages: ChatMessage[]; myUid?: string; quick: string[] }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const send = async (t: string) => {
    if (!t.trim()) return;
    setErr(null);
    try {
      await api('/sos/message', { sosId, text: t.trim() });
      setText('');
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <Card>
      <h3 className="mb-3 font-bold text-ink">Messages</h3>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', m.uid === myUid ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-sm', m.uid === myUid ? 'bg-sos-500 text-white' : 'bg-blush-100 text-ink')}>
                {m.uid !== myUid && <p className="text-[11px] font-bold opacity-70">{m.name}</p>}
                <p>{m.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!messages.length && <p className="text-sm text-ink-muted">No messages yet.</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {quick.map((q) => (
          <button key={q} onClick={() => send(q)} className="rounded-full border border-sos-200 bg-sos-50 px-3 py-1.5 text-sm font-semibold text-sos-700 active:scale-95">
            {q}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" maxLength={300} aria-label="Message" />
        <button className="rounded-2xl bg-sos-500 px-4 font-bold text-white">Send</button>
      </form>
      {err && <p className="mt-2 text-sm text-sos-700">{err}</p>}
    </Card>
  );
}
