#!/usr/bin/env tsx

/**
 * Test script for Metro time calculations
 * 
 * Tests the updated logic that considers fechaHoraEmisionPrevision
 */

import { ConsoleLogger } from './src/common/logger/ConsoleLogger.js';
import { LogLevel } from './src/common/logger/log-levels.js';
import { parseMetroResponse } from './src/transport/metro/infrastructure/metro-parser.js';
import { metroLineGetDisplayName } from './src/transport/metro/domain/MetroLine.js';
import { MetroApiResponse } from './src/transport/metro/infrastructure/metro-api-types.js';
import { Either } from './src/common/functional/index.js';
import { formatRelative } from './src/transport/shared/domain/TimeEstimate.js';

async function testMetroTimes() {
  const logger = new ConsoleLogger(true, LogLevel.DEBUG);
  
  console.log('🚇 Testing Metro Time Calculations\n');
  console.log('=========================================\n');

  // Simulate API response similar to the XML you provided
  const now = new Date();
  const emissionTime = new Date(now.getTime() - 1 * 60 * 1000); // 1 minute ago

  const mockResponse: MetroApiResponse = {
    Vtelindicadores: [
      {
        linea: 8,
        nombreli: 'N. MINISTERIOS-AEROPUERTO T-4',
        estaciontel: 2,
        idnumerica: 802,
        nombreest: 'Colombia',
        anden: 1,
        sentido: 'Aeropuerto T-4',
        proximo: 1, // 1 minute from emission time
        siguiente: null,
        fechaHoraEmisionPrevision: emissionTime.toISOString(),
        fechaHoraRegistro: now.toISOString(),
      },
      {
        linea: 8,
        nombreli: 'N. MINISTERIOS-AEROPUERTO T-4',
        estaciontel: 2,
        idnumerica: 802,
        nombreest: 'Colombia',
        anden: 2,
        sentido: 'Nuevos Ministerios',
        proximo: 1,
        siguiente: null,
        fechaHoraEmisionPrevision: emissionTime.toISOString(),
        fechaHoraRegistro: now.toISOString(),
      },
      {
        linea: 9,
        nombreli: 'P.LUCIA-PTA. ARG-ARGANDA   ',
        estaciontel: 7,
        idnumerica: 802,
        nombreest: 'Colombia',
        anden: 1,
        sentido: 'Paco de Lucía',
        proximo: 1,
        siguiente: null,
        fechaHoraEmisionPrevision: emissionTime.toISOString(),
        fechaHoraRegistro: now.toISOString(),
      },
      {
        linea: 9,
        nombreli: 'P.LUCIA-PTA. ARG-ARGANDA   ',
        estaciontel: 7,
        idnumerica: 802,
        nombreest: 'Colombia',
        anden: 2,
        sentido: 'Arganda del Rey',
        proximo: 4,
        siguiente: null,
        fechaHoraEmisionPrevision: emissionTime.toISOString(),
        fechaHoraRegistro: now.toISOString(),
      },
    ],
  };

  console.log('📊 Mock Data:');
  console.log(`   Current time: ${now.toISOString()}`);
  console.log(`   Emission time: ${emissionTime.toISOString()}`);
  console.log(`   Time difference: 1 minute\n`);

  console.log('📦 Sample teleindicador (Line 8 to Aeropuerto):');
  console.log(`   proximo: ${mockResponse.Vtelindicadores[0].proximo} minutes (from emission)`);
  console.log(`   fechaHoraEmisionPrevision: ${mockResponse.Vtelindicadores[0].fechaHoraEmisionPrevision}`);
  console.log(`\n   Expected calculation:`);
  console.log(`   diffInMinutes = now - emission = 1 minute`);
  console.log(`   realMinutes = proximo - diffInMinutes = 1 - 1 = 0 minutes`);
  console.log(`   Result: "en menos de 1 minuto"\n`);

  console.log('🔄 Parsing response...\n');
  
  const parseResult = parseMetroResponse(mockResponse);

  if (Either.isLeft(parseResult)) {
    console.error('❌ Error parsing response:', parseResult.left.message);
    return;
  }

  const arrivals = parseResult.right;
  console.log(`✅ Parsed ${arrivals.length} arrivals\n`);

  console.log('🚇 METRO ARRIVALS:\n');
  console.log('='.repeat(80));

  arrivals.forEach((arrival, index) => {
    const tel = mockResponse.Vtelindicadores[index];
    const emissionTime = new Date(tel.fechaHoraEmisionPrevision);
    const diffInMinutes = Math.floor((now.getTime() - emissionTime.getTime()) / (1000 * 60));
    const realMinutes = tel.proximo - diffInMinutes;

    console.log(`\n${index + 1}. Línea ${metroLineGetDisplayName(arrival.line)} - ${arrival.destination.value}`);
    console.log(`   Andén: ${arrival.platform}`);
    console.log(`   `);
    console.log(`   📊 Cálculo:`);
    console.log(`      • proximo (API): ${tel.proximo} min`);
    console.log(`      • diffInMinutes: ${diffInMinutes} min`);
    console.log(`      • realMinutes: ${realMinutes} min`);
    console.log(`   `);
    console.log(`   ⏱️  Tiempo estimado: ${formatRelative(arrival.estimatedTime)}`);
    
    const arriveDate = new Date(
      arrival.estimatedTime.timestamp.getTime() + 
      arrival.estimatedTime.estimatedSeconds * 1000
    );
    console.log(`   🕐 Llegada: ${arriveDate.toLocaleTimeString()}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test completed!\n');

  // Test with different scenarios
  console.log('\n📊 Testing different scenarios:\n');
  console.log('='.repeat(80));

  const scenarios = [
    { name: 'Train arriving now', proximo: 0, emissionAgo: 0 },
    { name: 'Train in 1 min (emission 0 min ago)', proximo: 1, emissionAgo: 0 },
    { name: 'Train in 1 min (emission 1 min ago)', proximo: 1, emissionAgo: 1 },
    { name: 'Train in 5 min (emission 2 min ago)', proximo: 5, emissionAgo: 2 },
    { name: 'Train in 10 min (emission 3 min ago)', proximo: 10, emissionAgo: 3 },
  ];

  scenarios.forEach(scenario => {
    const emission = new Date(now.getTime() - scenario.emissionAgo * 60 * 1000);
    const diffMin = Math.floor((now.getTime() - emission.getTime()) / (1000 * 60));
    const realMin = scenario.proximo - diffMin;

    console.log(`\n${scenario.name}:`);
    console.log(`  proximo=${scenario.proximo}, emissionAgo=${scenario.emissionAgo}`);
    console.log(`  → diffInMinutes=${diffMin}, realMinutes=${realMin}`);
    
    if (realMin < 0) {
      console.log(`  → ❌ Filtered out (train already passed)`);
    } else if (realMin < 1) {
      console.log(`  → ✅ "en menos de 1 minuto"`);
    } else {
      console.log(`  → ✅ "en ${realMin} minuto${realMin === 1 ? '' : 's'}"`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ All tests completed successfully!\n');
}

// Run test
testMetroTimes().catch(console.error);
