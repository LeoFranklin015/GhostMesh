'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Card, CardBody, CardHeader } from '@nextui-org/react';
import { DHT11SensorData } from '../types/dht11';

interface DHT11SensorProps {
  pin?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  retries?: number;
}

export default function DHT11Sensor({
  pin = 4,
  autoRefresh = true,
  refreshInterval = 5000, // 5 seconds default
  retries = 3
}: DHT11SensorProps) {
  const [sensorData, setSensorData] = useState<DHT11SensorData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(autoRefresh);

  // Function to fetch sensor data
  const fetchSensorData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dht11?pin=${pin}&retries=${retries}`);
      const data: DHT11SensorData = await response.json();

      if (data.success) {
        setSensorData(data);
        setError(null);
      } else {
        // Only show error if it's not a demo/mock scenario
        if (!data.demo) {
          setError(data.error || 'Failed to read sensor');
        } else {
          // For demo mode, treat it as success with mock data
          setSensorData(data);
          setError(null);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to fetch sensor data: ${errorMessage}`);
      setSensorData(null);
    } finally {
      setLoading(false);
    }
  }, [pin, retries]);

  // Initial fetch on mount
  useEffect(() => {
    fetchSensorData();
  }, [fetchSensorData]);

  // Auto-refresh effect
  useEffect(() => {
    if (!isAutoRefresh) return;

    const intervalId = setInterval(() => {
      fetchSensorData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [isAutoRefresh, refreshInterval, fetchSensorData]);

  const handleManualRefresh = () => {
    fetchSensorData();
  };

  const toggleAutoRefresh = () => {
    setIsAutoRefresh(!isAutoRefresh);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-2xl font-bold">🌡️ DHT11 Sensor Readings</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              color={isAutoRefresh ? 'success' : 'default'}
              variant={isAutoRefresh ? 'solid' : 'bordered'}
              onPress={toggleAutoRefresh}
            >
              {isAutoRefresh ? '🔄 Auto: ON' : '⏸️ Auto: OFF'}
            </Button>
            <Button
              size="sm"
              color="primary"
              onPress={handleManualRefresh}
              isLoading={loading}
              isDisabled={loading}
            >
              {loading ? 'Reading...' : '🔄 Refresh'}
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Pin: <strong>{pin}</strong> | 
          Retries: <strong>{retries}</strong> | 
          {isAutoRefresh && ` Auto-refresh: ${refreshInterval / 1000}s`}
          {sensorData?.mock && (
            <span className="ml-2 text-yellow-500">• Mock Data</span>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {loading && !sensorData && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4">Reading sensor...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg">
            <h3 className="font-semibold text-yellow-400 mb-2">
              {sensorData?.demo ? 'ℹ️ Demo Mode' : '❌ Error'}
            </h3>
            <p className="text-sm text-yellow-300">{error}</p>
            {sensorData?.note && (
              <p className="text-xs text-yellow-400 mt-2">{sensorData.note}</p>
            )}
            {sensorData?.demo && (
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500 rounded">
                <p className="text-xs text-blue-300">
                  💡 <strong>Note:</strong> This is demo mode. To see actual sensor readings, deploy this application to a Raspberry Pi with a DHT11 sensor connected.
                </p>
              </div>
            )}
          </div>
        )}

        {sensorData && sensorData.success && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Temperature Card */}
            <Card className="bg-gradient-to-br from-blue-500 to-cyan-500">
              <CardBody className="p-6">
                <div className="text-white">
                  <div className="text-sm font-semibold opacity-90 mb-1">Temperature</div>
                  <div className="text-4xl font-bold mb-1">
                    {sensorData.temperatureCelsius?.toFixed(1) || sensorData.temperature}°C
                  </div>
                  <div className="text-lg opacity-80">
                    {(sensorData.temperatureCelsius || parseFloat(sensorData.temperature || '0')) * 9 / 5 + 32}°F
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Humidity Card */}
            <Card className="bg-gradient-to-br from-green-500 to-emerald-500">
              <CardBody className="p-6">
                <div className="text-white">
                  <div className="text-sm font-semibold opacity-90 mb-1">Humidity</div>
                  <div className="text-4xl font-bold mb-1">
                    {sensorData.humidityPercent?.toFixed(1) || sensorData.humidity}%
                  </div>
                  <div className="text-lg opacity-80">
                    Relative Humidity
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {sensorData && sensorData.timestamp && (
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
            <div className="flex justify-between">
              <span>Last updated: {new Date(sensorData.timestamp).toLocaleString()}</span>
              {sensorData.attempt && sensorData.attempt > 1 && (
                <span>Attempt: {sensorData.attempt}</span>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
