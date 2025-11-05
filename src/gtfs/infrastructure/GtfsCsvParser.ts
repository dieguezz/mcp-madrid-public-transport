// ============================================================================
// Types
// ============================================================================

import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { Either } from '../../common/functional/index.js';

export type CsvParserOptions = {
  readonly delimiter?: string;
  readonly columns?: boolean;
  readonly skip_empty_lines?: boolean;
  readonly trim?: boolean;
};

export type GtfsCsvParserDeps = Record<string, never>; // No dependencies

// ============================================================================
// Factory Function
// ============================================================================

export const createGtfsCsvParser = (_deps: GtfsCsvParserDeps = {}) => {
  return {
    parseFile: <T>(filePath: string, options: CsvParserOptions = {}) =>
      parseFileImpl<T>(filePath, options),
  };
};

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

const parseFileImpl = <T>(
  filePath: string,
  options: CsvParserOptions
): Promise<Either.Either<Error, T[]>> => {
  return new Promise((resolve) => {
    const records: T[] = [];
    const errors: Error[] = [];

    const parser = parse({
      delimiter: options.delimiter ?? ',',
      columns: options.columns ?? true,
      skip_empty_lines: options.skip_empty_lines ?? true,
      trim: options.trim ?? true,
      relaxColumnCount: true,
    });

    createReadStream(filePath)
      .pipe(parser)
      .on('data', (record) => {
        records.push(record as T);
      })
      .on('error', (error) => {
        errors.push(error);
      })
      .on('end', () => {
        if (errors.length > 0) {
          resolve(Either.left(errors[0]));
        } else {
          resolve(Either.right(records));
        }
      });
  });
};

// ============================================================================
// Legacy Class Wrapper
// ============================================================================

export class GtfsCsvParser {
  private readonly impl: ReturnType<typeof createGtfsCsvParser>;

  constructor() {
    this.impl = createGtfsCsvParser();
  }

  async parseFile<T>(
    filePath: string,
    options: CsvParserOptions = {}
  ): Promise<Either.Either<Error, T[]>> {
    return this.impl.parseFile<T>(filePath, options);
  }
}
