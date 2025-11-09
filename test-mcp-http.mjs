#!/usr/bin/env node

/**
 * Test script for MCP Madrid Transport HTTP Server
 *
 * Usage:
 *   node test-mcp-http.mjs
 *
 * This script demonstrates how to:
 * 1. Initialize an MCP session
 * 2. List available tools
 * 3. Call the get_metro_arrivals tool
 * 4. Call the get_bus_arrivals tool
 * 5. Call the get_train_arrivals tool
 */

const MCP_BASE_URL = process.env.MCP_BASE_URL || 'http://localhost:3000';

// Helper function to make MCP requests
async function mcpRequest(method, params = {}, sessionId = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };

  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  const body = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  };

  console.log(`\n📤 Request: ${method}`);
  console.log(`   Session ID: ${sessionId || 'none (new session)'}`);
  console.log(`   Params:`, JSON.stringify(params, null, 2));

  const response = await fetch(`${MCP_BASE_URL}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  // Extract session ID from response headers if this is initialization
  const newSessionId = response.headers.get('mcp-session-id');

  const data = await response.json();

  console.log(`📥 Response:`, JSON.stringify(data, null, 2));

  return { data, sessionId: newSessionId || sessionId };
}

async function main() {
  console.log('🚇 Testing MCP Madrid Transport HTTP Server');
  console.log(`🔗 Base URL: ${MCP_BASE_URL}\n`);

  try {
    // Step 1: Health check
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  Health Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const healthResponse = await fetch(`${MCP_BASE_URL}/health`);
    const health = await healthResponse.json();
    console.log('✅ Server is healthy:', health);

    // Step 2: Initialize MCP session
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  Initialize MCP Session');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let { data: initData, sessionId } = await mcpRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-mcp-http',
        version: '1.0.0',
      },
    });

    if (!sessionId) {
      console.error('❌ Failed to get session ID');
      process.exit(1);
    }

    console.log(`✅ Session initialized: ${sessionId}`);

    // Step 3: List available tools
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  List Available Tools');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { data: toolsData } = await mcpRequest('tools/list', {}, sessionId);

    if (toolsData.result?.tools) {
      console.log(`\n✅ Found ${toolsData.result.tools.length} tools:`);
      toolsData.result.tools.forEach((tool, i) => {
        console.log(`\n   ${i + 1}. ${tool.name}`);
        console.log(`      ${tool.description}`);
      });
    }

    // Step 4: Call get_metro_arrivals
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣  Get Metro Arrivals - Colombia (L8)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { data: metroData } = await mcpRequest(
      'tools/call',
      {
        name: 'get_metro_arrivals',
        arguments: {
          station: 'Colombia',
          line: '8',
          count: 3,
        },
      },
      sessionId
    );

    if (metroData.result?.content?.[0]?.text) {
      const metroResult = JSON.parse(metroData.result.content[0].text);
      console.log('\n✅ Metro Arrivals:');
      console.log(JSON.stringify(metroResult, null, 2));
    }

    // Step 5: Call get_bus_arrivals
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5️⃣  Get Bus Arrivals - Stop 3000');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { data: busData } = await mcpRequest(
      'tools/call',
      {
        name: 'get_bus_arrivals',
        arguments: {
          stop: '3000',
          count: 2,
        },
      },
      sessionId
    );

    if (busData.result?.content?.[0]?.text) {
      const busResult = JSON.parse(busData.result.content[0].text);
      console.log('\n✅ Bus Arrivals:');
      console.log(JSON.stringify(busResult, null, 2));
    }

    // Step 6: Call get_train_arrivals
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('6️⃣  Get Train Arrivals - Fuenlabrada Central');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { data: trainData } = await mcpRequest(
      'tools/call',
      {
        name: 'get_train_arrivals',
        arguments: {
          station: 'Fuenlabrada Central',
          count: 3,
        },
      },
      sessionId
    );

    if (trainData.result?.content?.[0]?.text) {
      const trainResult = JSON.parse(trainData.result.content[0].text);
      console.log('\n✅ Train Arrivals:');
      console.log(JSON.stringify(trainResult, null, 2));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All tests completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
main();
