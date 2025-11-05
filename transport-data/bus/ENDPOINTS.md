# Madrid Buses - External APIs

Madrid buses are divided into three main systems:
1. **EMT Madrid** - Urban buses in the capital (managed by Empresa Municipal de Transportes)
2. **Interurban Buses** - Interurban bus network of the Community of Madrid (CRTM)
3. **Avanza** - Private company operating some urban and interurban lines

---

## 📡 1. EMT Madrid (Urban Buses)

### General Information
- **Provider**: EMT Madrid (Empresa Municipal de Transportes)
- **Base URL**: `https://openapi.emtmadrid.es`
- **Type**: REST API
- **Format**: JSON
- **Authentication**: OAuth with API Key

### Authentication

#### Endpoint: Login
```
GET /v1/mobilitylabs/user/login/
```

#### Required Headers
```
X-ClientId: {your_client_id}
passKey: {your_pass_key}
```

#### How to Get Your Own Credentials

**You must register for FREE credentials at the EMT developer portal:**

1. Visit https://openapi.emtmadrid.es/
2. Click "Register" (Registrarse)
3. Fill in the registration form
4. Verify your email
5. Log in and go to "My Account" > "My Applications"
6. Create a new application
7. Copy your `Client ID` and `Pass Key`

**⚠️ IMPORTANT**: Do NOT use hardcoded credentials from any source code. Always use your own credentials obtained from the official portal.

#### Login Response
```json
{
  "code": "00",
  "description": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenSecExpires": 3600
  }
}
```

The `accessToken` must be used in all subsequent requests and expires after the time indicated in `tokenSecExpires` (seconds).

---

### Endpoint: Get arrival times by stop

```
POST /v2/transport/busemtmad/stops/{stopId}/arrives/
```

#### Parameters
- `{stopId}`: EMT stop code (e.g., "72")

#### Headers
```
Content-Type: application/json
accessToken: {token_from_login}
```

#### Body (JSON)
```json
{
  "cultureInfo": "ES",
  "Text_StopRequired_YN": "Y",
  "Text_EstimationsRequired_YN": "Y",
  "Text_IncidencesRequired_YN": "Y",
  "DateTime_Referenced_Incidencies_YYYYMMDD": "2025-01-04"
}
```

#### Request Example
```bash
# 1. Login (use your own credentials from https://openapi.emtmadrid.es/)
curl -X GET "https://openapi.emtmadrid.es/v1/mobilitylabs/user/login/" \
  -H "X-ClientId: YOUR_CLIENT_ID" \
  -H "passKey: YOUR_PASS_KEY"

# 2. Get times
curl -X POST "https://openapi.emtmadrid.es/v2/transport/busemtmad/stops/72/arrives/" \
  -H "Content-Type: application/json" \
  -H "accessToken: {TOKEN}" \
  -d '{
    "cultureInfo": "ES",
    "Text_StopRequired_YN": "Y",
    "Text_EstimationsRequired_YN": "Y",
    "Text_IncidencesRequired_YN": "Y",
    "DateTime_Referenced_Incidencies_YYYYMMDD": "2025-01-04"
  }'
```

#### Response Example
```json
{
  "code": "00",
  "description": "Success",
  "data": [
    {
      "StopInfo": [
        {
          "stopId": "72",
          "stopName": "Pza. de Cibeles-Casa de América",
          "geometry": {
            "type": "Point",
            "coordinates": [-3.6931982, 40.4194347]
          },
          "lines": [
            {
              "label": "1",
              "to": "Pinar de Chamartín"
            }
          ]
        }
      ],
      "Arrive": [
        {
          "line": "1",
          "destination": "Pza. Castilla",
          "estimateArrive": 180,
          "DistanceBus": 1200
        },
        {
          "line": "1",
          "destination": "Pza. Castilla",
          "estimateArrive": 480,
          "DistanceBus": 2500
        }
      ],
      "Incident": {
        "ListaIncident": {
          "data": [
            {
              "title": "Line 1 detour",
              "description": "Line 1 is detoured...",
              "cause": "Works",
              "effect": "Temporary detour",
              "rssFrom": "2025-01-01T00:00:00",
              "rssTo": "2025-01-31T23:59:59",
              "moreInfo": {
                "@url": "https://www.emtmadrid.es/..."
              }
            }
          ]
        }
      }
    }
  ]
}
```

#### Main Response Fields

**StopInfo**:
- `stopId`: Stop ID
- `stopName`: Stop name
- `geometry.coordinates`: [longitude, latitude]
- `lines`: Array of lines passing through the stop

