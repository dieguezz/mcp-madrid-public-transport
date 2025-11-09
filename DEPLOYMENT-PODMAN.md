# Deployment con Podman y systemd

Esta guía explica cómo desplegar el MCP Madrid Transport Server usando Podman con integración systemd (Podman Quadlet).

## 🐳 ¿Por qué Podman + systemd?

- ✅ **Rootless**: Corre sin privilegios de root
- ✅ **Systemd nativo**: Integración perfecta con systemd
- ✅ **Auto-start**: Arranca automáticamente al iniciar el sistema
- ✅ **Gestión simple**: Usa comandos systemctl estándar
- ✅ **Compatible**: Drop-in replacement para Docker

## 📋 Requisitos Previos

- Servidor Linux con Podman instalado (>= 4.4)
- systemd
- Acceso SSH al servidor
- Credenciales EMT API (gratuitas)

## 🚀 Opción 1: Deployment Rápido (Recomendado)

### 1. Preparar el servidor

```bash
# Conectar al servidor
ssh tu-usuario@tu-servidor

# Crear directorios
mkdir -p ~/mcp-madrid-transport
cd ~/mcp-madrid-transport

# Clonar repositorio
git clone https://github.com/dieguezz/mcp-madrid-public-transport.git .
```

### 2. Construir la imagen

```bash
# Build de la imagen con Podman
podman build -t mcp-madrid-transport:latest .

# Verificar que se creó
podman images | grep mcp-madrid-transport
```

### 3. Configurar variables de entorno

```bash
# Crear directorio para systemd user units
mkdir -p ~/.config/containers/systemd

# Copiar archivo de variables de entorno
cp podman/mcp-madrid-transport.env.example \
   ~/.config/containers/systemd/mcp-madrid-transport.env

# Editar con tus credenciales
nano ~/.config/containers/systemd/mcp-madrid-transport.env
```

Contenido mínimo del `.env`:
```bash
DEBUG=false
EMT_CLIENT_ID=tu_client_id_aqui
EMT_PASS_KEY=tu_pass_key_aqui
MCP_HTTP_PORT=3000
MCP_HTTP_HOST=0.0.0.0
```

### 4. Instalar Quadlet Unit

```bash
# Copiar el archivo .container
cp podman/mcp-madrid-transport.container \
   ~/.config/containers/systemd/

# Crear directorios para datos persistentes
mkdir -p ~/.local/share/mcp-madrid-transport/{logs,data}

# Recargar systemd
systemctl --user daemon-reload
```

### 5. Iniciar el servicio

```bash
# Habilitar auto-start
systemctl --user enable mcp-madrid-transport.service

# Iniciar el servicio
systemctl --user start mcp-madrid-transport.service

# Verificar estado
systemctl --user status mcp-madrid-transport.service
```

### 6. Habilitar linger (opcional pero recomendado)

Esto permite que el servicio siga corriendo aunque no estés logueado:

```bash
sudo loginctl enable-linger $USER
```

### 7. Verificar funcionamiento

```bash
# Ver logs
journalctl --user -u mcp-madrid-transport.service -f

# Probar health check
curl http://localhost:3000/health
```

Deberías ver:
```json
{
  "status": "ok",
  "service": "madrid-transport-mcp",
  "version": "1.0.0"
}
```

## 🌐 Opción 2: Docker Compose (Para desarrollo/testing)

Si prefieres usar docker-compose localmente:

```bash
# Copiar .env de ejemplo
cp .env.example .env

# Editar con tus credenciales
nano .env

# Iniciar con docker-compose
docker-compose up -d

# O con podman-compose
podman-compose up -d

# Ver logs
docker-compose logs -f
# o
podman-compose logs -f

# Detener
docker-compose down
# o
podman-compose down
```

## ☁️ Exponer con Cloudflare Tunnel

### 1. Configurar Cloudflare Tunnel

Edita tu configuración de cloudflared (ej: `~/.cloudflared/config.yml`):

```yaml
tunnel: tu-tunnel-id
credentials-file: /home/tu-usuario/.cloudflared/tu-tunnel-id.json

ingress:
  # n8n existente
  - hostname: n8n.binoid.dev
    service: http://localhost:5678

  # MCP Madrid Transport
  - hostname: mcp-madrid.binoid.dev
    service: http://localhost:3000

  # Catch-all
  - service: http_status:404
```

### 2. Agregar DNS en Cloudflare

1. Ve al dashboard de Cloudflare
2. Selecciona tu dominio
3. DNS > Records > Add record:
   - **Type**: CNAME
   - **Name**: mcp-madrid (o el que prefieras)
   - **Target**: tu-tunnel-id.cfargotunnel.com
   - **Proxy status**: Proxied (nube naranja)

### 3. Reiniciar cloudflared

```bash
sudo systemctl restart cloudflared

# O si usas Podman para cloudflared también:
systemctl --user restart cloudflared.service
```

### 4. Probar acceso público

```bash
curl https://mcp-madrid.binoid.dev/health
```

## 🔧 Gestión del Servicio

### Comandos útiles

