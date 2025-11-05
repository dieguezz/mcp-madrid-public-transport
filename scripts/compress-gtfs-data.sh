#!/bin/bash

# Script para comprimir archivos GTFS grandes y bases de datos SQLite
# Los archivos .txt grandes de GTFS y .db se comprimen individualmente
# para reducir el tamaño del repositorio Git

set -e

echo "🗜️  Comprimiendo archivos GTFS y bases de datos..."

# Función para comprimir archivos .txt en un directorio
compress_directory() {
    local dir=$1
    echo "📁 Procesando: $dir"

    # Encontrar todos los archivos .txt mayores de 100KB
    find "$dir" -name "*.txt" -type f -size +100k | while read -r file; do
        # Skip si ya existe el .zip
        if [ -f "${file}.zip" ]; then
            echo "  ⏭️  Ya existe: ${file}.zip"
            continue
        fi

        # Obtener tamaño del archivo
        size=$(du -h "$file" | cut -f1)

        echo "  📦 Comprimiendo: $(basename "$file") ($size)"
        zip -j "${file}.zip" "$file"

        # Verificar que el zip se creó correctamente
        if [ $? -eq 0 ]; then
            compressed_size=$(du -h "${file}.zip" | cut -f1)
            echo "  ✅ Comprimido: $(basename "$file").zip ($compressed_size)"

            # NO eliminamos el archivo original aún - eso lo hace el usuario manualmente
            # después de verificar que todo funciona
        else
            echo "  ❌ Error comprimiendo: $file"
            rm -f "${file}.zip"
        fi
    done
}

# Comprimir cada categoría de transporte
if [ -d "transport-data/metro" ]; then
    compress_directory "transport-data/metro"
fi

if [ -d "transport-data/bus/emt" ]; then
    compress_directory "transport-data/bus/emt"
fi

if [ -d "transport-data/bus/urban" ]; then
    compress_directory "transport-data/bus/urban"
fi

if [ -d "transport-data/bus/interurban" ]; then
    compress_directory "transport-data/bus/interurban"
fi

if [ -d "transport-data/train" ]; then
    compress_directory "transport-data/train"
fi

# Comprimir bases de datos SQLite grandes (>10MB)
echo ""
echo "📊 Comprimiendo bases de datos SQLite..."

compress_database() {
    local dbfile=$1

    if [ ! -f "$dbfile" ]; then
        return
    fi

    # Verificar tamaño (>10MB = 10240KB)
    local size_kb=$(du -k "$dbfile" | cut -f1)
    if [ $size_kb -lt 10240 ]; then
        echo "  ⏭️  Saltando (< 10MB): $(basename "$dbfile")"
        return
    fi

    # Skip si ya existe el .zip
    if [ -f "${dbfile}.zip" ]; then
        echo "  ⏭️  Ya existe: ${dbfile}.zip"
        return
    fi

    local size=$(du -h "$dbfile" | cut -f1)
    echo "  📦 Comprimiendo: $(basename "$dbfile") ($size)"

    zip -j "${dbfile}.zip" "$dbfile"

    if [ $? -eq 0 ]; then
        local compressed_size=$(du -h "${dbfile}.zip" | cut -f1)
        echo "  ✅ Comprimido: $(basename "$dbfile").zip ($compressed_size)"
    else
        echo "  ❌ Error comprimiendo: $dbfile"
        rm -f "${dbfile}.zip"
    fi
}

# Comprimir gtfs-static.db si existe
compress_database "gtfs-static.db"

echo ""
echo "✅ Compresión completada"
echo ""
echo "⚠️  IMPORTANTE: Los archivos .txt originales NO han sido eliminados."
echo "   Verifica que los .zip funcionen correctamente antes de eliminarlos."
echo ""
echo "Para eliminar los archivos .txt originales después de verificar:"
echo "   find transport-data -name '*.txt' -type f -size +100k -delete"
echo ""
echo "Para descomprimir (en desarrollo local):"
echo "   npm run setup:data"
echo ""
