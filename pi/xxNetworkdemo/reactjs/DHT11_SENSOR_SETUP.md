# DHT11 Sensor Integration Guide

This project includes integration for reading DHT11 temperature and humidity sensor data from a Raspberry Pi.

## Hardware Setup

### Wiring the DHT11 Sensor

Connect your DHT11 sensor to the Raspberry Pi as follows:

```
DHT11 Pin 1 (VCC)  →  Raspberry Pi 3.3V (Pin 1)
DHT11 Pin 2 (DATA) →  Raspberry Pi GPIO 4 (Pin 7) [or any GPIO pin]
DHT11 Pin 3 (NC)   →  Not connected
DHT11 Pin 4 (GND)  →  Raspberry Pi GND (Pin 6)

Note: It's recommended to use a 4.7kΩ or 10kΩ pull-up resistor 
between VCC and DATA pin for stable readings.
```

### GPIO Pin Configuration

By default, the sensor is configured to use **GPIO pin 4**. You can change this by:

1. Updating the `pin` prop in the `DHT11Sensor` component in `app/page.tsx`
2. Or passing a different pin number via the API: `/api/dht11?pin=YOUR_PIN`

Common GPIO pins used: 4, 14, 15, 17, 18, 22, 23, 24, 25

## Software Requirements

The following packages are already installed:

- `node-dht-sensor` - For reading sensor data from GPIO
- `@types/node-dht-sensor` - TypeScript definitions

## API Endpoints

### GET /api/dht11

Read temperature and humidity from the DHT11 sensor.

**Query Parameters:**
- `pin` (optional): GPIO pin number (default: 4)
- `retries` (optional): Number of read retries on failure (default: 3)

**Examples:**
```bash
# Default pin (4)
curl http://localhost:3000/api/dht11

# Custom pin and retries
curl http://localhost:3000/api/dht11?pin=18&retries=5
```

**Response:**
```json
{
  "success": true,
  "temperature": "23.50",
  "humidity": "45.20",
  "temperatureCelsius": 23.5,
  "humidityPercent": 45.2,
  "pin": 4,
  "sensorType": "DHT11",
  "timestamp": "2025-11-16T12:00:00.000Z",
  "attempt": 1
}
```

### POST /api/dht11

Read sensor with configuration in request body.

**Request Body:**
```json
{
  "pin": 4,
  "retries": 3
}
```

## React Component

The `DHT11Sensor` component displays real-time sensor readings.

**Usage:**
```tsx
import DHT11Sensor from "./components/DHT11Sensor";

<DHT11Sensor 
  pin={4}                    // GPIO pin number
  autoRefresh={true}         // Enable auto-refresh
  refreshInterval={5000}     // Refresh every 5 seconds
  retries={3}                // Number of read retries
/>
```

**Features:**
- Real-time temperature display (Celsius and Fahrenheit)
- Humidity percentage display
- Auto-refresh with configurable interval
- Manual refresh button
- Error handling and display
- Loading states
- Retry mechanism for unreliable reads

## Troubleshooting

### Error: "Cannot find module node-dht-sensor"

This usually means you're running the code on a non-Raspberry Pi system (e.g., macOS during development). The sensor library only works on Raspberry Pi.

**Solution:** The API will return an appropriate error message. The sensor will only work when deployed on a Raspberry Pi.

### Error: "Failed to read DHT11 sensor"

**Possible causes:**
1. Incorrect wiring - Check all connections
2. Wrong GPIO pin number - Verify the pin configuration
3. Missing pull-up resistor - Add a 4.7kΩ or 10kΩ resistor
4. Sensor needs time between reads - The API automatically retries

**Solutions:**
- Increase the `retries` parameter
- Check wiring connections
- Add a pull-up resistor if not present
- Wait a few seconds between rapid reads

### Sensor reads are inaccurate

- Ensure proper wiring and pull-up resistor
- Avoid long wires between sensor and Pi
- Check power supply stability
- DHT11 has ±2°C accuracy and ±5% humidity accuracy

## Notes

- The DHT11 sensor requires time between reads (minimum ~2 seconds)
- The API automatically implements retries for better reliability
- Sensor readings are cached in the frontend component
- Auto-refresh can be toggled on/off via the UI
- The sensor component is included on the main page but can be moved or configured as needed

## Files Created

- `app/api/dht11/route.ts` - API endpoint for reading sensor data
- `app/components/DHT11Sensor.tsx` - React component for displaying sensor data
- `app/types/dht11.ts` - TypeScript type definitions
- `app/page.tsx` - Updated to include the sensor component

