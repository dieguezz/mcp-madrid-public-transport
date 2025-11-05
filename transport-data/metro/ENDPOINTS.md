# Madrid Metro - External APIs

## 📡 Real-Time API (Teleindicadores)

### General Information
- **Provider**: Metro de Madrid
- **Base URL**: `https://serviciosapp.metromadrid.es`
- **Type**: REST API
- **Format**: JSON
- **Authentication**: Not required

### Endpoint: Get waiting times by station

```
GET /servicios/rest/teleindicadores/{codigoEmpresa}
```

#### Parameters
- `{codigoEmpresa}`: Station numeric code (e.g., "1234")

#### Headers
```
Accept: application/json
```

#### Request Example
```bash
curl -X GET "https://serviciosapp.metromadrid.es/servicios/rest/teleindicadores/1234" \
  -H "Accept: application/json"
```

#### Response Example
```json
{
  "Vtelindicadores": [
    {
      "linea": "1",
      "sentido": "Pinar de Chamartín",
      "anden": 1,
      "proximo": 5,
      "siguiente": 10,
      "fechaHoraEmisionPrevision": "2025-01-04T15:30:00+01:00"
    },
    {
      "linea": "1",
      "sentido": "Valdecarros",
      "anden": 2,
      "proximo": 3,
      "siguiente": 8,
      "fechaHoraEmisionPrevision": "2025-01-04T15:30:00+01:00"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `linea` | string/number | Metro line number |
| `sentido` | string | Direction/destination of the train |
| `anden` | integer | Platform number |
| `proximo` | integer | Minutes until next train (can be null) |
| `siguiente` | integer | Minutes until following train (can be null) |
| `fechaHoraEmisionPrevision` | string (ISO 8601) | Timestamp when the prediction was issued |

#### Status Codes
- `200 OK`: Successful request
- `404 Not Found`: Station not found

#### Important Notes
1. The values `proximo` and `siguiente` can be `null` if no information is available
2. The indicated time is in **minutes**
3. The `fechaHoraEmisionPrevision` is in Madrid timezone (+01:00 or +02:00 depending on daylight saving time)
4. To calculate the real arrival time, adjust considering the offset between the emission time and current time

#### Station Code Mapping
To get the `codigoEmpresa` from the GTFS code, you need to consult:
- **File**: `Metro_stations.csv` (see Static Data section)
- **Fields**: `idEstacion` (GTFS code) → `codigoEmpresa` (code for API)

---

## 📊 Static Data

### Metro GTFS Feed

#### General Information
- **Format**: GTFS (General Transit Feed Specification)
- **File**: ZIP
- **Update frequency**: Periodic (daily updates recommended)

#### Download URL
```
https://github.com/xBaank/MadridTransporte-Backup/raw/refs/heads/master/google_transit_M4.zip
```

**Note**: This URL points to a GitHub backup because official CRTM data has been modified/deleted in the past without notice.

#### ZIP Contents
The file contains the following standard GTFS CSV files:

1. **stops.txt** - Stops/Stations
   - `stop_id`: Unique stop identifier
   - `stop_name`: Station name
   - `stop_lat`: Latitude
   - `stop_lon`: Longitude
   - `stop_code`: Stop code
   - `wheelchair_boarding`: Accessibility
   - `zone_id`: Fare zone

2. **routes.txt** - Metro Lines
   - `route_id`: Line ID
   - `route_short_name`: Line number (1, 2, 3...)
   - `route_long_name`: Full line name
   - `route_type`: Transport type (1 = Metro)
   - `route_color`: Line color in hexadecimal

3. **trips.txt** - Trips/Itineraries
   - `trip_id`: Unique trip ID
   - `route_id`: Reference to routes.txt
   - `service_id`: Reference to calendar.txt
   - `trip_headsign`: Train destination
   - `direction_id`: Direction (0 or 1)
   - `shape_id`: Reference to shapes.txt

4. **stop_times.txt** - Scheduled times
   - `trip_id`: Reference to trips.txt
   - `arrival_time`: Scheduled arrival time
   - `departure_time`: Scheduled departure time
   - `stop_id`: Reference to stops.txt
   - `stop_sequence`: Stop order in the trip

5. **calendar.txt** - Service calendars
   - `service_id`: Service ID
   - `monday` - `sunday`: Operating days (0 or 1)
   - `start_date`: Start date (YYYYMMDD)
   - `end_date`: End date (YYYYMMDD)

6. **shapes.txt** - Line traces
   - `shape_id`: Shape ID
   - `shape_pt_lat`: Point latitude
   - `shape_pt_lon`: Point longitude
   - `shape_pt_sequence`: Point order

### Additional Station Information

#### Metro_stations.csv

```
https://github.com/xBaank/MadridTransporte-Backup/raw/refs/heads/master/Metro_stations.csv
```

This CSV file contains additional mapping necessary to connect GTFS data with the real-time API.

#### Structure
- `idEstacion`: Station code used in GTFS (fullStopCode)
- `codigoEmpresa`: Numeric code used in the teleindicadores API
- Other fields with additional station information

#### Usage
Used to translate between:
- **GTFS `stop_id`** → **API `codigoEmpresa`**

---

## 🔧 Recommended Integration Flow

### 1. Initial Static Data Load
```
1. Download google_transit_M4.zip
2. Extract and process stops.txt → Station database
3. Download Metro_stations.csv
4. Create mapping idEstacion ↔ codigoEmpresa
5. Process routes.txt, trips.txt, stop_times.txt, calendar.txt for scheduled times
```

### 2. Real-Time Query
```
1. User requests times for a station (using GTFS stop_id)
2. Find corresponding codigoEmpresa in mapping
3. GET /servicios/rest/teleindicadores/{codigoEmpresa}
4. Process response and calculate real times adjusting for fechaHoraEmisionPrevision
5. Return arrival times
```

### 3. Data Update
```
Recommended frequency:
- GTFS: Daily (or weekly)
- Real-time API: Each request (no cache) or cache of 30-60 seconds maximum
```

---

## ⚠️ Important Considerations

### Known Limitations
1. **No authentication**: The teleindicadores API is public but may have rate limiting
2. **Unstable GTFS data**: The official provider (CRTM) has modified/deleted data without notice
3. **GitHub backup**: Using the `xBaank/MadridTransporte-Backup` backup is recommended for stability
4. **Approximate times**: The `proximo` and `siguiente` times are estimates and may vary

### Error Handling
1. **404 on teleindicadores**: The station may not have service or the code is incorrect
2. **Null values**: No information on upcoming trains (end of service, incidents, etc.)
3. **Timeout**: Implement 20-30 second timeout and fallback to scheduled times

### Recommended Caching
- **GTFS Data**: No cache (store in database)
- **Metro_stations.csv**: No cache (store in database)
- **teleindicadores API**: Maximum 30-60 seconds, with 24h fallback cache in case of timeout

---

## 📝 Implementation Example

### Get waiting times for "Sol" station

```bash
# 1. Search in stops.txt for the stop_id of "Sol"
# stop_id: par_4_211_1 (example)

# 2. Search in Metro_stations.csv for the codigoEmpresa
# idEstacion: par_4_211_1 → codigoEmpresa: 211

# 3. Query API
curl "https://serviciosapp.metromadrid.es/servicios/rest/teleindicadores/211" \
  -H "Accept: application/json"

# 4. Process response to get upcoming train times
```

---

## 📚 References

- **GTFS Specification**: https://gtfs.org/schedule/reference/
- **Data backup**: https://github.com/xBaank/MadridTransporte-Backup
- **Metro de Madrid**: https://www.metromadrid.es/
