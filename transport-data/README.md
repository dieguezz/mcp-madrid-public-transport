# Madrid Public Transport Data

This directory contains all necessary information to integrate with Madrid's public transport external APIs, including static data (GTFS) and real-time API documentation.

## 📂 Structure

```
transport-data/
├── metro/          # Madrid Metro
├── bus/            # Buses (EMT, urban and interurban)
├── train/          # RENFE Cercanías (commuter trains)
└── README.md       # This file
```

## 🚇 Madrid Metro (`metro/`)

### Available APIs
- **Real-Time API**: Metro de Madrid REST API (teleindicadores)
- **Endpoint**: `https://serviciosapp.metromadrid.es`
- **Authentication**: Not required

### Static Data
- Complete Metro GTFS (M4)
- Station mapping CSV (`Metro_stations.csv`)

### Mode Code
- `4` - Madrid Metro

📖 **See**: `metro/ENDPOINTS.md` for complete documentation

---

## 🚌 Buses (`bus/`)

Buses are divided into three systems:

### 1. EMT Madrid (Urban Buses)
- **API**: EMT OpenAPI (REST with OAuth)
- **Endpoint**: `https://openapi.emtmadrid.es`
- **Authentication**: Login with API key → Token
- **Mode Code**: `6`

### 2. Urban Buses (other operators)
- **API**: CRTM SOAP + Avanza REST
- **Authentication**: CRTM (AES) + Avanza (no auth)
- **Mode Code**: `9`

### 3. Interurban Buses
- **API**: CRTM SOAP
- **Authentication**: AES encryption
- **Mode Code**: `89`

### Static Data
- 3 separate GTFS files (EMT, urban, interurban)
- Folders: `emt/`, `urban/`, `interurban/`

📖 **See**: `bus/ENDPOINTS.md` for complete documentation

---

## 🚆 Cercanías and Trains (`train/`)

### Available APIs

#### 1. ADIF "El Cano" (Primary)
- **API**: ADIF REST API
- **Endpoint**: `https://circulacion.api.adif.es`
- **Authentication**: HMAC-SHA256 ("El Cano" system)
- **Accuracy**: High, real-time data with delays

#### 2. CRTM SOAP (Fallback)
- **API**: CRTM SOAP
- **Authentication**: AES encryption
- **Usage**: When ADIF fails

### Static Data
- Train GTFS (M5) - partially empty
- `train_stations.csv` - Code mapping
- `train_itineraries.csv` - Schedules (replaces empty stop_times.txt)

### Mode Code
- `5` - RENFE Cercanías

📖 **See**: `train/ENDPOINTS.md` for complete documentation

---

## 🗺️ Mode Codes (codMode)

Each transport type has a unique code:

| Code | Type | Description |
|------|------|-------------|
| `4` | Metro | Madrid Metro |
| `5` | Train | RENFE Cercanías |
| `6` | EMT | EMT Madrid urban buses |
| `9` | Urban Bus | Urban buses (other operators) |
| `10` | Tram | Tram / Light Metro |
| `89` | Interurban Bus | Interurban buses |

---

## 📊 GTFS Format

All static data follows the GTFS (General Transit Feed Specification) standard:

### Main Files
- **agency.txt** - Transit agency information
- **routes.txt** - Transit routes
- **stops.txt** - Stops/stations
- **trips.txt** - Scheduled trips
- **stop_times.txt** - Stop times
- **calendar.txt** - Service calendars
- **shapes.txt** - Geographic route traces

### Resources
- GTFS Specification: https://gtfs.org/schedule/reference/
- GTFS Validator: https://gtfs-validator.mobilitydata.org/

---

## 🔑 Data Sources

### GitHub Backup
All data comes from: **https://github.com/xBaank/MadridTransporte-Backup**

**Why a backup?**
The original developer documents that official CRTM data has been modified/deleted without notice on multiple occasions, so they maintain a stable backup on GitHub.

### Official Data vs Backup
- ✅ **GitHub Backup**: Stable, versioned, historical
- ⚠️ **Official CRTM Data**: May change/disappear without notice

---

## 🔧 API Summary by Provider

### Metro de Madrid
- **Type**: Simple REST
- **Complexity**: ⭐ Low
- **Requires**: Nothing (public API)

### EMT Madrid
- **Type**: REST with OAuth
- **Complexity**: ⭐⭐ Medium
- **Requires**: Credentials (free registration)

### CRTM (Buses/Metro)
- **Type**: SOAP
- **Complexity**: ⭐⭐⭐ High
- **Requires**: SOAP implementation + AES encryption

### ADIF (Trains)
- **Type**: REST with HMAC-SHA256
- **Complexity**: ⭐⭐⭐⭐ Very High
- **Requires**: HMAC-SHA256 implementation ("El Cano")

### Avanza (Some buses)
- **Type**: Simple REST
- **Complexity**: ⭐ Low
- **Requires**: Nothing (public API)

---

## 🚀 Quick Start

### 1. Query Static Data
```bash
# Example: View metro stops
cd metro/
cat stops.txt | head

# Example: View EMT bus routes
cd bus/emt/
cat routes.txt
```

### 2. Query Real-Time API

#### Metro (simplest)
```bash
curl "https://serviciosapp.metromadrid.es/servicios/rest/teleindicadores/211" \
  -H "Accept: application/json"
```

#### EMT (requires login)
```bash
# 1. Login
TOKEN=$(curl "https://openapi.emtmadrid.es/v1/mobilitylabs/user/login/" \
  -H "X-ClientId: YOUR_CLIENT_ID" \
  -H "passKey: YOUR_PASS_KEY" | jq -r '.data.accessToken')

# 2. Query arrival times
curl -X POST "https://openapi.emtmadrid.es/v2/transport/busemtmad/stops/72/arrives/" \
  -H "accessToken: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## ⚠️ Important Considerations

### Common Limitations
1. **No complete official documentation**: Many APIs are reverse-engineered
2. **Hardcoded credentials**: Some come from mobile apps
3. **May change without notice**: Especially ADIF and EMT
4. **Undocumented rate limiting**: Use moderately

### Recommended Caching
- **Metro**: 30-60 seconds (real-time)
- **EMT**: 10 seconds (real-time)
- **CRTM Buses**: 15 seconds + 24h fallback
- **ADIF Trains**: 10 seconds (real-time)
- **GTFS Data**: No cache (load into DB)

### Error Handling
1. Always implement timeouts (20-60 seconds)
2. Have fallback to scheduled data (GTFS)
3. Cache last valid data
4. Log failures to detect API changes

---

## 📝 Using This Information

This compilation is designed to:
1. Create an independent Madrid transport application
2. Understand the APIs without depending on original Kotlin code
3. Implement in any language/platform
4. Have static data without depending on real-time APIs

---

## 📅 Collection Date

**2025-01-04**

GTFS data and APIs may change. Regular updates are recommended.

---

## 📚 Detailed Documentation

For complete information on each transport type:

- 📖 **Metro**: `metro/ENDPOINTS.md`
- 📖 **Buses**: `bus/ENDPOINTS.md`
- 📖 **Trains**: `train/ENDPOINTS.md`

Each file contains:
- Complete API specifications
- Request/response examples
- Authentication details
- Considerations and limitations
- Conceptual code examples

---

## 🆘 Support

For more information about:
- **GTFS**: https://gtfs.org/
- **Metro de Madrid**: https://www.metromadrid.es/
- **EMT Madrid**: https://www.emtmadrid.es/
- **CRTM**: https://www.crtm.es/
- **ADIF**: https://www.adif.es/
- **Data backup**: https://github.com/xBaank/MadridTransporte-Backup
