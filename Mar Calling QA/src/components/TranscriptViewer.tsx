import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { TranscriptLine } from '@/types/qa';

export interface TranscriptHandle {
  jumpTo: (lineIndex: number) => void;
}

/** Transcript viewer with click-to-jump highlighting for key moments and evidence. */
export const TranscriptViewer = forwardRef<TranscriptHandle, { lines: TranscriptLine[]; staffName: string }>(function TranscriptViewer({ lines, staffName }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const [hl, setHl] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  useImperativeHandle(ref, () => ({
    jumpTo(lineIndex: number) {
      const el = box.current?.querySelector<HTMLElement>(`[data-line="${lineIndex}"]`);
      // .transcript is position:relative, so offsetTop is already relative to the scroll box.
      if (el && box.current) box.current.scrollTo({ top: Math.max(0, el.offsetTop - 80), behavior: 'smooth' });
      setHl(lineIndex);
      window.setTimeout(() => setHl((h) => (h === lineIndex ? null : h)), 2600);
    },
  }));

  const q = query.trim().toLowerCase();
  return (
    <div className="stack">
      <input className="input" placeholder="Search the transcript…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search transcript" />
      <div className="transcript" ref={box} style={{ position: 'relative' }}>
        {lines.map((l) => {
          const match = q && l.text.toLowerCase().includes(q);
          if (q && !match) return null;
          return (
            <div key={l.index} data-line={l.index} className={`tline tline-${l.speaker} ${hl === l.index ? 'hl' : ''}`}>
              <span className={`ts ${l.timestamp ? '' : 'ts-none'}`} style={{ alignSelf: 'start', textAlign: 'center' }}>
                {l.timestamp ?? '—'}
              </span>
              <div className="tbubble">
                <div className="speaker">
                  {l.speaker === 'agent' ? `🎧 ${staffName || 'Consultant'}` : l.speaker === 'customer' ? '🙂 Customer' : l.speakerLabel} · {l.speakerLabel}
                </div>
                <div style={{ fontSize: 14 }}>{l.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
