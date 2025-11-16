"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip, Legend } from "recharts"
import { Wind, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { generateSensorTimeSeriesData, getSensorStats } from "@/lib/sensor-data"
import { useMemo } from "react"

export function AirQualitySensor() {
  const timeSeriesData = useMemo(() => generateSensorTimeSeriesData("air", 24), [])
  const stats = useMemo(() => getSensorStats("air"), [])
  
  // Calculate AQI category distribution
  const categoryData = useMemo(() => {
    const categories = {
      good: 0,      // 0-50
      moderate: 0,  // 51-100
      unhealthy: 0, // 101-150
      poor: 0       // 151+
    }
    
    timeSeriesData.forEach(data => {
      const value = data.value
      if (value <= 50) categories.good++
      else if (value <= 100) categories.moderate++
      else if (value <= 150) categories.unhealthy++
      else categories.poor++
    })
    
    return [
      { name: 'Good (0-50)', value: categories.good, fill: '#10B981', color: '#10B981' },
      { name: 'Moderate (51-100)', value: categories.moderate, fill: '#F59E0B', color: '#F59E0B' },
      { name: 'Unhealthy (101-150)', value: categories.unhealthy, fill: '#EF4444', color: '#EF4444' },
      { name: 'Poor (151+)', value: categories.poor, fill: '#991B1B', color: '#991B1B' }
    ].filter(item => item.value > 0)
  }, [timeSeriesData])

  const currentAQI = parseFloat(stats.current)
  const getAQIStatus = (aqi: number) => {
    if (aqi <= 50) return { label: 'Good', color: 'text-green-500', bg: 'bg-green-500/20' }
    if (aqi <= 100) return { label: 'Moderate', color: 'text-yellow-500', bg: 'bg-yellow-500/20' }
    if (aqi <= 150) return { label: 'Unhealthy', color: 'text-orange-500', bg: 'bg-orange-500/20' }
    return { label: 'Poor', color: 'text-red-500', bg: 'bg-red-500/20' }
  }

  const aqiStatus = getAQIStatus(currentAQI)

  return (
    <Card className="bg-[#1B1B1B] border-[#2A2A2A]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Wind className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-[#EDEDED]">Air Quality Index</CardTitle>
              <CardDescription className="text-[#9A9A9A]">
                AQI monitoring • Last 24h distribution
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#EDEDED]">
              {stats.current}
              <span className="text-sm text-[#9A9A9A] ml-1">AQI</span>
            </div>
            <div className={`flex items-center gap-1 text-sm ${stats.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
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
        <div className={`mb-4 p-4 rounded-lg ${aqiStatus.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#9A9A9A] mb-1">Current Status</div>
              <div className={`text-lg font-bold ${aqiStatus.color}`}>{aqiStatus.label}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#9A9A9A] mb-1">24h Average</div>
              <div className="text-lg font-medium text-[#EDEDED]">{stats.avg}</div>
            </div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1B1B1B',
                border: '1px solid #2A2A2A',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              itemStyle={{ color: '#EDEDED' }}
              formatter={(value: number, name: string) => [
                `${value} hours (${((value / 24) * 100).toFixed(0)}%)`,
                name
              ]}
            />
            <Pie
              data={categoryData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              strokeWidth={2}
              paddingAngle={2}
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="#1B1B1B" />
              ))}
            </Pie>
            <Legend 
              iconSize={8}
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2 p-2 bg-[#0E0E0E] rounded-lg">
              <AlertCircle className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-medium text-[#EDEDED]">Peak: {stats.max} AQI</div>
                <div className="text-[#9A9A9A] mt-0.5">Highest recorded</div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-[#0E0E0E] rounded-lg">
              <AlertCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-medium text-[#EDEDED]">Best: {stats.min} AQI</div>
                <div className="text-[#9A9A9A] mt-0.5">Lowest recorded</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

