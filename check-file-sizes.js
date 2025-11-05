import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const transportDataPath = './transport-data';
const fileSizes = [];

function walkDir(dir) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else {
      const sizeKB = stat.size / 1024;
      fileSizes.push({
        path: filePath.replace('./transport-data/', ''),
        sizeKB: sizeKB,
        sizeMB: sizeKB / 1024
      });
    }
  }
}

walkDir(transportDataPath);

// Sort by size descending
fileSizes.sort((a, b) => b.sizeKB - a.sizeKB);

console.log('\n=== FILES LARGER THAN 100KB ===\n');
const largeFiles = fileSizes.filter(f => f.sizeKB > 100);
largeFiles.forEach(f => {
  console.log(`${f.sizeMB.toFixed(2)} MB - ${f.path}`);
});

console.log(`\n=== SUMMARY ===`);
console.log(`Total files: ${fileSizes.length}`);
console.log(`Files > 100KB: ${largeFiles.length}`);
console.log(`Files > 1MB: ${fileSizes.filter(f => f.sizeMB > 1).length}`);
console.log(`Total size: ${(fileSizes.reduce((sum, f) => sum + f.sizeMB, 0)).toFixed(2)} MB`);