**Arrive** (arrivals):
- `line`: Line number
- `destination`: Bus destination
- `estimateArrive`: **Seconds** until arrival (not minutes)
- `DistanceBus`: Distance in meters

**Incident** (incidents):
- `title`: Incident title
- `description`: Detailed description
- `cause`: Incident cause
- `effect`: Effect on service
- `rssFrom` / `rssTo`: Validity period
- `moreInfo.@url`: URL with more information

#### HTTP Status Codes
- `200 OK`: Successful request
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`: No permissions
- `404 Not Found`: Stop not found

#### Important Notes
1. The access token **expires** after the time indicated at login (typically 1 hour)
2. If you receive 401 or 403, you must login again
3. The `estimateArrive` field is in **SECONDS**, not minutes
4. Coordinates are in [longitude, latitude] format (reverse of usual)

---

## 📡 2. CRTM (Interurban Buses)

### General Information
- **Provider**: CRTM (Consorcio Regional de Transportes de Madrid)
- **Base URL**: `http://opendata.emtmadrid.es:443/Servicios-web/BUS`
- **Type**: SOAP API
- **Format**: XML
- **Authentication**: AES encryption with public key

### Authentication Process

CRTM uses an AES-based authentication system:

1. **Get Public Key**
   - SOAP endpoint: `getPublicKey`
   - Request: `PublicKeyRequest`
   - Response: Temporary public key

2. **Generate Connection Key**
   - Encrypt public key with AES/CBC/PKCS5PADDING
   - Private key (hardcoded): `"pruebapruebapruebapruebaprueba12"`
   - IV: Array of 16 zero bytes
   - Encode result in Base64

3. **Send in Header**
   - All SOAP requests include `AuthHeader` header
   - Field: `connectionKey` (encrypted public key)

#### Authentication Example (conceptual)
```xml
<!-- 1. Get public key -->
<soapenv:Envelope>
  <soapenv:Body>
    <PublicKeyRequest/>
  </soapenv:Body>
</soapenv:Envelope>

<!-- 2. Use in requests -->
<soapenv:Envelope>
  <soapenv:Header>
    <AuthHeader>
      <connectionKey>{public_key_encrypted_in_base64}</connectionKey>
    </AuthHeader>
  </soapenv:Header>
  <soapenv:Body>
    <!-- Specific request -->
  </soapenv:Body>
</soapenv:Envelope>
```

**Note**: SOAP implementation is complex. Using a SOAP library like JAX-WS (Java) or suds (Python) is recommended.

---

### SOAP Endpoint: Get times by stop

**Operation**: `getStopTimes`

#### Request XML
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:bus="http://opendata.emtmadrid.es/">
  <soapenv:Header>
    <AuthHeader>
      <connectionKey>{encrypted_key}</connectionKey>
    </AuthHeader>
  </soapenv:Header>
  <soapenv:Body>
    <StopTimesRequest>
      <codStop>123456</codStop>
      <type>1</type>
      <orderBy>2</orderBy>
      <stopTimesByIti>3</stopTimesByIti>
    </StopTimesRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

#### Parameters
- `codStop`: Stop code (e.g., "123456")
- `type`: Query type (1 = arrival times)
- `orderBy`: Ordering (2 = by time)
- `stopTimesByIti`: Number of times per itinerary (3 = up to 3 next buses)

#### Response XML (simplified structure)
```xml
<StopTimesResponse>
  <stopTimes>
    <stop>
      <name>Stop name</name>
      <shortCodStop>123456</shortCodStop>
    </stop>
    <times>
      <time>
        <line>
          <codLine>C1_89_501</codLine>
          <shortDescription>501</shortDescription>
          <codMode>89</codMode>
        </line>
        <destination>Alcalá de Henares</destination>
        <direction>1</direction>
        <time>2025-01-04T15:30:00</time>
      </time>
      <!-- More times... -->
    </times>
  </stopTimes>
</StopTimesResponse>
```

#### Response Fields
- `stop.name`: Stop name
- `stop.shortCodStop`: Short stop code
- `line.codLine`: Complete line code (format: C{codMode}_{company}_{line})
- `line.shortDescription`: Visible line number
- `line.codMode`: Transport mode code
- `destination`: Bus destination
- `time`: Estimated arrival timestamp (ISO 8601)

---

## 📡 3. Avanza Bus

### General Information
- **Provider**: Avanza (private company)
- **Base URL**: `https://apisvt.avanzagrupo.com`
- **Type**: REST API
- **Format**: JSON
- **Authentication**: Not required

### Endpoint: Get times by stop

```
GET /lineas/getTraficosParada?empresa={companyId}&parada={stopId}
```

