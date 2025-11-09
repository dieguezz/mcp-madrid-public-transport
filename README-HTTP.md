# MCP Madrid Transport - HTTP Server

Este documento explica cómo usar el MCP Madrid Transport Server a través de HTTP para integrarlo con n8n u otras aplicaciones.

## 📋 Resumen

Hemos creado un servidor HTTP que expone el MCP (Model Context Protocol) de transporte de Madrid usando el transporte `StreamableHTTP` nativo del SDK de MCP. Esto permite:

- ✅ Exponer el servidor MCP vía HTTP/HTTPS
- ✅ Usar con Cloudflare Tunnel para acceso remoto
- ✅ Integrar con n8n (aunque requiere un cliente MCP)
- ✅ Health check endpoint para monitoreo

## 🚀 Inicio Rápido

### 1. Desarrollo Local

```bash
# Instalar dependencias
npm install

# Copiar y configurar .env
cp .env.example .env
# Edita .env con tus credenciales EMT

# Modo desarrollo (con auto-reload)
npm run dev:http

# O compilar y ejecutar
npm run build
npm run start:http
```

El servidor estará disponible en:
- **Health check:** http://localhost:3000/health
- **MCP endpoint:** http://localhost:3000/mcp

### 2. Producción

Sigue la guía completa en [`DEPLOYMENT.md`](./DEPLOYMENT.md) para:
- Clonar en tu servidor
- Configurar como servicio systemd
- Exponer con Cloudflare Tunnel
- Monitoreo y logs

## 🔌 Endpoints

### Health Check

```bash
GET /health
```

Respuesta:
```json
{
  "status": "ok",
  "service": "madrid-transport-mcp",
  "version": "1.0.0",
  "timestamp": "2025-11-09T..."
}
```

### MCP Endpoint

```bash
POST /mcp
```

Este endpoint implementa el protocolo MCP usando StreamableHTTP transport. Requiere:

**Headers obligatorios:**
- `Content-Type: application/json`
- `Accept: application/json, text/event-stream` (importante!)

**Para inicializar sesión:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "tu-cliente",
      "version": "1.0.0"
    }
  }
}
```

La respuesta incluirá un header `mcp-session-id` que debes usar en llamadas subsecuentes.

**Para llamadas subsecuentes:**

Agrega el header:
```
mcp-session-id: <sessionId>
```

## 🛠️ Herramientas MCP Disponibles

Una vez inicializada la sesión, puedes usar estas herramientas:

### 1. `get_metro_arrivals`

Obtiene horarios de llegada del Metro de Madrid.

**Parámetros:**
- `station` (string, requerido): Nombre o código de estación
- `line` (string, opcional): Número de línea (ej: "8")
- `direction` (string, opcional): Dirección/destino
- `count` (number, opcional): Cantidad de llegadas (default: 2)

**Ejemplo:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_metro_arrivals",
    "arguments": {
      "station": "Colombia",
      "line": "8",
      "count": 3
    }
  }
}
```

### 2. `get_bus_arrivals`

Obtiene horarios de llegada de autobuses EMT/urbanos/interurbanos.

**Parámetros:**
- `stop` (string, requerido): Nombre o número de parada
- `line` (string, opcional): Número de línea
- `direction` (string, opcional): Dirección/destino
- `count` (number, opcional): Cantidad de llegadas (default: 2)

**Ejemplo:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_bus_arrivals",
    "arguments": {
      "stop": "3000",
      "count": 2
    }
  }
}
```

### 3. `get_train_arrivals`

Obtiene horarios de llegada de trenes de Cercanías.

**Parámetros:**
- `station` (string, requerido): Nombre o código de estación
- `line` (string, opcional): Línea (ej: "C-2")
- `direction` (string, opcional): Destino
- `count` (number, opcional): Cantidad de llegadas (default: 2)

**Ejemplo:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "get_train_arrivals",
    "arguments": {
      "station": "Fuenlabrada Central",
      "count": 3
    }
  }
}
```

## 🔐 Configuración

### Variables de Entorno

Archivo `.env`:

```bash
# Debug
DEBUG=true
DEBUG_LEVEL=info

# EMT API (obligatorio - gratis en https://openapi.emtmadrid.es/)
EMT_CLIENT_ID=tu_client_id
EMT_PASS_KEY=tu_pass_key

# HTTP Server
MCP_HTTP_PORT=3000
MCP_HTTP_HOST=0.0.0.0

# Cache TTL (en segundos)
CACHE_TTL_METRO=30
CACHE_TTL_BUS=10
CACHE_TTL_TRAIN=10

# GTFS data path
GTFS_DATA_PATH=./transport-data
```

