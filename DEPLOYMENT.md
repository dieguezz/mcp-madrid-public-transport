# Deployment Guide - MCP Madrid Transport HTTP Server

Esta guía te ayudará a desplegar el servidor MCP de transporte de Madrid en tu servidor n8n usando Cloudflare Tunnel.

## 📋 Requisitos Previos

- Servidor con acceso SSH donde corre n8n
- Node.js >= 20.0.0 instalado
- Git instalado
- Cloudflare Tunnel configurado (cloudflared)
- Credenciales EMT API (gratuitas)

## 🚀 Paso 1: Clonar y Configurar en el Servidor

### 1.1 Conectar al servidor vía SSH

```bash
ssh tu-usuario@tu-servidor
```

### 1.2 Clonar el repositorio

```bash
# Navega a un directorio adecuado (ej: /opt o /home/tu-usuario)
cd /opt  # o cd ~

# Clona el repositorio
git clone https://github.com/dieguezz/mcp-madrid-public-transport.git
cd mcp-madrid-public-transport
```

### 1.3 Instalar dependencias

```bash
npm install
```

Esto automáticamente:
- Instalará todas las dependencias
- Descomprimirá los datos GTFS
- Preparará la base de datos SQLite

### 1.4 Configurar variables de entorno

```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita el archivo .env con tus credenciales
nano .env  # o vim .env
```

Configuración mínima necesaria en `.env`:

```bash
# Debug (opcional, útil al inicio)
DEBUG=true
DEBUG_LEVEL=info

# EMT API - OBLIGATORIO
# Registrate GRATIS en https://openapi.emtmadrid.es/
EMT_CLIENT_ID=tu_client_id_aqui
EMT_PASS_KEY=tu_pass_key_aqui

# HTTP Server settings
MCP_HTTP_PORT=3000
MCP_HTTP_HOST=0.0.0.0

# El resto puede quedarse con los valores por defecto
```

### 1.5 Obtener credenciales EMT (Gratis)

1. Ve a https://openapi.emtmadrid.es/
2. Regístrate (es gratis)
3. Ve a "Mi Cuenta" > "Mis Aplicaciones"
4. Crea una nueva aplicación
5. Copia el `Client ID` y `Pass Key` al archivo `.env`

### 1.6 Compilar el proyecto

```bash
npm run build
```

### 1.7 Probar el servidor localmente

```bash
npm run start:http
```

Deberías ver algo como:

```
🚇 Madrid Transport MCP Server (HTTP)
📡 Listening on: http://0.0.0.0:3000
💚 Health check: http://0.0.0.0:3000/health
🔌 MCP endpoint: http://0.0.0.0:3000/mcp

Ready to accept MCP connections!
```

Prueba el health check:

```bash
curl http://localhost:3000/health
```

Deberías recibir:

```json
{
  "status": "ok",
  "service": "madrid-transport-mcp",
  "version": "1.0.0",
  "timestamp": "2025-11-09T..."
}
```

Si funciona, presiona `Ctrl+C` para detenerlo.

## 🔄 Paso 2: Configurar como Servicio (systemd)

Para que el servidor se inicie automáticamente y se mantenga corriendo:

### 2.1 Crear archivo de servicio

```bash
sudo nano /etc/systemd/system/mcp-madrid-transport.service
```

Contenido del archivo:

```ini
[Unit]
Description=MCP Madrid Transport HTTP Server
After=network.target

[Service]
Type=simple
User=tu-usuario
WorkingDirectory=/opt/mcp-madrid-public-transport
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/mcp-madrid-public-transport/dist/index-http.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/mcp-madrid-transport.log
StandardError=append:/var/log/mcp-madrid-transport-error.log

[Install]
WantedBy=multi-user.target
```

**Importante:** Cambia `tu-usuario` por tu usuario real y ajusta las rutas si clonaste el repo en otro lugar.

### 2.2 Habilitar e iniciar el servicio

```bash
# Recargar systemd
sudo systemctl daemon-reload

# Habilitar para inicio automático
sudo systemctl enable mcp-madrid-transport

# Iniciar el servicio
sudo systemctl start mcp-madrid-transport

# Verificar el estado
sudo systemctl status mcp-madrid-transport
```

### 2.3 Ver logs

