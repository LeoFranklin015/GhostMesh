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
  refreshInterval = 5000,
  retries = 3
}: DHT11SensorProps) {
  const [sensorData, setSensorData] = useState<DHT11SensorData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(autoRefresh);

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
        setError(data.error || 'Failed to read sensor');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to fetch sensor data: ${errorMessage}`);
      setSensorData(null);
    } finally {
      setLoading(false);
    }
  }, [pin, retries]);

  useEffect(() => {
    fetchSensorData();
  }, [fetchSensorData]);

  useEffect(() => {
    if (!isAutoRefresh) return;
    const intervalId = setInterval(() => {
      fetchSensorData();
    }, refreshInterval);
    return () => clearInterval(intervalId);
  }, [isAutoRefresh, refreshInterval, fetchSensorData]);

  const tempValue = sensorData?.temperatureCelsius || parseFloat(sensorData?.temperature || '0');
  const tempF = (tempValue * 9 / 5 + 32).toFixed(1);
  const humidityValue = sensorData?.humidityPercent || parseFloat(sensorData?.humidity || '0');

  return (
    <Card className="w-full shadow-xl border border-gray-800/50 backdrop-blur-sm bg-gradient-to-br from-gray-900/95 to-gray-800/95">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">DHT11 Sensor</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">GPIO Pin {pin}</span>
                {isAutoRefresh && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Auto ({refreshInterval / 1000}s)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              color={isAutoRefresh ? 'success' : 'default'}
              variant={isAutoRefresh ? 'solid' : 'bordered'}
              onPress={() => setIsAutoRefresh(!isAutoRefresh)}
              className="font-medium"
            >
              {isAutoRefresh ? 'Auto ON' : 'Auto OFF'}
            </Button>
            <Button
              size="sm"
              color="primary"
              onPress={fetchSensorData}
              isLoading={loading}
              isDisabled={loading}
              className="font-medium"
            >
              {loading ? 'Reading...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardBody className="px-6 pb-6 pt-2">
        {loading && !sensorData && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/30 border-t-blue-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <span className="mt-4 text-sm text-gray-400">Reading sensor...</span>
          </div>
        )}

        {sensorData && sensorData.success && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Temperature Card */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 shadow-lg border-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 blur-xl"></div>
                <CardBody className="p-6 relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-white/90 uppercase tracking-wider">Temperature</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-5xl font-bold text-white tracking-tight">
                      {tempValue.toFixed(1)}°
                    </div>
                    <div className="flex items-center gap-3 text-white/80">
                      <span className="text-lg font-medium">Celsius</span>
                      <span className="text-sm opacity-70">•</span>
                      <span className="text-lg font-medium">{tempF}°F</span>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Humidity Card */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 shadow-lg border-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 blur-xl"></div>
                <CardBody className="p-6 relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-white/90 uppercase tracking-wider">Humidity</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-5xl font-bold text-white tracking-tight">
                      {humidityValue.toFixed(1)}%
                    </div>
                    <div className="flex items-center text-white/80">
                      <span className="text-lg font-medium">Relative</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Status Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Updated {new Date(sensorData.timestamp || Date.now()).toLocaleTimeString()}</span>
              </div>
              {sensorData.attempt && sensorData.attempt > 1 && (
                <span className="text-xs text-gray-500">Attempt {sensorData.attempt}</span>
              )}
            </div>
          </>
        )}

        {error && !sensorData?.success && (
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-400 mb-1">Error</h3>
                <p className="text-sm text-yellow-300/80">{error}</p>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
