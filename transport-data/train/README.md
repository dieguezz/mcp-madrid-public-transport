# Cercanías and Trains - Downloaded Data

## 📁 Contents of this folder

### Documentation Files
- **ENDPOINTS.md** - Complete documentation of train external APIs (ADIF "El Cano" and CRTM SOAP)

### GTFS (General Transit Feed Specification) Data
- **agency.txt** - RENFE Cercanías information
- **routes.txt** - Cercanías lines (C-1, C-2, C-3, etc.)
- **stops.txt** - Train/cercanías stations
- **trips.txt** - Scheduled trips (empty - see train_itineraries.csv)
- **stop_times.txt** - Scheduled times (empty - see train_itineraries.csv)
- **calendar.txt** - Service calendars
- **calendar_dates.txt** - Calendar exceptions (empty)
- **shapes.txt** - Line traces (empty)
- **frequencies.txt** - Service frequencies (empty)
- **feed_info.txt** - GTFS feed metadata
- **fare_attributes.txt** - Fare attributes (empty)
- **fare_rules.txt** - Fare rules (empty)

### Additional Data
- **train_stations.csv** - Station code mapping
  - Translates between `idEstacion` (GTFS) and `codigoEmpresa` (ADIF code for API)

- **train_itineraries.csv** - Train itineraries and schedules
  - Complements/replaces data from trips.txt and stop_times.txt
  - Contains detailed schedule and stop information by line

### Source Files (compressed)
- **train_gtfs.zip** - Original downloaded ZIP file

## 🔄 Last Update
- Download date: 2025-01-04
- Source: https://github.com/xBaank/MadridTransporte-Backup

## ⚠️ Train Data Particularities

### Incomplete GTFS
The train GTFS has several empty files:
- `trips.txt` (empty)
- `stop_times.txt` (empty)
- `shapes.txt` (empty)

**Solution**: Use **train_itineraries.csv** which contains itinerary and schedule information.

### Code Mapping
It's crucial to use **train_stations.csv** to map:
- **idEstacion** (GTFS format: `par_5_XXXXX`) → **codigoEmpresa** (ADIF numeric code)

Example:
```
idEstacion: par_5_10100
codigoEmpresa: 10100
Name: Madrid-Atocha Cercanías
```

The **codigoEmpresa** is what's used in the ADIF "El Cano" API.

## 🔑 Current API: Renfe GTFS Realtime

### **✅ Currently Used: Renfe GTFS Realtime**
- **Advantages**:
  - ✅ **NO authentication required**
  - Official open data (CC-BY-4.0)
  - Real-time vehicle positions
  - Very easy to implement
  - Stable and reliable
- **Data**:
  - URL: https://gtfsrt.renfe.com/vehicle_positions.json
  - Update frequency: ~30 seconds
  - Coverage: All Spain (filter by Madrid using trip IDs starting with "10")

### Alternative APIs (not currently used)

**CRTM SOAP** (fallback option):
- Same infrastructure as buses
- AES encrypted authentication
- Less accurate for trains

**ADIF "El Cano"** (legacy):
- Complex HMAC-SHA256 authentication
- Requires credentials from mobile app
- Not currently used in this implementation

## 📖 How to use this data

### For Static Data
1. **Stations**: Use `stops.txt` and `train_stations.csv`
2. **Lines**: Use `routes.txt` (C-1, C-2, etc.)
3. **Schedules**: Use `train_itineraries.csv` (don't use stop_times.txt which is empty)
4. **Calendars**: Use `calendar.txt`

### For Real-Time Times
Consult **ENDPOINTS.md** for:
- Renfe GTFS Realtime API (currently used - no auth required!)
- Alternative APIs (CRTM SOAP, ADIF "El Cano")
- Integration examples

## 💡 Important Notes

1. **Current Implementation**:
   - ✅ Uses **Renfe GTFS Realtime** (public API, no authentication)
   - Data updates every ~30 seconds
   - Filter Madrid trips by checking if trip_id starts with "10"

2. **Mode Code**:
   - Trains/Cercanías: `codMode = 5`

3. **No Authentication Required**:
   - The Renfe GTFS Realtime feed is public open data
   - No credentials or API keys needed
   - Licensed under CC-BY-4.0

## 📋 train_itineraries.csv Structure

This CSV file complements GTFS and contains:
- Line identifiers (`IDFLINEA`)
- Trip/journey codes (`IDFTRAYECTO`)
- Station passage times
- Service and calendar information

**Important**: Use this file instead of `stop_times.txt` which is empty.
