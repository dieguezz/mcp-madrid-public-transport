#!/usr/bin/env tsx
// Quick test script to verify Metro API integration
import { loadMetroStations } from './src/transport/metro/infrastructure/metro-stations-loader.js';
import { ConsoleLogger } from './src/common/logger/ConsoleLogger.js';
import { HttpClient } from './src/common/http/HttpClient.js';
import { fetchMetroApiData } from './src/transport/metro/infrastructure/metro-api-client.js';
import { parseMetroResponse } from './src/transport/metro/infrastructure/metro-parser.js';
import * as Either from 'fp-ts/lib/Either.js';

async function test() {
  const logger = new ConsoleLogger(true, 'debug');

  console.log('1. Loading metro stations...');
  const stationsResult = await loadMetroStations('./transport-data');

  if (Either.isLeft(stationsResult)) {
    console.error('Failed to load stations:', stationsResult.left.message);
    process.exit(1);
  }

  const store = stationsResult.right;
  console.log('✓ Stations loaded');

  console.log('\n2. Testing Colombia station lookup...');
  const colombiaStations = store.findByName('colombia');
  console.log('Found stations:', colombiaStations.length);

  for (const station of colombiaStations) {
    console.log(`  - ${station.name} (GTFS: ${station.gtfsStopId}, API: ${station.apiCode}, Lines: ${station.lines.join(', ')})`);
  }

  if (colombiaStations.length === 0) {
    console.error('No Colombia stations found!');
    process.exit(1);
  }

  console.log('\n3. Testing Metro API call...');
  const testApiCode = colombiaStations[0].apiCode;
  console.log(`Using API code: ${testApiCode}`);

  const httpClient = new HttpClient(logger);
  const apiUrl = 'https://serviciosapp.metromadrid.es';

  const apiResult = await fetchMetroApiData(httpClient, apiUrl, testApiCode);

  if (Either.isLeft(apiResult)) {
    console.error('API call failed:', apiResult.left);
    process.exit(1);
  }

  console.log('✓ API call successful');
  console.log('Response:', JSON.stringify(apiResult.right, null, 2));

  console.log('\n4. Testing parser...');
  const parseResult = parseMetroResponse(apiResult.right);

  if (Either.isLeft(parseResult)) {
    console.error('Parse failed:', parseResult.left.message);
    process.exit(1);
  }

  console.log('✓ Parse successful');
  console.log(`Parsed ${parseResult.right.length} arrivals:`);

  for (const arrival of parseResult.right) {
    console.log(`  - Line ${arrival.line.getDisplayName()} to ${arrival.destination.getValue()}`);
    console.log(`    ${arrival.estimatedTime.formatRelative()} (Platform ${arrival.platform})`);
  }

  console.log('\n✅ All tests passed!');
}

test().catch(console.error);
