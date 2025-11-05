# Madrid Metro - Downloaded Data

## 📁 Contents of this folder

### Documentation Files
- **ENDPOINTS.md** - Complete documentation of Metro external APIs

### GTFS (General Transit Feed Specification) Data
- **agency.txt** - Transport agency information
- **routes.txt** - Metro lines (1, 2, 3, etc.)
- **stops.txt** - All metro stations/stops
- **trips.txt** - Operational trips/services
- **stop_times.txt** - Scheduled times per stop
- **calendar.txt** - Service calendars (operating days)
- **calendar_dates.txt** - Calendar exceptions
- **shapes.txt** - Geographic line traces
- **frequencies.txt** - Service frequencies
- **feed_info.txt** - GTFS feed metadata
- **fare_attributes.txt** - Fare attributes (empty)
- **fare_rules.txt** - Fare rules (empty)

### Additional Data
- **metro_stations.csv** - Station code mapping
  - Translates between `stop_id` (GTFS) and `codigoEmpresa` (real-time API)

### Source Files (compressed)
- **metro_gtfs.zip** - Original downloaded ZIP file

## 🔄 Last Update
- Download date: 2025-01-04
- Source: https://github.com/xBaank/MadridTransporte-Backup

## 📖 How to use this data

Consult **ENDPOINTS.md** for detailed information about:
- Real-time API structure
- GTFS file format
- Integration examples
- Considerations and limitations