```bash
# Logs en tiempo real
sudo journalctl -u mcp-madrid-transport -f

# O ver el archivo de log
sudo tail -f /var/log/mcp-madrid-transport.log
```

## ☁️ Paso 3: Exponer con Cloudflare Tunnel

### 3.1 Verificar que cloudflared esté instalado

```bash
cloudflared --version
```

Si no está instalado, sigue la [guía oficial de Cloudflare](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/).

### 3.2 Configurar el tunnel

Edita tu archivo de configuración de Cloudflare Tunnel (usualmente en `~/.cloudflared/config.yml`):

```yaml
tunnel: tu-tunnel-id
credentials-file: /home/tu-usuario/.cloudflared/tu-tunnel-id.json

ingress:
  # n8n existente
  - hostname: n8n.binoid.dev
    service: http://localhost:5678

  # Nuevo: MCP Madrid Transport
  - hostname: mcp-madrid.binoid.dev
    service: http://localhost:3000

  # Regla catch-all (debe ser la última)
  - service: http_status:404
```

**Nota:** Cambia `mcp-madrid.binoid.dev` por el subdominio que prefieras.

### 3.3 Agregar DNS en Cloudflare

1. Ve a tu dashboard de Cloudflare
2. Selecciona tu dominio (`binoid.dev`)
3. Ve a DNS > Records
4. Agrega un registro CNAME:
   - **Type:** CNAME
   - **Name:** mcp-madrid (o el subdominio que elegiste)
   - **Target:** tu-tunnel-id.cfargotunnel.com
   - **Proxy status:** Proxied (nube naranja)

### 3.4 Reiniciar cloudflared

```bash
sudo systemctl restart cloudflared
# o si lo corres manualmente:
cloudflared tunnel run tu-tunnel-name
```

### 3.5 Probar el endpoint público

```bash
curl https://mcp-madrid.binoid.dev/health
```

Deberías ver:

```json
{
  "status": "ok",
  "service": "madrid-transport-mcp",
  "version": "1.0.0",
  "timestamp": "..."
}
```

## 🔌 Paso 4: Consumir desde n8n

### 4.1 Opciones para usar en n8n

Como n8n no tiene soporte nativo de MCP client (aún), tienes dos opciones:

#### Opción A: Crear un Custom Node (Recomendado futuro)

Crear un nodo personalizado de n8n que actúe como MCP client. Esto requiere desarrollo adicional.

#### Opción B: Usar HTTP Request con MCP protocol (Actual)

Usar el nodo HTTP Request de n8n para hacer llamadas MCP directamente.

### 4.2 Ejemplo: Crear workflow en n8n

1. **Nodo 1: Initialize MCP Session**

   - **Tipo:** HTTP Request
   - **Method:** POST
   - **URL:** `https://mcp-madrid.binoid.dev/mcp`
   - **Headers:**
     ```json
     {
       "Content-Type": "application/json"
     }
     ```
   - **Body (JSON):**
     ```json
     {
       "jsonrpc": "2.0",
       "id": 1,
       "method": "initialize",
       "params": {
         "protocolVersion": "2024-11-05",
         "capabilities": {},
         "clientInfo": {
           "name": "n8n",
           "version": "1.0.0"
         }
       }
     }
     ```

   Esto devolverá un `sessionId` en el header de respuesta.

2. **Nodo 2: List Tools**

   - **Tipo:** HTTP Request
   - **Method:** POST
   - **URL:** `https://mcp-madrid.binoid.dev/mcp`
   - **Headers:**
     ```json
     {
       "Content-Type": "application/json",
       "mcp-session-id": "{{ $('Initialize MCP Session').item.json.sessionId }}"
     }
     ```
   - **Body (JSON):**
     ```json
     {
       "jsonrpc": "2.0",
       "id": 2,
       "method": "tools/list"
     }
     ```

3. **Nodo 3: Get Metro Arrivals**

   - **Tipo:** HTTP Request
   - **Method:** POST
   - **URL:** `https://mcp-madrid.binoid.dev/mcp`
   - **Headers:**
     ```json
     {
       "Content-Type": "application/json",
       "mcp-session-id": "{{ sessionId from previous }}"
     }
     ```
   - **Body (JSON):**
     ```json
     {
       "jsonrpc": "2.0",
       "id": 3,
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

### 4.3 Ejemplo de respuesta

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"station\":\"Colombia\",\"arrivals\":[...]}"
      }
    ]
  }
}
```

