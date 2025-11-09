#!/usr/bin/env node
import { spawn } from 'child_process';

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let responseData = '';

server.stdout.on('data', (data) => {
  responseData += data.toString();
});

// Send initialization
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

setTimeout(() => {
  server.stdin.write(JSON.stringify(initRequest) + '\n');

  // After init, call the metro tool
  setTimeout(() => {
    const toolRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_metro_arrivals',
        arguments: {
          station: 'Fuenlabrada Central'
        }
      }
    };

    server.stdin.write(JSON.stringify(toolRequest) + '\n');

    // Wait for response and exit
    setTimeout(() => {
      console.log('Response:', responseData);
      server.kill();
      process.exit(0);
    }, 5000);
  }, 1000);
}, 1000);

setTimeout(() => {
  console.log('Timeout - killing server');
  server.kill();
  process.exit(1);
}, 10000);
