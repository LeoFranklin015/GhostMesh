"use client"

import { Cloud, Thermometer, Leaf, Wind } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const sensorTypes = [
  {
    title: "Weather",
    icon: Cloud,
    color: "#3B82F6",
    count: 145,
  },
  {
    title: "Temperature",
    icon: Thermometer,
    color: "#EF4444",
    count: 203,
  },
  {
    title: "Carbon Credits",
    icon: Leaf,
    color: "#10B981",
    count: 89,
  },
  {
    title: "Air Quality",
    icon: Wind,
    color: "#8B5CF6",
    count: 167,
  },
]

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-[#2A2A2A] bg-[#1B1B1B]">
      <SidebarHeader className="p-6">
        <div className="flex items-center justify-center w-full h-16 bg-[#FF6B00] rounded-lg">
          <span className="text-black font-bold text-lg">DePIN Sensors</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[#9A9A9A] text-xs uppercase px-3 mb-2">
            Sensor Types
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sensorTypes.map((sensor) => (
                <SidebarMenuItem key={sensor.title}>
                  <div className="flex items-center justify-between px-3 py-3 hover:bg-[#FF6B00]/10 rounded-lg transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg" 
                        style={{ backgroundColor: `${sensor.color}20` }}
                      >
                        <sensor.icon 
                          className="h-4 w-4" 
                          style={{ color: sensor.color }}
                        />
                      </div>
                      <span className="text-sm font-medium">{sensor.title}</span>
                    </div>
                    <span className="text-xs text-[#9A9A9A] bg-[#2A2A2A] px-2 py-1 rounded">
                      {sensor.count}
                    </span>
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-[#9A9A9A] text-xs uppercase px-3 mb-2">
            Network Stats
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#9A9A9A]">Active Sensors</span>
                <span className="text-white font-medium">604</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9A9A9A]">Today's Readings</span>
                <span className="text-white font-medium">12,458</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9A9A9A]">Network Status</span>
                <span className="text-green-500 font-medium">●  Online</span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6">
        <div className="text-xs text-[#9A9A9A] text-center">
          GhostMesh Network
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
