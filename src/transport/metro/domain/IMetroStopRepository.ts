import { Option } from '../../../common/functional/index.js';
import { MetroStop } from './MetroStop.js';

export interface IMetroStopRepository {
  findByCode(code: string): Promise<Option.Option<MetroStop>>;
  findByName(name: string): Promise<readonly MetroStop[]>;
  findAll(): Promise<readonly MetroStop[]>;
}
