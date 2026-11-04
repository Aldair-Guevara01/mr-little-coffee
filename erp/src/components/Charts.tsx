export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const maximum = Math.max(1, ...data.map((item) => item.value));
  return <div className="barChart" role="img" aria-label={data.map((item) => `${item.label}: ${item.value}`).join(", ")}>{data.map((item) => <div key={item.label}><span style={{ height: `${item.value / maximum * 125}px` }}><b>{item.value}</b></span><small>{item.label}</small></div>)}</div>;
}
export function Donut({ value, label }: { value: number; label: string }) {
  return <div className="donut" role="img" aria-label={`${label}: ${value}%`} style={{ "--value": `${value * 3.6}deg` } as React.CSSProperties}><div><strong>{value}%</strong><small>{label}</small></div></div>;
}