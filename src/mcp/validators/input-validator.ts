import { Either } from '../../common/functional/index.js';

export interface ValidationError {
  field: string;
  message: string;
}

// Pure function: Validate station input
export const validateStation = (station: string): Either.Either<ValidationError, string> => {
  if (!station || station.trim().length === 0) {
    return Either.left({
      field: 'station',
      message: 'Station name or code is required',
    });
  }

  return Either.right(station.trim());
};

// Pure function: Validate count
export const validateCount = (count?: number): Either.Either<ValidationError, number> => {
  if (count === undefined) {
    return Either.right(2); // default
  }

  if (count < 1) {
    return Either.left({
      field: 'count',
      message: 'Count must be at least 1',
    });
  }

  if (count > 10) {
    return Either.left({
      field: 'count',
      message: 'Count cannot exceed 10',
    });
  }

  return Either.right(count);
};
