import { Option } from '../../../common/functional/index.js';
import { TrainStation } from './TrainStation.js';

export interface ITrainStationRepository {
  findByCode(code: string): Promise<Option.Option<TrainStation>>;
  findByName(name: string): Promise<readonly TrainStation[]>;
  findAll(): Promise<readonly TrainStation[]>;
}
