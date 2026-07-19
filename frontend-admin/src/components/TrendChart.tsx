"use client";

type Point = { date: string; count: number };

type Props = {
  data: Point[];
  color?: string;
  height?: number;
};

function formatLabel(date: string) {
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

export default function TrendChart({ data, color = "#99b3ad", height = 160 }: Props) {
  const width = 560;
  const padX = 12;
  const padY = 16;
  const max = Math.max(1, ...data.map((d) => d.count));
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const coords = data.map((d, i) => {
    const x = padX + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = padY + innerH - (d.count / max) * innerH;
    return { x, y, ...d };
  });

  const line =
    coords.length === 0
      ? ""
      : coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  const area =
    coords.length === 0
      ? ""
      : `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${(padY + innerH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;

  const labelStep = data.length > 14 ? 5 : data.length > 8 ? 2 : 1;

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="趋势图">
        <line
          x1={padX}
          y1={padY + innerH}
          x2={width - padX}
          y2={padY + innerH}
          stroke="var(--hairline-light)"
          strokeWidth="1"
        />
        {area && <path d={area} fill={color} opacity="0.14" />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {coords.map((c) => (
          <circle key={c.date} cx={c.x} cy={c.y} r="3" fill={color} />
        ))}
      </svg>
      <div className="trend-chart__labels">
        {data.map((d, i) =>
          i % labelStep === 0 || i === data.length - 1 ? (
            <span key={d.date} style={{ left: `${data.length <= 1 ? 50 : (i / (data.length - 1)) * 100}%` }}>
              {formatLabel(d.date)}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
