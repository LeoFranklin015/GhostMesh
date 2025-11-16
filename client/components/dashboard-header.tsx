"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

export function DashboardHeader() {
  return (
    <header className="flex items-center justify-between border-b border-[#2A2A2A] bg-[#1B1B1B] px-6 py-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-[#EDEDED]">GhostMesh Dashboard</h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
          ● Live
        </div>
      </div>
    </header>
  )
}
