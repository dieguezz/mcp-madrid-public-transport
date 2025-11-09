# 🎯 RESUMEN FINAL - MCP Madrid Transport con Podman/Docker

## ✅ Lo que hemos creado

Has pedido ayuda para consumir este MCP server desde n8n en tu servidor. Te he preparado una **solución completa con Podman/Docker + systemd**.

### 📦 Archivos Nuevos Creados

#### 1. Servidor HTTP
- **`src/index-http.ts`** - Servidor HTTP con transporte StreamableHTTP de MCP
- Expone el MCP via HTTP en puerto 3000
- Compatible con el nodo "MCP Client" de n8n
- Health check en `/health`
- MCP endpoint en `/mcp`

#### 2. Docker/Podman
- **`Dockerfile`** - Multi-stage build optimizado
  - Imagen final basada en Alpine (pequeña)
  - Usuario non-root
  - Health check integrado
  - Tini como init system

- **`docker-compose.yml`** - Para desarrollo/testing local
  - Variables de entorno configurables
  - Volúmenes para persistencia
  - Health check automático

- **`.dockerignore`** - Ya existía, optimiza el build

#### 3. Podman + systemd (⭐ Tu preferencia)
- **`podman/mcp-madrid-transport.container`** - Quadlet unit file
  - Integración nativa con systemd
  - Auto-start al boot
  - Rootless (sin privilegios de root)
  - Health checks automáticos

- **`podman/mcp-madrid-transport.env.example`** - Variables de entorno
  - Template para configuración
  - Credenciales EMT
  - Configuración de cache y puertos

#### 4. Documentación
- **`DEPLOYMENT-PODMAN.md`** - Guía completa paso a paso para Podman
- **`DEPLOYMENT.md`** - Guía original (npm directo)
- **`README-HTTP.md`** - Documentación del servidor HTTP
- **`n8n-workflow-example.json`** - Workflow de ejemplo para n8n
- **`test-mcp-http.mjs`** - Script de prueba

#### 5. Configuración
- **`package.json`** - Agregados scripts:
  - `npm run dev:http` - Desarrollo con auto-reload
  - `npm run start:http` - Producción

- **`.env.example`** - Actualizado con variables HTTP

## 🚀 Deployment RÁPIDO (Copia y Pega)

### En tu servidor (donde corre n8n):

```bash
# 1. Clonar repo
cd ~
git clone https://github.com/dieguezz/mcp-madrid-public-transport.git
cd mcp-madrid-public-transport

# 2. Build imagen con Podman
podman build -t mcp-madrid-transport:latest .

# 3. Crear directorios
mkdir -p ~/.config/containers/systemd
mkdir -p ~/.local/share/mcp-madrid-transport/{logs,data}

# 4. Configurar variables de entorno
cp podman/mcp-madrid-transport.env.example \
   ~/.config/containers/systemd/mcp-madrid-transport.env

# Edita con tus credenciales EMT
nano ~/.config/containers/systemd/mcp-madrid-transport.env

# 5. Instalar Quadlet unit
cp podman/mcp-madrid-transport.container \
   ~/.config/containers/systemd/

# 6. Activar servicio
systemctl --user daemon-reload
systemctl --user enable mcp-madrid-transport.service
systemctl --user start mcp-madrid-transport.service

# 7. Habilitar linger (para que corra sin login)
sudo loginctl enable-linger $USER

# 8. Verificar
systemctl --user status mcp-madrid-transport.service
curl http://localhost:3000/health
```

## ☁️ Cloudflare Tunnel

Edita `~/.cloudflared/config.yml`:

```yaml
ingress:
  - hostname: n8n.binoid.dev
    service: http://localhost:5678

  - hostname: mcp-madrid.binoid.dev  # ⬅️ NUEVO
    service: http://localhost:3000   # ⬅️ NUEVO

  - service: http_status:404
```

Luego:
```bash
# Reiniciar cloudflared
sudo systemctl restart cloudflared

# O si usas Podman para cloudflared:
systemctl --user restart cloudflared.service

# Agregar DNS CNAME en dashboard de Cloudflare:
# Type: CNAME
# Name: mcp-madrid
# Target: tu-tunnel-id.cfargotunnel.com
# Proxy: ON (nube naranja)

# Probar
curl https://mcp-madrid.binoid.dev/health
```

## 🔌 Configurar en n8n

En n8n, agrega un nodo **"MCP Client"**:

| Campo | Valor |
|-------|-------|
| **Endpoint** | `https://mcp-madrid.binoid.dev/mcp` |
| **Server Transport** | HTTP Streamable |
| **Authentication** | None |
| **Tools to Include** | All |

