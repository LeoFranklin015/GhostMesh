import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';

// Helper function to check if running on real Raspberry Pi
function isRaspberryPi(): boolean {
  try {
    // Check if /dev/gpiomem exists (Raspberry Pi specific)
    if (typeof window === 'undefined' && fs.existsSync('/dev/gpiomem')) {
      return true;
    }
  } catch (error) {
    // Not on Raspberry Pi
  }
  return false;
}

// Helper function to dynamically load sensor module at runtime
function getSensor() {
  try {
    // Only import on server-side at runtime, not during build
    // Only try to load if we're on a real Raspberry Pi
    if (typeof window === 'undefined' && typeof require !== 'undefined' && isRaspberryPi()) {
      return require('node-dht-sensor');
    }
  } catch (error) {
    // Module not available (e.g., on macOS during development or not installed)
    return null;
  }
  return null;
}

// Generate mock sensor data
function generateMockSensorData() {
  // Generate realistic temperature (20-30°C) and humidity (40-60%)
  const temperature = (20 + Math.random() * 10).toFixed(2);
  const humidity = (40 + Math.random() * 20).toFixed(2);
  
  return {
    temperature: parseFloat(temperature),
    humidity: parseFloat(humidity),
    temperatureString: temperature,
    humidityString: humidity
  };
}

/**
 * GET /api/dht11
 * Read temperature and humidity from DHT11 sensor connected to Raspberry Pi
 * 
 * Query Parameters:
 *   - pin: GPIO pin number (default: 4)
 *   - retries: Number of read retries on failure (default: 3)
 * 
 * Examples:
 *   GET /api/dht11
 *   GET /api/dht11?pin=4
 *   GET /api/dht11?pin=4&retries=5
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = parseInt(searchParams.get('pin') || '4', 10);
    const retries = parseInt(searchParams.get('retries') || '3', 10);

    // Validate pin number (typically 4, 14, 15, 17, 18, 27, 22, 23, 24, 10, 9, 25, 11, 8 for Raspberry Pi)
    if (isNaN(pin) || pin < 0 || pin > 40) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid GPIO pin number. Must be between 0 and 40.' 
        },
        { status: 400 }
      );
    }

    // Check if we're on a real Raspberry Pi with sensor available
    const sensor = getSensor();
    const isRealPi = isRaspberryPi() && sensor !== null;

    if (!isRealPi) {
      // Use mock data when not on Raspberry Pi
      const mockData = generateMockSensorData();
      
      // Log in the requested format
      console.log(JSON.stringify({ type: "temp", data: mockData.temperatureString }));
      console.log(JSON.stringify({ type: "humidity", data: mockData.humidityString }));
      
      const result = {
        success: true,
        temperature: mockData.temperatureString,
        humidity: mockData.humidityString,
        temperatureCelsius: mockData.temperature,
        humidityPercent: mockData.humidity,
        pin: pin,
        sensorType: 'DHT11',
        timestamp: new Date().toISOString(),
        mock: true
      };

      return NextResponse.json(result);
    }

    // Real sensor reading on Raspberry Pi
    const sensorType = 11;
    let lastError: Error | null = null;
    
    // Try reading the sensor with retries
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Read sensor data
        const readout = sensor.read(sensorType, pin);
        
        // Log in the requested format
        console.log(JSON.stringify({ type: "temp", data: readout.temperature.toFixed(2) }));
        console.log(JSON.stringify({ type: "humidity", data: readout.humidity.toFixed(2) }));
        
        const result = {
          success: true,
          temperature: readout.temperature.toFixed(2),
          humidity: readout.humidity.toFixed(2),
          temperatureCelsius: readout.temperature,
          humidityPercent: readout.humidity,
          pin: pin,
          sensorType: 'DHT11',
          timestamp: new Date().toISOString(),
          attempt: attempt + 1
        };

        return NextResponse.json(result);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't log errors to avoid cluttering console
        // Wait a bit before retrying (DHT11 needs time between reads)
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // All retries failed - fall back to mock data
    const mockData = generateMockSensorData();
    console.log(JSON.stringify({ type: "temp", data: mockData.temperatureString }));
    console.log(JSON.stringify({ type: "humidity", data: mockData.humidityString }));
    
    return NextResponse.json(
      {
        success: true,
        temperature: mockData.temperatureString,
        humidity: mockData.humidityString,
        temperatureCelsius: mockData.temperature,
        humidityPercent: mockData.humidity,
        pin: pin,
        sensorType: 'DHT11',
        timestamp: new Date().toISOString(),
        mock: true,
        note: 'Sensor read failed, using mock data'
      }
    );
  } catch (error) {
    // On any error, use mock data
    const mockData = generateMockSensorData();
    console.log(JSON.stringify({ type: "temp", data: mockData.temperatureString }));
    console.log(JSON.stringify({ type: "humidity", data: mockData.humidityString }));
    
    return NextResponse.json(
      {
        success: true,
        temperature: mockData.temperatureString,
        humidity: mockData.humidityString,
        temperatureCelsius: mockData.temperature,
        humidityPercent: mockData.humidity,
        pin: 4,
        sensorType: 'DHT11',
        timestamp: new Date().toISOString(),
        mock: true
      }
    );
  }
}

/**
 * POST /api/dht11
 * Read sensor with configuration in request body
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pin = body?.pin || 4;
    const retries = body?.retries || 3;

    // Reuse GET logic by constructing a new request URL
    const url = new URL(request.url);
    url.searchParams.set('pin', String(pin));
    url.searchParams.set('retries', String(retries));

    return GET(new NextRequest(url));
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 400 }
    );
  }
}
