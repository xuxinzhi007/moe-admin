import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { asArray } from '../lib/apiRecord'

type DayPoint = { date: string; count: number }

type Props = {
  title: string
  data: DayPoint[]
  color?: string
  height?: number
}

export function DayTrendChart({
  title,
  data,
  color = '#7f7fd5',
  height = 220,
}: Props) {
  const chartData = asArray<DayPoint>(data).map((d) => ({
    ...d,
    label: d.date.slice(5),
  }))

  return (
    <div className="chart-card">
      <h3 className="chart-card-title">{title}</h3>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf2" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#666' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#666' }} width={36} />
            <Tooltip
              formatter={(value: number) => [value, '数量']}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { date?: string } | undefined
                return row?.date ?? ''
              }}
            />
            <Bar dataKey="count" fill={color} radius={[6, 6, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