## 🛡️ Paso 5: Seguridad (Opcional pero Recomendado)

### 5.1 Agregar autenticación básica

Edita el archivo `src/index-http.ts` y agrega:

```typescript
// Agregar después de app.use(express.json())
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${process.env.MCP_API_KEY}`;

  if (authHeader !== expectedAuth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});
```

Luego agrega a tu `.env`:

```bash
MCP_API_KEY=tu_clave_secreta_aqui
```

Recompila y reinicia:

```bash
npm run build
sudo systemctl restart mcp-madrid-transport
```

### 5.2 Rate limiting con Cloudflare

1. Ve a tu dashboard de Cloudflare
2. Security > WAF > Rate limiting rules
3. Crea una regla para `mcp-madrid.binoid.dev`
4. Limita a 60 requests por minuto por IP

## 📊 Paso 6: Monitoreo

### 6.1 Ver logs del servicio

```bash
# Logs en tiempo real
sudo journalctl -u mcp-madrid-transport -f

# Últimas 100 líneas
sudo journalctl -u mcp-madrid-transport -n 100

# Logs de errores
sudo tail -f /var/log/mcp-madrid-transport-error.log
```

### 6.2 Verificar que está corriendo

```bash
# Estado del servicio
sudo systemctl status mcp-madrid-transport

# Ver proceso
ps aux | grep index-http

# Ver puerto escuchando
sudo netstat -tulpn | grep :3000
```

### 6.3 Health check automático

Puedes configurar un cron job para verificar:

```bash
# Editar crontab
crontab -e

# Agregar (verifica cada 5 minutos)
*/5 * * * * curl -f http://localhost:3000/health || systemctl restart mcp-madrid-transport
```

## 🔧 Troubleshooting

### El servidor no inicia

```bash
# Ver logs detallados
sudo journalctl -u mcp-madrid-transport -n 50

# Verificar permisos
ls -la /opt/mcp-madrid-public-transport

# Verificar puerto no está en uso
sudo lsof -i :3000
```

### Cloudflare tunnel no funciona

```bash
# Ver logs de cloudflared
sudo journalctl -u cloudflared -f

# Verificar configuración
cloudflared tunnel info tu-tunnel-name

# Probar conexión local primero
curl http://localhost:3000/health
```

### EMT API devuelve errores

Verifica en los logs:

```bash
sudo journalctl -u mcp-madrid-transport | grep EMT
```

Posibles causas:
- Credenciales incorrectas
- Token expirado (se renueva automáticamente)
- Límite de rate limit EMT alcanzado

### n8n no puede conectar

1. Verifica que el endpoint esté accesible:
   ```bash
   curl https://mcp-madrid.binoid.dev/health
   ```

2. Verifica headers CORS si es necesario

3. Revisa los logs del servidor MCP

## 🔄 Actualización del Servidor

Para actualizar a una nueva versión:

```bash
cd /opt/mcp-madrid-public-transport

# Pull últimos cambios
git pull

# Instalar nuevas dependencias
npm install

# Recompilar
npm run build

# Reiniciar servicio
sudo systemctl restart mcp-madrid-transport

# Verificar logs
sudo journalctl -u mcp-madrid-transport -f
```

## 📚 Recursos Adicionales

- **MCP Protocol:** https://modelcontextprotocol.io/
- **Cloudflare Tunnels:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **EMT API Docs:** https://openapi.emtmadrid.es/
- **n8n Docs:** https://docs.n8n.io/

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs: `sudo journalctl -u mcp-madrid-transport -f`
2. Verifica el health check: `curl http://localhost:3000/health`
3. Abre un issue en GitHub: https://github.com/dieguezz/mcp-madrid-public-transport/issues

## 📝 Notas Finales

- **Backup:** Considera hacer backup de tu archivo `.env` con las credenciales
- **Monitoreo:** Configura alertas si el servicio se cae
- **Logs:** Los logs pueden crecer, considera rotación de logs
- **Actualizaciones:** Mantén el repositorio actualizado para nuevas features y fixes

¡Disfruta de tu servidor MCP de transporte de Madrid! 🚇🚌🚆
