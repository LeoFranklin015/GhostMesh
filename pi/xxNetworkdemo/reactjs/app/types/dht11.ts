/**
 * TypeScript types for DHT11 sensor data
 */

export interface DHT11SensorData {
  success: boolean;
  temperature?: string;
  humidity?: string;
  temperatureCelsius?: number;
  humidityPercent?: number;
  pin?: number;
  sensorType?: string;
  timestamp?: string;
  attempt?: number;
  error?: string;
  details?: string;
  note?: string;
}

export interface DHT11SensorConfig {
  pin: number;
  retries?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}
