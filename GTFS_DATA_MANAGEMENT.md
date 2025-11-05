# GTFS Data Management

This document explains how large GTFS files are managed in this repository.

## Problem

GTFS (General Transit Feed Specification) files contain static public transportation data in text format (CSV). Some of these files can be very large:

- `stop_times.txt` - All stops for all trips (can exceed 50MB)
- `shapes.txt` - Coordinates for all routes (can exceed 20MB)
- `trips.txt` - All scheduled trips (can exceed 10MB)

GitHub is not optimized for large text files, and cloning the repository with these files can be slow.

## Solution

Large GTFS files (>100KB) are stored compressed in Git as `.txt.zip` and are automatically decompressed:

1. **In local development** - When running `npm install`
2. **In Docker build** - During image build
3. **In production** - Files are already decompressed in the Docker image

## File Structure

```
transport-data/
├── metro/
│   ├── stops.txt.zip          # ← In Git (compressed)
│   ├── stops.txt              # ← Generated locally (ignored by Git)
│   ├── stop_times.txt.zip     # ← In Git
│   ├── stop_times.txt         # ← Generated locally
│   ├── shapes.txt.zip         # ← In Git
│   ├── shapes.txt             # ← Generated locally
│   └── README.md              # ← In Git (not compressed)
├── bus/
│   ├── emt/
│   │   ├── stops.txt.zip
│   │   └── ...
│   ├── urban/
│   └── interurban/
└── train/
    └── ...
```

## Available Scripts

### `npm run setup:data` (Decompression)

Decompresses all `.txt.zip` files in `transport-data/`:

```bash
npm run setup:data
```

This script runs automatically in:
- `npm install` (via postinstall hook)
- Docker build (via Dockerfile)

**What does it do?**
- Finds all `*.txt.zip` files in `transport-data/`
- Decompresses each one to its original location
- If the `.txt` already exists, it skips it (doesn't overwrite)

### `npm run compress:data` (Compression)

Compresses all large `.txt` files (>100KB) in `transport-data/`:

```bash
npm run compress:data
```

**When to use this script?**
- After updating GTFS data from the original source
- Before committing new GTFS data

**What does it do?**
1. Finds `.txt` files larger than 100KB
2. Creates a `.txt.zip` file for each one
3. Does NOT delete original files (you do that manually)

**Complete process to update data:**
```bash
# 1. Download new GTFS data and replace .txt files
cp ~/Downloads/new-metro-data/*.txt transport-data/metro/

# 2. Compress large files
npm run compress:data

# 3. Verify .zip files were created correctly
ls -lh transport-data/metro/*.zip

# 4. Test decompression
rm transport-data/metro/*.txt
npm run setup:data

# 5. If everything works, delete original .txt files
find transport-data -name '*.txt' -type f -size +100k -delete

# 6. Commit only the .zip files
git add transport-data/**/*.txt.zip
git commit -m "Update GTFS data"
```

## Git Configuration

The `.gitignore` is configured to:

```gitignore
# Ignore large .txt files
transport-data/**/*.txt

# But keep documentation files
!transport-data/**/README.md
!transport-data/**/ENDPOINTS.md

# And keep compressed files
!transport-data/**/*.txt.zip

# And keep CSV files (usually small)
!transport-data/**/*.csv
```

This means:
- ✅ `.txt.zip` files are uploaded to Git
- ❌ `.txt` files are NOT uploaded to Git (generated locally)
- ✅ README and documentation are uploaded
- ✅ CSV files are uploaded (usually small)

## Docker Build

The `Dockerfile` includes the necessary steps to decompress data:

```dockerfile
# Install unzip
RUN apk add --no-cache sqlite-libs unzip

# Copy compressed data
COPY transport-data ./transport-data

# Copy decompression script
COPY scripts/decompress-gtfs-data.sh ./scripts/

# Decompress GTFS data
RUN chmod +x ./scripts/decompress-gtfs-data.sh && \
    ./scripts/decompress-gtfs-data.sh
```

This ensures that the final Docker image has all `.txt` files decompressed and ready to use.

## Local Development

### First time (after cloning the repo)

```bash
git clone https://github.com/your-repo/mcp-madrid-public-transport.git
cd mcp-madrid-public-transport
npm install  # ← Decompresses data automatically
npm run build
npm start
```

### If data doesn't decompress

```bash
npm run setup:data
```

### To see which files are compressed

```bash
find transport-data -name "*.txt.zip"
```

### To see total data size

```bash
# Before decompression (only .zip)
du -sh transport-data/

# After decompression (with .txt)
du -sh transport-data/
```

## Expected Size

Approximately:

| Category | Compressed (.zip) | Decompressed (.txt) | Ratio |
|----------|-------------------|---------------------|-------|
| Metro | ~15 MB | ~80 MB | 5.3x |
| Bus EMT | ~10 MB | ~50 MB | 5.0x |
| Bus Urban | ~8 MB | ~40 MB | 5.0x |
| Bus Interurban | ~8 MB | ~40 MB | 5.0x |
| Train | ~12 MB | ~60 MB | 5.0x |
| **TOTAL** | **~53 MB** | **~270 MB** | **5.1x** |

Benefits:
- Git repository: 53 MB instead of 270 MB
- Faster cloning
- Docker build not affected (decompresses during build)

## Troubleshooting

### Error: ".txt file not found"

```bash
# Manually decompress
npm run setup:data
```

### Error: "Permission denied" in scripts

```bash
# Give permissions to scripts
chmod +x scripts/*.sh
npm run setup:data
```

### .txt files are in Git by mistake

```bash
# Remove .txt from Git index (but keep them locally)
git rm --cached transport-data/**/*.txt

# Verify .gitignore
cat .gitignore | grep transport-data

# Commit
git commit -m "Remove large .txt files from Git"
```

### Update data for a single category (e.g., Metro)

```bash
# Compress only Metro
find transport-data/metro -name "*.txt" -type f -size +100k -exec zip {}.zip {} \;

# Delete original .txt files
find transport-data/metro -name "*.txt" -type f -size +100k -delete

# Verify and commit
git add transport-data/metro/*.txt.zip
git commit -m "Update Metro GTFS data"
```

## GTFS Data Sources

GTFS data is obtained from:

- **Metro Madrid**: https://www.metromadrid.es/es/viaja-en-metro/red-de-metro/descarga-de-planos
- **EMT Madrid**: https://opendata.emtmadrid.es/
- **CRTM (Interurban)**: https://datos.crtm.es/
- **Renfe Cercanías**: https://data.renfe.com/

Update this data periodically to maintain service accuracy.

## Important Notes

⚠️ **NEVER commit large .txt files directly to Git**
- Always use `.txt.zip` files
- Verify with `git status` before committing

✅ **Small files (<100KB) can go as .txt in Git**
- `agency.txt`, `calendar.txt`, `routes.txt`, etc.
- The compression script ignores them automatically

🔄 **Decompression is idempotent**
- You can run `npm run setup:data` multiple times
- Doesn't overwrite existing files

🐳 **Docker build always has fresh data**
- `.txt` files are generated during build
- Doesn't depend on developer's local files
