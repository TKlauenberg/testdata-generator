import {
  createGenerationMetadata,
  encodeGenerationMetadataComment,
  GENERATION_METADATA_COMMENT_LABEL,
} from '../common';
import type { AdapterMetadata, IAdapter, SqlAdapterOptions, SqlDialect } from './types';

const DEFAULT_BATCH_SIZE = 100;

function isSqlDialect(value: unknown): value is SqlDialect {
  return value === 'postgres' || value === 'mysql';
}

function quoteIdentifier(identifier: string, dialect: SqlDialect): string {
  if (dialect === 'mysql') {
    return `\`${identifier.replaceAll('`', '``')}\``;
  }

  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteTableName(tableName: string, dialect: SqlDialect): string {
  return tableName
    .split('.')
    .map((part) => quoteIdentifier(part, dialect))
    .join('.');
}

function escapeSqlString(value: string): string {
  return value.replaceAll("'", "''");
}

function serializeSqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('SqlAdapter: cannot serialize non-finite numbers');
    }

    return String(value);
  }

  if (typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'string') {
    return `'${escapeSqlString(value)}'`;
  }

  if (typeof value === 'object') {
    const serialized = JSON.stringify(value);

    if (serialized === undefined) {
      throw new Error('SqlAdapter: cannot serialize unsupported object values');
    }

    return `'${escapeSqlString(serialized)}'`;
  }

  throw new Error(`SqlAdapter: cannot serialize values of type ${typeof value}`);
}

export class SqlAdapter implements IAdapter {
  private readonly _outputPath: string;
  private readonly _tableName: string;
  private readonly _dialect: SqlDialect;
  private readonly _batchSize: number;
  private readonly _metadata: AdapterMetadata;

  constructor(options: SqlAdapterOptions) {
    if (!options.outputPath || options.outputPath.trim().length === 0) {
      throw new Error('SqlAdapter: outputPath cannot be empty');
    }

    if (!options.tableName || options.tableName.trim().length === 0) {
      throw new Error('SqlAdapter: tableName cannot be empty');
    }

    const dialect = options.dialect ?? 'postgres';
    if (!isSqlDialect(dialect)) {
      throw new Error('SqlAdapter: dialect must be either postgres or mysql');
    }

    const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    if (!Number.isInteger(batchSize) || batchSize <= 0) {
      throw new Error('SqlAdapter: batchSize must be a positive integer');
    }

    this._outputPath = options.outputPath;
    this._tableName = options.tableName;
    this._dialect = dialect;
    this._batchSize = batchSize;
    this._metadata = createGenerationMetadata({
      timestamp: options.metadata?.timestamp,
      sourcePattern: options.metadata?.sourcePattern,
      count: options.metadata?.count,
      format: 'sql',
      seed: options.metadata?.seed,
      version: options.metadata?.version,
      patternHash: options.metadata?.patternHash,
      lineage: options.metadata?.lineage,
      platformReserved: options.metadata?.platformReserved,
    });
  }

  async write(records: AsyncIterable<Record<string, unknown>>): Promise<void> {
    await Bun.write(this._outputPath, '');
    const file = Bun.file(this._outputPath).writer();

    try {
      const quotedTableName = quoteTableName(this._tableName, this._dialect);
      let columns: string[] | null = null;
      let quotedColumns: string[] = [];
      let pendingRows: string[] = [];

      file.write(`-- ${GENERATION_METADATA_COMMENT_LABEL}${encodeGenerationMetadataComment(this._metadata)}\n`);

      const flushBatch = (): void => {
        if (columns === null || pendingRows.length === 0) {
          return;
        }

        file.write(
          `INSERT INTO ${quotedTableName} (${quotedColumns.join(', ')}) VALUES ${pendingRows.join(', ')};\n`,
        );
        pendingRows = [];
      };

      for await (const record of records) {
        if (columns === null) {
          const candidateColumns = Object.keys(record);

          if (candidateColumns.length === 0) {
            continue;
          }

          columns = candidateColumns;
          quotedColumns = columns.map((column) => quoteIdentifier(column, this._dialect));
        }

        const values = columns.map((column) => serializeSqlValue(record[column]));
        pendingRows.push(`(${values.join(', ')})`);

        if (pendingRows.length === this._batchSize) {
          flushBatch();
        }
      }

      flushBatch();
    } finally {
      await file.end();
    }
  }
}
