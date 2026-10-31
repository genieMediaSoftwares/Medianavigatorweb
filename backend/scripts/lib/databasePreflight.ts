import type { Connection } from 'mongoose';
import { allModels } from '../../src/models/index.js';

/** Only listIndexes; never create, drop, sync or read user documents. */
export async function inspectDatabaseIndexes(database: NonNullable<Connection['db']>) {
  const results = [];
  for (const model of allModels) {
    const collection = model.collection.name;
    let actual;
    try { actual = await database.collection(collection).listIndexes().toArray(); }
    catch (error) {
      if ((error as { code?: number }).code !== 26) throw error;
      actual = [];
    }
    const missing = model.schema.indexes().filter(([key, options]) => !actual.some(index =>
      JSON.stringify(index.key) === JSON.stringify(key)
      && Boolean(index.unique) === Boolean(options.unique)
      && Boolean(index.sparse) === Boolean(options.sparse)
      && index.expireAfterSeconds === options.expireAfterSeconds
      && JSON.stringify(index.partialFilterExpression) === JSON.stringify(options.partialFilterExpression)
    )).length;
    results.push({ collection, missing });
  }
  return results;
}