Eso es TODO. n8n automáticamente detectará las 3 herramientas:
- `get_metro_arrivals` - Metro de Madrid
- `get_bus_arrivals` - Autobuses EMT/urbanos/interurbanos
- `get_train_arrivals` - Cercanías Renfe

## 🛠️ Gestión del Servicio

```bash
# Ver logs en tiempo real
journalctl --user -u mcp-madrid-transport.service -f

# Ver estado
systemctl --user status mcp-madrid-transport.service

# Reiniciar
systemctl --user restart mcp-madrid-transport.service

# Detener
systemctl --user stop mcp-madrid-transport.service

# Ver logs del contenedor
podman logs -f mcp-madrid-transport
```

## 🔄 Actualizar a Nueva Versión

```bash
cd ~/mcp-madrid-public-transport
git pull
podman build -t mcp-madrid-transport:latest .
systemctl --user restart mcp-madrid-transport.service
```

## 📊 Herramientas MCP Disponibles

### 1. `get_metro_arrivals`
```json
{
  "station": "Colombia",
  "line": "8",
  "count": 3
}
```

### 2. `get_bus_arrivals`
```json
{
  "stop": "3000",
  "count": 2
}
```

### 3. `get_train_arrivals`
```json
{
  "station": "Fuenlabrada Central",
  "count": 3
}
```

## 📚 Documentación Completa

- **`DEPLOYMENT-PODMAN.md`** - Guía detallada con troubleshooting, monitoreo, backup, etc.
- **`README-HTTP.md`** - Documentación técnica del servidor HTTP
- **`DEPLOYMENT.md`** - Método alternativo sin Docker (npm directo)

## ⚠️ Importante

### Credenciales EMT (Obligatorias)

**DEBES** obtener credenciales gratis en https://openapi.emtmadrid.es/:

1. Regístrate (gratis)
2. Crea una aplicación
3. Copia Client ID y Pass Key
4. Agrégalos al archivo `.env`

Sin estas credenciales, el servidor arrancará pero **los autobuses no funcionarán**.

### Linger

Para que el servicio corra sin que estés logueado:
```bash
sudo loginctl enable-linger $USER
```

## 🎯 Ventajas de esta Solución

✅ **Rootless**: Todo corre sin privilegios de root
✅ **systemd nativo**: Gestión con comandos systemctl estándar
✅ **Auto-start**: Arranca al boot automáticamente
✅ **Health checks**: Monitoreo automático
✅ **Logs centralizados**: Todo en journald
✅ **Fácil actualización**: Git pull + rebuild + restart
✅ **Compatible con n8n**: Nodo MCP Client funciona directamente
✅ **Cloudflare Tunnel ready**: Sin abrir puertos en firewall

## 🔍 Debugging Rápido

### El servicio no arranca
```bash
journalctl --user -u mcp-madrid-transport.service -n 50
```

### Puerto ocupado
```bash
sudo lsof -i :3000
```

### Probar manualmente
```bash
podman run --rm -p 3000:3000 \
  --env-file ~/.config/containers/systemd/mcp-madrid-transport.env \
  mcp-madrid-transport:latest
```

### Health check manual
```bash
curl http://localhost:3000/health
```

## 📝 Checklist Final

Antes de usar en producción:

- [ ] Repo clonado en servidor
- [ ] Imagen built con Podman
- [ ] Variables de entorno configuradas (especialmente EMT_CLIENT_ID y EMT_PASS_KEY)
- [ ] Quadlet unit instalado
- [ ] Servicio habilitado y started
- [ ] Linger habilitado
- [ ] Health check responde OK
- [ ] Cloudflare Tunnel configurado
- [ ] DNS CNAME agregado en Cloudflare
- [ ] Endpoint público accesible
- [ ] n8n configurado con nodo MCP Client
- [ ] Prueba de herramienta desde n8n funciona

## 🆘 Si algo falla

1. **Ver logs**: `journalctl --user -u mcp-madrid-transport.service -f`
2. **Verificar health**: `curl http://localhost:3000/health`
3. **Ver estado contenedor**: `podman ps -a | grep mcp`
4. **Revisar documentación**: `DEPLOYMENT-PODMAN.md` tiene troubleshooting detallado
5. **Abrir issue** en GitHub si nada funciona

## 🎉 ¡Y eso es todo!

Tienes una solución completa, production-ready, con Podman + systemd para desplegar tu MCP server y usarlo desde n8n.

La configuración es **rootless**, **auto-start**, **monitoreada con health checks**, y **súper fácil de gestionar** con systemctl.

¡Disfruta! 🚇🚌🚆
