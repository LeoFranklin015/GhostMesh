// Generate sensor data in GhostMesh DB format

export interface SensorDBData {
  type: string
  content: string
  from: string
  timestamp: string
  uuid: number
  source: string
}

// Generate realistic sensor values
function generateSensorValue(type: string): string {
  switch (type) {
    case "humidity":
      // Humidity percentage (30-90%)
      return (30 + Math.random() * 60).toFixed(0)
    case "temp":
      // Temperature in Celsius (15-35°C)
      return (15 + Math.random() * 20).toFixed(1)
    case "carbon":
      // Carbon offset in kg (100-500kg)
      return (100 + Math.random() * 400).toFixed(0)
    case "air":
      // AQI (20-150)
      return (20 + Math.random() * 130).toFixed(0)
    default:
      return "0"
  }
}

// Generate multiple sensor readings
export function generateSensorReadings(
  type: string,
  count: number = 50,
  startTime?: Date
): SensorDBData[] {
  const readings: SensorDBData[] = []
  const baseTime = startTime || new Date()
  
  // Generate readings going back in time (every 30 minutes)
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(baseTime.getTime() - i * 30 * 60 * 1000)
    
    readings.push({
      type,
      content: generateSensorValue(type),
      from: "nR4VB64Dx/xvVHAvGpC30Cnd8WVOXOqD3reTzsh+TIU=",
      timestamp: timestamp.toISOString(),
      uuid: i + 1,
      source: "ghostmesh-server"
    })
  }
  
  return readings.reverse() // Return in chronological order
}

// Generate all sensor types
export function generateAllSensorData(countPerType: number = 50): Record<string, SensorDBData[]> {
  const sensorTypes = ["humidity", "temp", "carbon", "air"]
  const allData: Record<string, SensorDBData[]> = {}
  
  sensorTypes.forEach(type => {
    allData[type] = generateSensorReadings(type, countPerType)
  })
  
  return allData
}

// Generate and format for database insertion
export function generateDBInsertFormat(countPerType: number = 50): string {
  const allData = generateAllSensorData(countPerType)
  const formatted: any[] = []
  
  Object.entries(allData).forEach(([type, readings]) => {
    readings.forEach(reading => {
      formatted.push({
        data: reading
      })
    })
  })
  
  return JSON.stringify(formatted, null, 2)
}

// CLI usage
if (typeof process !== 'undefined' && require.main === module) {
  const count = parseInt(process.argv[2]) || 50
  console.log(generateDBInsertFormat(count))
}

