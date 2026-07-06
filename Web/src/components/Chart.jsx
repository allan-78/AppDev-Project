import React from "react";

export function LineChart({ data, color = "#0b1f33", height = 200 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        No data available
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value)) || 1;
  const min = Math.min(...data.map((d) => d.value)) || 0;
  const range = max - min || 1;
  const width = 100;
  const step = width / (data.length - 1 || 1);

  const points = data
    .map((d, i) => {
      const x = i * step;
      const y = height - ((d.value - min) / range) * height * 0.8 - height * 0.1;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Area fill */}
      <polygon points={areaPoints} fill={color} opacity="0.1" />
      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {/* Dots */}
      {data.map((d, i) => {
        const x = i * step;
        const y = height - ((d.value - min) / range) * height * 0.8 - height * 0.1;
        return (
          <circle key={i} cx={x} cy={y} r="3" fill={color} vectorEffect="non-scaling-stroke">
            <title>{`${d.label}: ${d.value}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

export function BarChart({ data, color = "#0b1f33", height = 200 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        No data available
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value)) || 1;
  const barWidth = 100 / data.length;
  const barPadding = barWidth * 0.2;

  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      {data.map((d, i) => {
        const barHeight = (d.value / max) * height * 0.8;
        const x = i * barWidth + barPadding / 2;
        const y = height - barHeight;
        const w = barWidth - barPadding;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={barHeight} fill={color} opacity="0.8" rx="2">
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            <text x={x + w / 2} y={height - 4} fontSize="8" textAnchor="middle" fill="#64748b" vectorEffect="non-scaling-stroke">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DoughnutChart({ data, colors = ["#0b1f33", "#059669", "#94733d", "#ef4444", "#f59e0b"], height = 200 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 40;
  const cx = 50;
  const cy = 50;
  let currentAngle = -90;

  const segments = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArc = angle > 180 ? 1 : 0;

    const pathData = `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;

    return (
      <path key={i} d={pathData} fill={colors[i % colors.length]} stroke="#fff" strokeWidth="0.5">
        <title>{`${d.label}: ${d.value} (${Math.round((d.value / total) * 100)}%)`}</title>
      </path>
    );
  });

  return (
    <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      {segments}
      <circle cx={cx} cy={cy} r="25" fill="#fff" />
      <text x={cx} y={cy} textAnchor="middle" dy="0.35em" fontSize="12" fontWeight="700" fill="#0b1f33">
        {total}
      </text>
    </svg>
  );
}

function polarToCartesian(cx, cy, radius, angle) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad)
  };
}

export function Legend({ data, colors = ["#0b1f33", "#059669", "#94733d", "#ef4444", "#f59e0b"] }) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, justifyContent: "center" }}>
      {data.map((item, i) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: colors[i % colors.length] }} />
          <span style={{ fontSize: 12, color: "#475569" }}>
            {item.label} ({item.value})
          </span>
        </div>
      ))}
    </div>
  );
}