```bash
# Ver estado
systemctl --user status mcp-madrid-transport.service

# Ver logs en tiempo real
journalctl --user -u mcp-madrid-transport.service -f

# Ver últimas 100 líneas de logs
journalctl --user -u mcp-madrid-transport.service -n 100

# Reiniciar servicio
systemctl --user restart mcp-madrid-transport.service

# Detener servicio
systemctl --user stop mcp-madrid-transport.service

# Deshabilitar auto-start
systemctl --user disable mcp-madrid-transport.service

# Ver logs del contenedor directamente
podman logs -f mcp-madrid-transport
```

### Actualizar a nueva versión

```bash
cd ~/mcp-madrid-transport

# Pull cambios
git pull

# Rebuild imagen
podman build -t mcp-madrid-transport:latest .

# Reiniciar servicio (automáticamente usa la nueva imagen)
systemctl --user restart mcp-madrid-transport.service
```

## 🔍 Debugging

### El servicio no inicia

```bash
# Ver logs detallados
journalctl --user -u mcp-madrid-transport.service -n 100 --no-pager

# Ver si el contenedor existe
podman ps -a | grep mcp-madrid-transport

# Ver logs del contenedor
podman logs mcp-madrid-transport

# Probar manualmente
podman run --rm -p 3000:3000 \
  --env-file ~/.config/containers/systemd/mcp-madrid-transport.env \
  mcp-madrid-transport:latest
```

### Puerto ocupado

```bash
# Ver qué está usando el puerto 3000
sudo lsof -i :3000

# O cambiar puerto en el .env
nano ~/.config/containers/systemd/mcp-madrid-transport.env
# Cambiar MCP_HTTP_PORT=3001

# Y en el .container file
nano ~/.config/containers/systemd/mcp-madrid-transport.container
# Cambiar PublishPort=3001:3000

systemctl --user daemon-reload
systemctl --user restart mcp-madrid-transport.service
```

### Problemas con permisos

```bash
# Verificar que los directorios existen y tienen permisos correctos
ls -la ~/.local/share/mcp-madrid-transport/

# Si hay problemas, recrearlos
rm -rf ~/.local/share/mcp-madrid-transport
mkdir -p ~/.local/share/mcp-madrid-transport/{logs,data}
```

### EMT API devuelve errores

```bash
# Ver logs específicos de EMT
journalctl --user -u mcp-madrid-transport.service | grep EMT

# Verificar credenciales en el .env
cat ~/.config/containers/systemd/mcp-madrid-transport.env | grep EMT
```

## 📊 Monitoreo

### Health checks automáticos

El contenedor tiene health checks built-in. Para verlos:

```bash
# Ver health status
podman healthcheck run mcp-madrid-transport

# Ver estado del contenedor (incluye health)
podman inspect mcp-madrid-transport | grep -A 10 Health
```

### Cron job para verificación

```bash
# Editar crontab
crontab -e

# Agregar (verifica cada 5 minutos y reinicia si falla)
*/5 * * * * curl -f http://localhost:3000/health || systemctl --user restart mcp-madrid-transport.service
```

## 🔐 Seguridad (Opcional)

### Agregar autenticación con Bearer token

Si quieres proteger el endpoint:

1. Agrega al `.env`:
```bash
MCP_API_KEY=tu_clave_secreta_super_larga_y_aleatoria
```

2. Contacta conmigo para agregar el middleware de autenticación al código

3. Rebuild y restart:
```bash
podman build -t mcp-madrid-transport:latest .
systemctl --user restart mcp-madrid-transport.service
```

### Firewall

Si usas firewall, permite el puerto 3000:

```bash
# Con firewalld
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Con ufw
sudo ufw allow 3000/tcp
```

Pero si usas Cloudflare Tunnel, **no necesitas abrir puertos** (una ventaja enorme).

## 🔄 Backup

### Datos a respaldar

```bash
# Variables de entorno (contiene credenciales)
~/.config/containers/systemd/mcp-madrid-transport.env

# Logs (opcional)
~/.local/share/mcp-madrid-transport/logs/

# Database (si persiste datos)
~/.local/share/mcp-madrid-transport/data/
```

### Script de backup simple

```bash
#!/bin/bash
BACKUP_DIR=~/backups/mcp-madrid-transport
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup .env
cp ~/.config/containers/systemd/mcp-madrid-transport.env \
   $BACKUP_DIR/mcp-madrid-transport.env.$DATE

# Backup data
tar -czf $BACKUP_DIR/data.$DATE.tar.gz \
   ~/.local/share/mcp-madrid-transport/data/

echo "Backup completed: $BACKUP_DIR"
```

## 📚 Recursos

- **Podman Quadlet**: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- **Cloudflare Tunnel**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **EMT API**: https://openapi.emtmadrid.es/

## 🆘 Soporte

Si tienes problemas:

1. Revisa logs: `journalctl --user -u mcp-madrid-transport.service -f`
2. Verifica health: `curl http://localhost:3000/health`
3. Abre issue en GitHub

## 📝 Notas Finales

- **Rootless Podman**: Todo corre sin privilegios de root, más seguro
- **Systemd integration**: El servicio se comporta como cualquier otro servicio systemd
- **Logs**: Todo va a journald, puedes usar journalctl para ver logs
- **Auto-restart**: El contenedor se reiniciará automáticamente si falla
- **Updates**: Simple `git pull`, rebuild, restart

¡Disfruta de tu servidor MCP con Podman! 🚇🚌🚆