## 📚 Integración con n8n

### Importante: Limitación Actual

El servidor MCP usa **StreamableHTTP transport** que es el transporte oficial de MCP. Sin embargo, n8n actualmente **no tiene soporte nativo para MCP client**.

### Opciones para n8n:

#### Opción A: Crear Custom Node MCP Client (Recomendado para producción)

Desarrollar un nodo personalizado de n8n que implemente el protocolo MCP client. Esto requiere:

1. Crear un paquete npm con el nodo personalizado
2. Implementar el cliente MCP usando `@modelcontextprotocol/sdk`
3. Instalarlo en tu instancia de n8n

**Ventajas:**
- Integración nativa
- Uso sencillo en workflows
- Reutilizable

**Desventajas:**
- Requiere desarrollo
- Mantenimiento adicional

#### Opción B: Wrapper REST Simple (Alternativa rápida)

Si necesitas algo más simple y directo para n8n, podríamos crear un wrapper REST tradicional (sin MCP) que exponga endpoints como:

```
POST /api/metro/arrivals
POST /api/bus/arrivals
POST /api/train/arrivals
```

Esto sería más fácil de consumir desde n8n con el nodo HTTP Request estándar.

**¿Quieres que cree este wrapper REST simple?** Solo dímelo y lo agrego al proyecto.

## 🌐 Deployment con Cloudflare Tunnel

Ver documentación completa en [`DEPLOYMENT.md`](./DEPLOYMENT.md).

Resumen:
1. Clona el repo en tu servidor
2. Configura `.env` con credenciales EMT
3. Compila: `npm run build`
4. Configura systemd service
5. Agrega a Cloudflare Tunnel config:

```yaml
ingress:
  - hostname: mcp-madrid.binoid.dev
    service: http://localhost:3000
  - service: http_status:404
```

6. Agrega DNS CNAME en Cloudflare
7. Reinicia cloudflared

## 🧪 Testing

### Health Check

```bash
curl http://localhost:3000/health
```

### Script de Prueba

Incluimos un script de prueba (`test-mcp-http.mjs`) pero **requiere un cliente MCP completo** para funcionar correctamente con StreamableHTTP.

Para testing simple, usa el health check o considera el wrapper REST mencionado arriba.

## 📂 Archivos Creados

- `src/index-http.ts` - Servidor HTTP con StreamableHTTP transport
- `DEPLOYMENT.md` - Guía completa de deployment
- `n8n-workflow-example.json` - Ejemplo de workflow (requiere cliente MCP)
- `test-mcp-http.mjs` - Script de prueba (requiere cliente MCP)
- `.env.example` - Variables de entorno actualizadas
- `package.json` - Scripts `dev:http` y `start:http` agregados

## 🔄 Scripts NPM

```bash
npm run dev:http      # Desarrollo con auto-reload
npm run start:http    # Producción (requiere npm run build antes)
npm run build         # Compilar TypeScript
```

## ⚠️ Notas Importantes

1. **EMT API Credentials**: Necesitas registrarte gratis en https://openapi.emtmadrid.es/
2. **GTFS Data**: Se descarga automáticamente en `npm install` (postinstall script)
3. **Node.js Version**: Requiere Node.js >= 20.0.0
4. **MCP Protocol**: Usa el protocolo oficial MCP 2024-11-05
5. **StreamableHTTP**: Es el transporte HTTP recomendado por MCP SDK

## 🆘 Troubleshooting

### El servidor no inicia

```bash
# Ver logs
npm run dev:http

# Verificar puerto
lsof -i :3000
```

### Puerto ocupado

Cambia el puerto en `.env`:
```bash
MCP_HTTP_PORT=3001
```

### Error con EMT API

- Verifica credenciales en `.env`
- Verifica que estén activas en https://openapi.emtmadrid.es/

## 📖 Documentación Adicional

- **Deployment completo:** Ver [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- **Estructura DDD:** Ver [`CLAUDE.md`](./CLAUDE.md)
- **MCP Protocol:** https://modelcontextprotocol.io/
- **EMT API:** https://openapi.emtmadrid.es/

## 💡 Próximos Pasos

Te recomiendo:

1. **Para n8n:** Decidir entre:
   - Crear custom node MCP client (más trabajo, mejor integración)
   - Crear wrapper REST simple (menos trabajo, más directo)

2. **Deployment:** Seguir la guía en `DEPLOYMENT.md` para producción

3. **Testing:** Probar el health check y verificar que el servidor arranca correctamente

¿Necesitas que cree el wrapper REST simple para facilitar la integración con n8n? ¡Avísame!
