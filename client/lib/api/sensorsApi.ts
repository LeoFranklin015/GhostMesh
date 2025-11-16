// API client for fetching sensor data from server

export interface SensorEntity {
  entityKey: string
  data: {
    type: string
    content: string
    from: string
    timestamp: string
    uuid: string
    source: string
  }
  encrypted: boolean
  encryptedData: string
  decryptedData: string
}

export interface SensorApiResponse {
  success: boolean
  type: string
  count: number
  totalBeforeFiltering: number
  entities: SensorEntity[]
  filters: {
    minData: null | number
    startTime: null | string
    endTime: null | string
  }
  timestamp: string
}

export interface SensorChartData {
  timestamp: string
  value: number
  hour: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const sensorsApi = {
  /**
   * Fetch sensor data by type
   * @param type - Sensor type: 'temp', 'humidity', 'air', 'carbon'
   */
  async fetchSensorData(type: 'temp' | 'humidity' | 'air' | 'carbon'): Promise<SensorApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${type}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} data: ${response.statusText}`)
      }
      
      const data: SensorApiResponse = await response.json()
      
      if (!data.success) {
        throw new Error(`API returned unsuccessful response for ${type}`)
      }
      
      return data
    } catch (error) {
      console.error(`Error fetching ${type} sensor data:`, error)
      throw error
    }
  },

  /**
   * Transform API response to chart data format
   */
  transformToChartData(entities: SensorEntity[]): SensorChartData[] {
    return entities
      .map((entity) => {
        const timestamp = new Date(entity.data.timestamp)
        const value = parseFloat(entity.decryptedData || entity.data.content)
        
        return {
          timestamp: timestamp.toISOString(),
          value: isNaN(value) ? 0 : value,
          hour: timestamp.getHours()
        }
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  },

  /**
   * Calculate stats from sensor data
   */
  calculateStats(chartData: SensorChartData[]) {
    if (chartData.length === 0) {
      return {
        current: '0',
        change: 0,
        max: '0',
        min: '0',
        avg: '0'
      }
    }

    const values = chartData.map(d => d.value)
    const current = values[values.length - 1]
    const previous = values.length > 1 ? values[values.length - 2] : current
    const change = previous !== 0 ? ((current - previous) / previous * 100) : 0
    
    const max = Math.max(...values)
    const min = Math.min(...values)
    const avg = values.reduce((a, b) => a + b, 0) / values.length

    return {
      current: current.toFixed(1),
      change: parseFloat(change.toFixed(1)),
      max: max.toFixed(1),
      min: min.toFixed(1),
      avg: avg.toFixed(1)
    }
  }
}

