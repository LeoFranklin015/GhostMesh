"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { Cloud, TrendingUp, TrendingDown, Droplets } from "lucide-react"
import { sensorsApi } from "@/lib/api/sensorsApi"
import { getUnitForType } from "@/lib/sensor-data"
import { useEffect, useState } from "react"

export function WeatherSensor() {
  const [chartData, setChartData] = useState<Array<{ timestamp: string; value: number; hour: number }>>([])
  const [stats, setStats] = useState({ current: '0', change: 0, max: '0', min: '0', avg: '0' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const response = await sensorsApi.fetchSensorData('humidity')
        const transformed = sensorsApi.transformToChartData(response.entities)
        setChartData(transformed)
        setStats(sensorsApi.calculateStats(transformed))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load humidity data')
        console.error('Error fetching humidity data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.getHours().toString().padStart(2, '0') + ':00'
  }

  if (loading && chartData.length === 0) {
    return (
      <Card className="bg-[#1B1B1B] border-[#2A2A2A]">
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-[#9A9A9A]">Loading humidity data...</div>
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
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Cloud className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-[#EDEDED]">Humidity Sensor</CardTitle>
              <CardDescription className="text-[#9A9A9A]">
                Weather monitoring • {chartData.length} readings
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#EDEDED]">
              {stats.current}
              <span className="text-sm text-[#9A9A9A] ml-1">{getUnitForType('humidity')}</span>
            </div>
            <div className={`flex items-center gap-1 text-sm ${stats.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
            <div className="text-sm font-medium text-[#EDEDED]">{stats.avg} {getUnitForType('humidity')}</div>
          </div>
          <div>
            <div className="text-xs text-[#9A9A9A] mb-1">Maximum</div>
            <div className="text-sm font-medium text-[#EDEDED]">{stats.max} {getUnitForType('humidity')}</div>
          </div>
          <div>
            <div className="text-xs text-[#9A9A9A] mb-1">Minimum</div>
            <div className="text-sm font-medium text-[#EDEDED]">{stats.min} {getUnitForType('humidity')}</div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
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
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1B1B1B',
                border: '1px solid #2A2A2A',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#9A9A9A' }}
              itemStyle={{ color: '#3B82F6' }}
              formatter={(value: number) => [`${value.toFixed(1)} ${getUnitForType('humidity')}`, 'Humidity']}
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
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#3B82F6"
              fill="url(#humidityGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
          <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg">
            <Droplets className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <div className="text-xs">
              <div className="font-medium text-[#EDEDED]">Humidity Level: {parseFloat(stats.current) > 60 ? 'High' : parseFloat(stats.current) > 40 ? 'Moderate' : 'Low'}</div>
              <div className="text-[#9A9A9A] mt-0.5">
                {parseFloat(stats.current) > 60 ? 'High moisture content detected' : 'Normal atmospheric conditions'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

