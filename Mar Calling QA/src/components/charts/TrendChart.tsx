import { useMemo, useRef, useState } from 'react';

export interface TrendSeries {
  name: string;
  color: string;
  points: { label: string; value: number | null; detail?: string }[];
  dashed?: boolean;
}

/** Line chart with crosshair + tooltip. One y-axis (percent). */
export function TrendChart({ series, height = 240, min, max = 100, reference }: { series: TrendSeries[]; height?: number; min?: number; max?: number; reference?: { value: number; label: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const labels = series[0]?.points.map((p) => p.label) ?? [];
  const values = series.flatMap((s) => s.points.map((p) => p.value).filter((v): v is number => v !== null));
  const lo = min ?? Math.max(0, Math.floor((Math.min(...values, reference?.value ?? 100) - 8) / 10) * 10);
  const W = 640;
  const H = height;
  const pad = { l: 40, r: 18, t: 16, b: 32 };
  const x = (i: number) => pad.l + (labels.length <= 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (labels.length - 1));
  const y = (v: number) => pad.t + ((max - v) * (H - pad.t - pad.b)) / (max - lo || 1);
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let v = lo; v <= max; v += 10) out.push(v);
    return out;
  }, [lo, max]);

  if (!labels.length) return <div className="empty small muted">No data for this period yet.</div>;

  const onMove = (e: React.PointerEvent) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    labels.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    setHover(best);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Trend chart: ${series.map((s) => s.name).join(', ')}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#ECE2D0" strokeWidth="1" strokeDasharray={t === lo ? '' : '3 5'} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#928B97">
              {t}%
            </text>
          </g>
        ))}
        {reference && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(reference.value)} y2={y(reference.value)} stroke="#4F9A64" strokeWidth="1.5" strokeDasharray="6 4" />
            <text x={W - pad.r} y={y(reference.value) + 15} textAnchor="end" fontSize="11" fill="#2F6B43" fontWeight="700">
              {reference.label}
            </text>
          </g>
        )}
        {labels.map((l, i) => (
          <text key={l + i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="12" fill="#5D5765" fontWeight="600">
            {l}
          </text>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#2A2630" strokeWidth="1" opacity="0.35" />}
        {series.map((s) => {
          const pts = s.points.map((p, i) => (p.value === null ? null : [x(i), y(p.value)])).filter(Boolean) as number[][];
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dashed ? '6 5' : undefined} />
              {s.points.map((p, i) =>
                p.value === null ? null : (
                  <circle key={i} cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4.5} fill={s.color} stroke="#FFFDF8" strokeWidth="2" />
                ),
              )}
            </g>
          );
        })}
        {series.length === 1 &&
          series[0].points.map((p, i) =>
            p.value === null || (i !== series[0].points.length - 1 && i !== 0) ? null : (
              <text key={i} x={x(i) + (i === 0 ? 8 : -8)} y={y(p.value) - 12} textAnchor={i === 0 ? 'start' : 'end'} fontSize="12" fontWeight="800" fill="#2A2630">
                {p.value}%
              </text>
            ),
          )}
      </svg>
      {hover !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${(x(hover) / W) * 100}%`,
            top: 4,
            transform: `translateX(${hover > labels.length / 2 ? '-105%' : '5%'})`,
            background: '#2A2630',
            color: '#FBF5EA',
            borderRadius: 12,
            padding: '8px 12px',
            fontSize: 12.5,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 10px 24px -10px rgba(0,0,0,.4)',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 2 }}>{labels[hover]}</div>
          {series.map((s) => {
            const p = s.points[hover];
            return (
              <div key={s.name} className="row" style={{ gap: 6 }}>
                <span style={{ width: 10, height: 3, background: s.color, borderRadius: 2, display: 'inline-block' }} />
                {s.name}: <strong>{p?.value ?? '—'}{p?.value !== null ? '%' : ''}</strong>
                {p?.detail && <span style={{ opacity: 0.7 }}>· {p.detail}</span>}
              </div>
            );
          })}
        </div>
      )}
      {series.length > 1 && (
        <div className="row-wrap small" style={{ marginTop: 6, gap: 16 }}>
          {series.map((s) => (
            <span key={s.name} className="row" style={{ gap: 6 }}>
              <span style={{ width: 16, height: 3, background: s.color, borderRadius: 2, display: 'inline-block' }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, width = 90, height = 28, color = '#2A2630' }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values) - 2;
  const hi = Math.max(...values) + 2;
  const pts = values.map((v, i) => [(i * (width - 6)) / (values.length - 1) + 3, height - 3 - ((v - lo) * (height - 6)) / (hi - lo || 1)]);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}
