# Sensor Data API

Base URL: `http://localhost:3001/api`

## 1. Basic Request - Get All Data by Type

```bash
# Temperature
curl http://localhost:3001/api/temp

# Humidity
curl http://localhost:3001/api/humidity

# Air Quality
curl http://localhost:3001/api/air

# Carbon Credits
curl http://localhost:3001/api/carbon
```

## 2. Filter by Minimum Value

```bash
# Get temperatures above 25°C
curl "http://localhost:3001/api/temp?minData=25"

# Get humidity above 60%
curl "http://localhost:3001/api/humidity?minData=60"

# Get air quality above 100 AQI
curl "http://localhost:3001/api/air?minData=100"

# Get carbon offset above 300kg
curl "http://localhost:3001/api/carbon?minData=300"
```

## 3. Filter by Time Range

```bash
# Get temperature from specific date
curl "http://localhost:3001/api/temp?startTime=2025-11-16T00:00:00Z&endTime=2025-11-16T23:59:59Z"

# Get humidity with both filters
curl "http://localhost:3001/api/humidity?minData=50&startTime=2025-11-16T00:00:00Z&endTime=2025-11-16T23:59:59Z"
```
