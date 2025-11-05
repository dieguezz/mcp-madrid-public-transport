import { Either } from '../../../common/functional/index.js';
import { MetroArrival } from '../domain/MetroArrival.js';
import { MetroStop } from '../domain/MetroStop.js';
import { HttpErrorType } from '../../../common/http/index.js';

export interface IMetroApiPort {
  fetchArrivals(stop: MetroStop): Promise<Either.Either<HttpErrorType, readonly MetroArrival[]>>;
}
