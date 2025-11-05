// ============================================================================
// GTFS METRO REPOSITORY (Refactored to FP)
// ============================================================================

import { Option } from '../../../common/functional/index.js';
import { IMetroStopRepository } from '../domain/IMetroStopRepository.js';
import { MetroStop } from '../domain/MetroStop.js';
import { IGtfsDataStore } from '../../../gtfs/domain/IGtfsDataStore.js';
import { MetroStationsStore } from './metro-stations-loader.js';
import { createGtfsMetroRepository } from './GtfsMetroRepository.functional.js';

// Re-export functional factory
export { createGtfsMetroRepository } from './GtfsMetroRepository.functional.js';
export type { GtfsMetroRepositoryDeps } from './GtfsMetroRepository.functional.js';

// ============================================================================
// Legacy Class Wrapper (backward compatibility)
// ============================================================================

export class GtfsMetroRepository implements IMetroStopRepository {
  private readonly impl: IMetroStopRepository;

  constructor(gtfsStore: IGtfsDataStore, metroStationsStore: MetroStationsStore) {
    this.impl = createGtfsMetroRepository({ gtfsStore, metroStationsStore });
  }

  async findByCode(code: string): Promise<Option.Option<MetroStop>> {
    return this.impl.findByCode(code);
  }

  async findByName(name: string): Promise<readonly MetroStop[]> {
    return this.impl.findByName(name);
  }

  async findAll(): Promise<readonly MetroStop[]> {
    return this.impl.findAll();
  }
}
