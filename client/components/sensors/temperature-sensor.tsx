"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Thermometer, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { sensorsApi } from "@/lib/api/sensorsApi"
import { getUnitForType } from "@/lib/sensor-data"
import { useEffect, useState, useMemo } from "react"

export function TemperatureSensor() {
  const [chartData, setChartData] = useState<Array<{ timestamp: string; value: number; hour: number }>>([])
  const [stats, setStats] = useState({ current: '0', change: 0, max: '0', min: '0', avg: '0' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const response = await sensorsApi.fetchSensorData('temp')
        const transformed = sensorsApi.transformToChartData(response.entities)
        setChartData(transformed)
        setStats(sensorsApi.calculateStats(transformed))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load temperature data')
        console.error('Error fetching temperature data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const avgTemp = parseFloat(stats.avg)

  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.getHours().toString().padStart(2, '0') + ':00'
  }

  if (loading && chartData.length === 0) {
    return (
      <Card className="bg-[#1B1B1B] border-[#2A2A2A]">
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-[#9A9A9A]">Loading temperature data...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-[#1B1B1B] border-[#2A2A2A]">
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#1B1B1B] border-[#2A2A2A]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Thermometer className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-[#EDEDED]">Temperature Sensor</CardTitle>
              <CardDescription className="text-[#9A9A9A]">
                Ambient temperature • {chartData.length} readings
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#EDEDED]">
              {stats.current}
              <span className="text-sm text-[#9A9A9A] ml-1">{getUnitForType('temp')}</span>
            </div>
            <div className={`flex items-center gap-1 text-sm ${stats.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
              {stats.change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(stats.change)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-[#0E0E0E] rounded-lg">
          <div>
            <div className="text-xs text-[#9A9A9A] mb-1">Average</div>
            <div className="text-sm font-medium text-[#EDEDED]">{stats.avg} {getUnitForType('temp')}</div>
          </div>
          <div>
            <div className="text-xs text-[#9A9A9A] mb-1">Peak</div>
            <div className="text-sm font-medium text-red-400">{stats.max} {getUnitForType('temp')}</div>
          </div>
          <div>
            <div className="text-xs text-[#9A9A9A] mb-1">Low</div>
            <div className="text-sm font-medium text-blue-400">{stats.min} {getUnitForType('temp')}</div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatXAxis}
              stroke="#9A9A9A"
              style={{ fontSize: '12px' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#9A9A9A"
              style={{ fontSize: '12px' }}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 2', 'dataMax + 2']}
            />
            <ReferenceLine 
              y={avgTemp} 
              stroke="#9A9A9A" 
              strokeDasharray="3 3" 
              label={{ value: 'Avg', position: 'right', fill: '#9A9A9A', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1B1B1B',
                border: '1px solid #2A2A2A',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#9A9A9A' }}
              itemStyle={{ color: '#EF4444' }}
              formatter={(value: number) => [`${value.toFixed(1)} ${getUnitForType('temp')}`, 'Temperature']}
              labelFormatter={(label) => {
                const date = new Date(label)
                return date.toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#EF4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#EF4444' }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
          <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
            <div className="text-xs">
              <div className="font-medium text-[#EDEDED]">Status: {parseFloat(stats.current) > 30 ? 'Hot' : parseFloat(stats.current) > 20 ? 'Normal' : 'Cool'}</div>
              <div className="text-[#9A9A9A] mt-0.5">
                Range: {stats.min} - {stats.max} {getUnitForType('temp')} • Variation: {(parseFloat(stats.max) - parseFloat(stats.min)).toFixed(1)} {getUnitForType('temp')}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