#### Parameters
- `empresa`: Company ID (typically "25" for Madrid)
- `parada`: Stop code

#### Request Example
```bash
curl "https://apisvt.avanzagrupo.com/lineas/getTraficosParada?empresa=25&parada=1234"
```

#### Response Example
```json
{
  "data": {
    "traficos": [
      {
        "coLineaWeb": "571",
        "llegada": "15:30:00",
        "dsDestino": "Alcalá de Henares",
        "colorLinea": "#FF0000"
      },
      {
        "coLineaWeb": "571",
        "llegada": "16:00:00",
        "dsDestino": "Alcalá de Henares",
        "colorLinea": "#FF0000"
      }
    ]
  }
}
```

#### Response Fields
- `coLineaWeb`: Line code/number
- `llegada`: Estimated arrival time (format HH:mm:ss)
- `dsDestino`: Bus destination
- `colorLinea`: Line color in hexadecimal

#### Important Notes
1. This API **doesn't require authentication**
2. The `llegada` field is the **absolute time** (not relative time)
3. The time is in Madrid timezone
4. Only available for certain lines operated by Avanza

---

## 📊 Static Data

### GTFS Feeds

Buses have multiple GTFS feeds by type:

#### 1. EMT Madrid (Urban)
```
https://github.com/xBaank/MadridTransporte-Backup/raw/refs/heads/master/google_transit_M6.zip
```

#### 2. Urban Buses (other operators)
```
https://github.com/xBaank/MadridTransporte-Backup/raw/refs/heads/master/google_transit_M9.zip
```

#### 3. Interurban Buses
```
https://github.com/xBaank/MadridTransporte-Backup/raw/refs/heads/master/google_transit_M89.zip
```

Each ZIP file contains standard GTFS structure:
- `stops.txt` - Stops
- `routes.txt` - Lines
- `trips.txt` - Trips
- `stop_times.txt` - Scheduled times
- `calendar.txt` - Service calendars
- `shapes.txt` - Line traces

---

## 🔧 Recommended Integration Flow

### For EMT (Urban Buses)

```
1. Login → Get accessToken
2. Store token (valid ~1 hour)
3. For each stop query:
   a. POST /v2/transport/busemtmad/stops/{stopId}/arrives/
   b. If returns 401/403 → Login again
4. Process response:
   a. estimateArrive is in SECONDS
   b. Calculate real time: now + estimateArrive seconds
```

### For CRTM (Interurban Buses)

```
1. Get public key (SOAP getPublicKey)
2. Encrypt with AES using private key
3. Include in AuthHeader of all requests
4. Query StopTimes
5. Token expires every ~55 seconds → Renew periodically
```

### For Avanza

```
1. Direct query (no authentication)
2. GET /lineas/getTraficosParada
3. Convert absolute time to relative time
```

---

## ⚠️ Important Considerations

### Known Limitations

1. **EMT**:
   - Token expires every hour
   - Undocumented rate limiting
   - Requires free registration at https://openapi.emtmadrid.es/
   - `estimateArrive` in seconds (not minutes)

2. **CRTM SOAP**:
   - Complex implementation (requires SOAP library)
   - Token expires every ~55 seconds
   - Recommended timeout: 45-60 seconds
   - Service may have outages without notice

3. **Avanza**:
   - Only certain lines
   - No authentication (may change)
   - Absolute time instead of relative time

### Recommended Error Handling

1. **EMT 401/403**: Renew token automatically (max 3 retries)
2. **CRTM Timeout**: Implement 24h fallback cache
3. **Avanza Error**: Use only CRTM/EMT data
4. **404**: Stop may not exist or have service

### Recommended Caching

- **EMT Login**: Cache for 50 minutes (expires at 60 minutes)
- **EMT Times**: Maximum 10 seconds
- **CRTM Auth**: Cache for 54 seconds
- **CRTM Times**: Maximum 15 seconds, fallback 24h on timeout
- **Avanza**: 30 seconds

---

## 📝 Mode Code Mapping

Different bus types have specific codes:

| Type | Code (`codMode`) | Description |
|------|------------------|-------------|
| EMT | `6` | EMT Madrid urban buses |
| Urban | `9` | Other urban buses |
| Interurban | `89` | CRTM interurban buses |

---

## 📚 References

- **EMT OpenAPI**: https://openapi.emtmadrid.es/ (requires registration for your own credentials)
- **CRTM WSDL**: http://opendata.emtmadrid.es:443/Servicios-web/BUS?wsdl
- **GTFS Specification**: https://gtfs.org/
- **Data backup**: https://github.com/xBaank/MadridTransporte-Backup
