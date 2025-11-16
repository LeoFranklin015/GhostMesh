// Mock sensor data generator based on GhostMesh API format

export interface SensorEntity {
  entityKey: string
  data: {
    type: string
    content: string
    from: string
    timestamp: string
    uuid: number
    source: string
  }
  encrypted: boolean
  encryptedData: string
  decryptedData: string
}

export interface SensorDataResponse {
  success: boolean
  type: string
  count: number
  totalBeforeFiltering: number
  entities: SensorEntity[]
  filters: {
    minContentLength: number
    startTime: string
    endTime: string
  }
  timestamp: string
}

// Generate time series data for charts
export function generateSensorTimeSeriesData(type: string, hours: number = 24) {
  const data = []
  const now = new Date()
  
  for (let i = hours - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
    let value: number
    
    // Generate realistic values based on sensor type
    switch (type) {
      case "humidity":
        // Humidity percentage (30-90%)
        value = 50 + Math.sin(i / 4) * 20 + Math.random() * 10
        break
      case "temp":
        // Temperature in Celsius (15-35°C)
        value = 22 + Math.sin(i / 3) * 8 + Math.random() * 5
        break
      case "carbon":
        // Carbon offset in kg (100-500kg)
        value = 250 + Math.sin(i / 6) * 100 + Math.random() * 50
        break
      case "air":
        // AQI (0-200)
        value = 75 + Math.sin(i / 5) * 40 + Math.random() * 20
        break
      default:
        value = Math.random() * 100
    }
    
    data.push({
      timestamp: timestamp.toISOString(),
      value: Math.round(value * 10) / 10,
      hour: timestamp.getHours()
    })
  }
  
  return data
}

// Generate mock sensor entities
export function generateSensorEntities(type: string, count: number = 10): SensorEntity[] {
  const entities: SensorEntity[] = []
  const now = new Date()
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - i * 10 * 60 * 1000) // Every 10 minutes
    let content: string
    
    switch (type) {
      case "humidity":
        content = (50 + Math.random() * 40).toFixed(0)
        break
      case "temp":
        content = (20 + Math.random() * 15).toFixed(1)
        break
      case "carbon":
        content = (200 + Math.random() * 300).toFixed(0)
        break
      case "air":
        content = (50 + Math.random() * 100).toFixed(0)
        break
      default:
        content = (Math.random() * 100).toFixed(0)
    }
    
    entities.push({
      entityKey: `0x${Math.random().toString(16).substr(2, 64)}`,
      data: {
        type,
        content,
        from: "nR4VB64Dx/xvVHAvGpC30Cnd8WVOXOqD3reTzsh+TIU=",
        timestamp: timestamp.toISOString(),
        uuid: i + 1,
        source: "ghostmesh-server"
      },
      encrypted: true,
      encryptedData: Math.random().toString(36).substring(2, 15),
      decryptedData: content
    })
  }
  
  return entities
}

// Get sensor stats
export function getSensorStats(type: string) {
  const data = generateSensorTimeSeriesData(type, 24)
  const values = data.map(d => d.value)
  
  const current = values[values.length - 1]
  const previous = values[values.length - 2]
  const change = ((current - previous) / previous * 100).toFixed(1)
  
  const max = Math.max(...values)
  const min = Math.min(...values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  
  return {
    current: current.toFixed(1),
    change: parseFloat(change),
    max: max.toFixed(1),
    min: min.toFixed(1),
    avg: avg.toFixed(1),
    unit: getUnitForType(type)
  }
}

// Get unit for sensor type
export function getUnitForType(type: string): string {
  switch (type) {
    case "humidity":
      return "%"
    case "temp":
      return "°C"
    case "carbon":
      return "kg CO₂"
    case "air":
      return "AQI"
    default:
      return ""
  }
}

// Get color for sensor type
export function getColorForType(type: string): string {
  switch (type) {
    case "humidity":
      return "#3B82F6"
    case "temp":
      return "#EF4444"
    case "carbon":
      return "#10B981"
    case "air":
      return "#8B5CF6"
    default:
      return "#FF6B00"
  }
}

