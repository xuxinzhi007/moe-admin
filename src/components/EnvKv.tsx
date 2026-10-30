export type EnvKvRow = { key: string; value: string }

export function EnvKv({ rows }: { rows: EnvKvRow[] }) {
  if (!rows.length) return null
  return (
    <dl className="env-kv">
      {rows.map((row) => (
        <div key={row.key} className="env-kv-row">
          <dt>{row.key}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
