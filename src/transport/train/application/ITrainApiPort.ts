import { Either } from '../../../common/functional/index.js';
import { TrainArrival } from '../domain/TrainArrival.js';
import { TrainStation } from '../domain/TrainStation.js';
import { HttpErrorType } from '../../../common/http/index.js';

export interface ITrainApiPort {
  fetchArrivals(station: TrainStation): Promise<Either.Either<HttpErrorType, readonly TrainArrival[]>>;
}
