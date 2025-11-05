#!/bin/bash

# Script para probar el servidor MCP en producción
# Prueba Metro, Trenes y Buses (con credenciales opcionales)

set -e

echo "🧪 Testing Madrid Transport MCP Server (Production)"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para probar una herramienta MCP
test_tool() {
    local tool_name=$1
    local tool_args=$2
    local description=$3

    echo -e "${YELLOW}Testing: ${description}${NC}"

    # Crear requests MCP
    local init_request='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
    local tool_request="{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"${tool_name}\",\"arguments\":${tool_args}}}"

    # Ejecutar
    local result=$(echo -e "${init_request}\n${tool_request}" | docker run -i --rm \
        -e EMT_CLIENT_ID="${EMT_CLIENT_ID:-}" \
        -e EMT_PASS_KEY="${EMT_PASS_KEY:-}" \
        -e DEBUG=true \
        -e DEBUG_LEVEL=info \
        mcp/mcp-madrid-public-transport:latest 2>/dev/null | tail -1)

    # Verificar resultado
    if echo "$result" | grep -q '"error"'; then
        echo -e "${RED}❌ FAILED${NC}"
        echo "Error: $result"
        return 1
    elif echo "$result" | grep -q '"result"'; then
        echo -e "${GREEN}✅ PASSED${NC}"
        echo "Response: $(echo "$result" | jq -r '.result.content[0].text' 2>/dev/null | head -c 200)..."
        return 0
    else
        echo -e "${RED}❌ UNKNOWN RESPONSE${NC}"
        echo "Response: $result"
        return 1
    fi
}

echo "1️⃣  Testing Metro API (No credentials required)"
echo "------------------------------------------------"
test_tool "get_metro_arrivals" '{"station":"Colombia","count":2}' "Metro Colombia Station" || true
echo ""

echo "2️⃣  Testing Trains API (No credentials required)"
echo "------------------------------------------------"
test_tool "get_train_arrivals" '{"station":"Atocha","count":2}' "Atocha Train Station" || true
echo ""

if [ -n "$EMT_CLIENT_ID" ] && [ -n "$EMT_PASS_KEY" ]; then
    echo "3️⃣  Testing Bus API (With EMT credentials)"
    echo "------------------------------------------------"
    test_tool "get_bus_arrivals" '{"stop":"3000","count":2}' "EMT Bus Stop 3000" || true
    echo ""
else
    echo "3️⃣  Skipping Bus API test (No EMT credentials provided)"
    echo "------------------------------------------------"
    echo -e "${YELLOW}ℹ️  Set EMT_CLIENT_ID and EMT_PASS_KEY environment variables to test buses${NC}"
    echo ""
fi

echo "=================================================="
echo "✅ Production testing completed!"
echo ""
echo "Next steps:"
echo "  1. Check that Metro and Trains work correctly"
echo "  2. If you have EMT credentials, test buses:"
echo "     EMT_CLIENT_ID=your_id EMT_PASS_KEY=your_key ./test-mcp-production.sh"
echo "  3. Configure in Docker Desktop MCP settings"
echo ""
