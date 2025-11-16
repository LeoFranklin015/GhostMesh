"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { Leaf, TrendingUp, Award } from "lucide-react"
import { generateSensorTimeSeriesData, getSensorStats } from "@/lib/sensor-data"
import { useMemo } from "react"

export function CarbonSensor() {
  const chartData = useMemo(() => {
    // Generate hourly data but group by 4-hour blocks for bars
    const hourlyData = generateSensorTimeSeriesData("carbon", 24)
    const groupedData = []
    
    for (let i = 0; i < hourlyData.length; i += 4) {
      const block = hourlyData.slice(i, i + 4)
      const sum = block.reduce((acc, curr) => acc + curr.value, 0)
      const startHour = new Date(block[0].timestamp).getHours()
      
      groupedData.push({
        time: `${startHour.toString().padStart(2, '0')}:00`,
        value: Math.round(sum),
        timestamp: block[0].timestamp
      })
    }
    
    return groupedData
  }, [])
  
  const stats = useMemo(() => getSensorStats("carbon"), [])
  const totalOffset = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0)
  }, [chartData])

  return (
    <Card className="bg-[#1B1B1B] border-[#2A2A2A]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Leaf className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-[#EDEDED]">Carbon Credits</CardTitle>
              <CardDescription className="text-[#9A9A9A]">
                CO₂ offset tracking • Last 24h
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#EDEDED]">
              {(totalOffset / 1000).toFixed(1)}
              <span className="text-sm text-[#9A9A9A] ml-1">t</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-green-500">
              <TrendingUp className="h-3 w-3" />
              Total offset
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-[#0E0E0E] rounded-lg">
          <div>
            <div className="text-xs text-[#9A9A9A] mb-1">Avg/Period</div>
            <div className="text-sm font-medium text-[#EDEDED]">
              {Math.round(totalOffset / chartData.length)} kg
            </div>
          </div>
          <div>
            <div className="text-xs text-[#9A9A9A] mb-1">Peak Period</div>
            <div className="text-sm font-medium text-green-400">
              {Math.max(...chartData.map(d => d.value))} kg
            </div>
          </div>
          <div>
            <div className="text-xs text-[#9A9A9A] mb-1">Min Period</div>
            <div className="text-sm font-medium text-[#EDEDED]">
              {Math.min(...chartData.map(d => d.value))} kg
            </div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
            <XAxis 
              dataKey="time"
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
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1B1B1B',
                border: '1px solid #2A2A2A',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              cursor={{ fill: '#10B981', opacity: 0.1 }}
              labelStyle={{ color: '#9A9A9A' }}
              itemStyle={{ color: '#10B981' }}
              formatter={(value: number) => [`${value} kg CO₂`, 'Carbon Offset']}
              labelFormatter={(label) => `Period: ${label}`}
            />
            <Bar 
              dataKey="value" 
              fill="#10B981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
          <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
            <Award className="h-4 w-4 text-green-500 flex-shrink-0" />
            <div className="text-xs">
              <div className="font-medium text-[#EDEDED]">Environmental Impact</div>
              <div className="text-[#9A9A9A] mt-0.5">
                Equivalent to {Math.round(totalOffset / 21)} trees planted • {Math.round(totalOffset / 404)} cars off road for a day
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

