#!/bin/sh

# Script para descomprimir archivos GTFS y bases de datos SQLite
# Se usa en desarrollo local y en Docker build

set -e

echo "📦 Descomprimiendo archivos GTFS y bases de datos..."

# Función para descomprimir archivos .zip en un directorio
decompress_directory() {
    local dir=$1
    local count=0

    if [ ! -d "$dir" ]; then
        return
    fi

    echo "📁 Procesando: $dir"

    # Encontrar todos los archivos .txt.zip
    find "$dir" -name "*.txt.zip" -type f | while read -r zipfile; do
        # Obtener el nombre del archivo sin .zip
        txtfile="${zipfile%.zip}"

        # Si el .txt ya existe, skip
        if [ -f "$txtfile" ]; then
            echo "  ⏭️  Ya existe: $(basename "$txtfile")"
            continue
        fi

        echo "  📂 Descomprimiendo: $(basename "$zipfile")"
        unzip -q -o "$zipfile" -d "$(dirname "$zipfile")"

        if [ $? -eq 0 ]; then
            echo "  ✅ Descomprimido: $(basename "$txtfile")"
            count=$((count + 1))
        else
            echo "  ❌ Error descomprimiendo: $zipfile"
        fi
    done

    if [ $count -gt 0 ]; then
        echo "  ✨ $count archivos descomprimidos en $(basename "$dir")"
    fi
}

# Descomprimir cada categoría de transporte
decompress_directory "transport-data/metro"
decompress_directory "transport-data/bus/emt"
decompress_directory "transport-data/bus/urban"
decompress_directory "transport-data/bus/interurban"
decompress_directory "transport-data/train"

# Descomprimir bases de datos SQLite
echo ""
echo "📊 Descomprimiendo bases de datos SQLite..."

decompress_database() {
    local zipfile=$1

    if [ ! -f "$zipfile" ]; then
        return
    fi

    # Obtener el nombre del archivo sin .zip
    local dbfile="${zipfile%.zip}"

    # Si el .db ya existe, skip
    if [ -f "$dbfile" ]; then
        echo "  ⏭️  Ya existe: $(basename "$dbfile")"
        return
    fi

    echo "  📂 Descomprimiendo: $(basename "$zipfile")"
    unzip -q -o "$zipfile" -d "$(dirname "$zipfile")"

    if [ $? -eq 0 ]; then
        echo "  ✅ Descomprimido: $(basename "$dbfile")"
    else
        echo "  ❌ Error descomprimiendo: $zipfile"
    fi
}

# Descomprimir gtfs-static.db si existe comprimido
decompress_database "gtfs-static.db.zip"

echo ""
echo "✅ Descompresión completada"
echo ""
