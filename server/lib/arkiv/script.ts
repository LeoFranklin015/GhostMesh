/**
 * Script to insert sensor data into Arkiv with encryption
 * Usage: ts-node server/lib/arkiv/script.ts
 */

import { storeMessageToArkiv, initializeArkivClient } from './index'
import * as fs from 'fs'
import * as path from 'path'

interface SensorDataEntry {
  data: {
    type: string
    content: string
    from: string
    timestamp: string
    uuid: number
    source: string
  }
}

async function insertSensorData() {
  console.log('🚀 Starting sensor data insertion into Arkiv...\n')
  
  // Initialize Arkiv client first
  console.log('📡 Initializing Arkiv client...')
  const initialized = await initializeArkivClient()
  
  if (!initialized) {
    console.error('❌ Failed to initialize Arkiv client')
    console.error('💡 Make sure ARKIV_PRIVATE_KEY or NEXT_PUBLIC_ARKIV_PRIVATE_KEY is set in your .env.local file')
    process.exit(1)
  }
  
  console.log('✅ Arkiv client initialized successfully\n')
  
  // Read sensor data from JSON file
  const jsonPath = path.join(process.cwd(), '..', 'sample-sensor-data.json')
  console.log('📖 Reading sensor data from:', jsonPath)
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath)
    process.exit(1)
  }
  
  const rawData = fs.readFileSync(jsonPath, 'utf-8')
  const sensorData: SensorDataEntry[] = JSON.parse(rawData)
  
  console.log(`✅ Loaded ${sensorData.length} sensor readings\n`)
  
  // Track statistics
  const stats = {
    total: sensorData.length,
    successful: 0,
    failed: 0,
    byType: {} as Record<string, number>
  }
  
  // Insert each sensor reading
  console.log('💾 Starting insertion process...\n')
  
  for (let i = 0; i < sensorData.length; i++) {
    const entry = sensorData[i]
    const { type, content, from, timestamp, uuid, source } = entry.data
    
    // Track count by type
    if (!stats.byType[type]) {
      stats.byType[type] = 0
    }
    
    console.log(`[${i + 1}/${sensorData.length}] Processing ${type} reading...`)
    console.log(`  ├─ UUID: ${uuid}`)
    console.log(`  ├─ Content: ${content}`)
    console.log(`  ├─ Timestamp: ${timestamp}`)
    
    try {
      // Prepare data in the format expected by storeMessageToArkiv
      // The content should be JSON string with type and data fields
      const messageContent = JSON.stringify({
        type: type,
        data: content  // This will be encrypted
      })
      
      const result = await storeMessageToArkiv({
        content: messageContent,
        from: from,
        timestamp: timestamp,
        uuid: String(uuid)
      })
      
      if (result.success) {
        stats.successful++
        stats.byType[type]++
        console.log(`  ✅ Stored successfully!`)
        console.log(`  └─ Entity Key: ${result.entityKey}\n`)
      } else {
        stats.failed++
        console.error(`  ❌ Failed to store: ${result.error}\n`)
      }
      
      // Add a small delay to avoid overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error: any) {
      stats.failed++
      console.error(`  ❌ Error: ${error.message}\n`)
    }
  }
  
  // Print summary
  console.log('=' .repeat(60))
  console.log('📊 INSERTION SUMMARY')
  console.log('=' .repeat(60))
  console.log(`Total readings: ${stats.total}`)
  console.log(`Successfully inserted: ${stats.successful} ✅`)
  console.log(`Failed: ${stats.failed} ❌`)
  console.log(`Success rate: ${((stats.successful / stats.total) * 100).toFixed(1)}%`)
  console.log('\nBreakdown by sensor type:')
  Object.entries(stats.byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} readings`)
  })
  console.log('=' .repeat(60))
  
  if (stats.failed > 0) {
    console.log('\n⚠️  Some insertions failed. Check the logs above for details.')
    process.exit(1)
  } else {
    console.log('\n🎉 All sensor data inserted successfully!')
    process.exit(0)
  }
}

// Run the script
insertSensorData().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

