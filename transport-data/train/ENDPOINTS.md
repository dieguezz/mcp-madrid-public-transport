# Cercanías and Trains - External APIs

Trains in the Community of Madrid are queried through:
1. **Renfe GTFS Realtime** - Primary API (Official Open Data, NO AUTH REQUIRED) ✅
2. **CRTM SOAP** - Alternative/fallback API
3. **ADIF API "El Cano"** - Legacy (complex authentication, not currently used)

---

## 📡 1. Renfe GTFS Realtime (PRIMARY - CURRENTLY USED)

### General Information
- **Provider**: Renfe (Spanish National Railway)
- **Data URL**: `https://gtfsrt.renfe.com/vehicle_positions.json`
- **Type**: GTFS Realtime (JSON feed)
- **Format**: JSON
- **Authentication**: ✅ **NONE REQUIRED** (public open data)
- **License**: CC-BY-4.0
- **Update frequency**: ~30 seconds
- **Coverage**: All Cercanías networks in Spain (filter by Madrid)

### Endpoint: Get vehicle positions

```
GET https://gtfsrt.renfe.com/vehicle_positions.json
```

#### No Headers Required
Just a simple GET request - no authentication!

#### Response Example
```json
{
  "header": {
    "gtfs_realtime_version": "2.0",
    "incrementality": "FULL_DATASET",
    "timestamp": "1704378600"
  },
  "entity": [
    {
      "id": "10100_C5_...",
      "vehicle": {
        "trip": {
          "trip_id": "10100_20250104_C5_...",
          "route_id": "C5",
          "direction_id": 1
        },
        "position": {
          "latitude": 40.4065,
          "longitude": -3.6908
        },
        "current_stop_sequence": 5,
        "current_status": "IN_TRANSIT_TO",
        "timestamp": "1704378590",
        "stop_id": "10100"
      }
    }
  ]
}
```

#### Key Fields
- `entity[].id`: Vehicle identifier
- `entity[].vehicle.trip.trip_id`: Trip ID (starts with station code, e.g., "10100" for Atocha)
- `entity[].vehicle.trip.route_id`: Line (e.g., "C5")
- `entity[].vehicle.position`: Current GPS coordinates
- `entity[].vehicle.stop_id`: Current or next stop
- `entity[].vehicle.timestamp`: Position update time

#### How to Filter for Madrid
Trip IDs starting with "10" are Madrid Cercanías:
```javascript
const madridTrips = data.entity.filter(e =>
  e.vehicle?.trip?.trip_id?.startsWith('10')
);
```

### Advantages
- ✅ **No authentication required**
- ✅ **Official open data** (CC-BY-4.0 license)
- ✅ **Real-time vehicle positions**
- ✅ **Easy to implement**
- ✅ **Reliable and stable**
- ✅ **Documented**: https://data.renfe.com/dataset/ubicacion-vehiculos

### Official Documentation
- Dataset: https://data.renfe.com/dataset/ubicacion-vehiculos
- GTFS Realtime spec: https://gtfs.org/realtime/

---

## 📡 2. CRTM SOAP (Alternative)

See `bus/ENDPOINTS.md` for CRTM SOAP documentation. Filter results by `codMode = 5` for trains.

---

## 📡 3. ADIF API "El Cano" (LEGACY - NOT USED)

**⚠️ NOTE**: This API is **NOT currently used** in this implementation. We use Renfe GTFS Realtime instead.

This section is kept for historical reference only.

### Why not used?
- Complex HMAC-SHA256 authentication required
- Credentials must be extracted from mobile app (security risk)
- Subject to change without notice
- Not officially documented

### Alternative
Use **Renfe GTFS Realtime** (documented above) - no authentication required!

---

## 📊 Static Data

### Train GTFS Feed

#### General Information
- **Format**: GTFS
- **File**: ZIP
- **Update frequency**: Periodic

#### Download URL
```
https://github.com/xBaank/MadridTransporte-Backup/raw/refs/heads/master/google_transit_M5.zip
```

#### Contents
- `stops.txt` - Train/cercanías stations
- `routes.txt` - Cercanías lines (C-1, C-2, C-3, etc.)
- `trips.txt` - Scheduled trips
- `stop_times.txt` - Scheduled times
- `calendar.txt` - Service calendars
- `shapes.txt` - Line traces

### Additional Station Information

#### Train_stations.csv

```
https://github.com/xBaank/MadridTransporte-Backup/raw/refs/heads/master/Train_stations.csv
```

This file contains mapping between codes:
- `idEstacion`: GTFS code (fullStopCode)
- `codigoEmpresa`: ADIF station code (stationCode)

**Usage**: Allows translating GTFS code to the code used by ADIF API.

### Train Itineraries

#### Train_itineraries.csv

```
https://github.com/xBaank/MadridTransporte-Backup/raw/refs/heads/master/Train_itineraries.csv
```

CSV file with additional train itinerary information that complements GTFS data.

---

## 📝 Code Mapping

### Mode Codes (codMode)

| Type | Code | Description |
|------|------|-------------|
| Cercanías | `5` | RENFE Cercanías trains |

### Station Mapping Example

```csv
# Train_stations.csv
idEstacion,codigoEmpresa,nombreEstacion
par_5_10100,10100,Madrid-Atocha Cercanías
par_5_10403,10403,Alcalá de Henares
```

- **idEstacion**: Format `par_{codMode}_{codigoEmpresa}`
- **codigoEmpresa**: ADIF numeric code to use in API

---

## 📚 References

- **Renfe Open Data**: https://data.renfe.com/
- **Renfe GTFS Realtime Dataset**: https://data.renfe.com/dataset/ubicacion-vehiculos
- **RENFE Cercanías Madrid**: https://www.renfe.com/es/es/cercanias/cercanias-madrid
- **GTFS Specification**: https://gtfs.org/
- **GTFS Realtime Specification**: https://gtfs.org/realtime/
- **Data backup**: https://github.com/xBaank/MadridTransporte-Backup
