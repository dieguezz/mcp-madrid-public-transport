# Madrid Buses - Downloaded Data

## 📁 Contents of this folder

### Documentation Files
- **ENDPOINTS.md** - Complete documentation of bus external APIs (EMT, CRTM, Avanza)

### GTFS Data Folders

#### 1. `emt/` - EMT Madrid (Urban Buses)
GTFS data for urban buses operated by Empresa Municipal de Transportes de Madrid.
- Mode code: `6`
- Source: `google_transit_M6.zip`
- Operator: EMT Madrid
- Coverage: Madrid city

#### 2. `urban/` - Urban Buses (other operators)
GTFS data for urban buses operated by other companies in municipalities of the Community of Madrid.
- Mode code: `9`
- Source: `google_transit_M9.zip`
- Operators: Various (Avanza, Grupo Ruiz, etc.)
- Coverage: Municipalities of the Community of Madrid

#### 3. `interurban/` - Interurban Buses
GTFS data for the interurban bus network of the Community of Madrid.
- Mode code: `89`
- Source: `google_transit_M89.zip`
- Operators: Various concession operators
- Coverage: Inter-municipal connections

### Source Files (compressed)
- **emt_gtfs.zip** - Original EMT ZIP file (~25 MB)
- **urban_gtfs.zip** - Original urban ZIP file (~75 MB)
- **interurban_gtfs.zip** - Original interurban ZIP file (~75 MB)

## 📋 Structure of each GTFS folder

Each folder contains standard GTFS files:
- `agency.txt` - Transport agency information
- `routes.txt` - Bus lines
- `stops.txt` - Stops
- `trips.txt` - Operational trips/services
- `stop_times.txt` - Scheduled times per stop
- `calendar.txt` - Service calendars
- `calendar_dates.txt` - Calendar exceptions
- `shapes.txt` - Geographic line traces
- `frequencies.txt` - Service frequencies (if applicable)
- `feed_info.txt` - Feed metadata

## 🔄 Last Update
- Download date: 2025-01-04
- Source: https://github.com/xBaank/MadridTransporte-Backup

## 🔑 Differences between the three systems

### EMT (emt/)
- **Real-Time API**: REST with OAuth authentication
- **Endpoint**: https://openapi.emtmadrid.es
- **Particularity**: Requires login to get token
- **Coverage**: Madrid city only
- **Update**: High frequency, very accurate data

### Urban (urban/)
- **Real-Time API**: CRTM SOAP + Avanza REST
- **CRTM Endpoint**: SOAP multimodal consortium
- **Avanza Endpoint**: https://apisvt.avanzagrupo.com
- **Particularity**: Combines multiple sources
- **Coverage**: Community municipalities (except Madrid capital)

### Interurban (interurban/)
- **Real-Time API**: CRTM SOAP
- **Endpoint**: SOAP multimodal consortium
- **Particularity**: AES encrypted authentication
- **Coverage**: Connections between municipalities
- **Frequency**: Lower than urban (longer routes)

## 📖 How to use this data

Consult **ENDPOINTS.md** for detailed information about:
- Real-time APIs for each system
- Authentication process (EMT OAuth vs CRTM SOAP)
- Response structure
- Integration examples
- Specific considerations and limitations for each operator

## 💡 Important Notes

1. **EMT requires your own credentials**: The credentials in the source code are for testing. For production, register at https://openapi.emtmadrid.es

2. **CRTM uses SOAP**: More complex implementation than REST, requires SOAP library

3. **Avanza doesn't require auth**: But only available for specific lines operated by Avanza

4. **Large files**: Urban and interurban GTFS are ~75 MB each (many routes and stops)
