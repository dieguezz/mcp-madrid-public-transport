import { Option } from '../../../common/functional/index.js';
import { BusStop } from './BusStop.js';

export interface IBusStopRepository {
  findByCode(code: string): Promise<Option.Option<BusStop>>;
  findByName(name: string): Promise<readonly BusStop[]>;
  findAll(): Promise<readonly BusStop[]>;
}
