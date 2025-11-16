"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { WeatherSensor } from "@/components/sensors/weather-sensor"
import { TemperatureSensor } from "@/components/sensors/temperature-sensor"
import { CarbonSensor } from "@/components/sensors/carbon-sensor"
import { AirQualitySensor } from "@/components/sensors/air-quality-sensor"

export default function DePINDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[#9A9A9A] mt-2">
            Real-time monitoring of GhostMesh sensor network
          </p>
        </div>

        {/* First Row - Weather (Area Chart) and Temperature (Line Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeatherSensor />
          <TemperatureSensor />
        </div>

        {/* Second Row - Carbon Credits (Bar Chart) and Air Quality (Pie Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CarbonSensor />
          <AirQualitySensor />
        </div>
      </div>
    </DashboardLayout>
  )
}
