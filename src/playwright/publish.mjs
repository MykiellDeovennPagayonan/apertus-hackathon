import { resolve } from 'node:path';
import { publishRun } from './artifacts.mjs';

try {
  if (!process.argv[2]) throw new Error('Usage: node publish.mjs <run-directory>');
  const run = publishRun(resolve(process.argv[2]));
  console.log(`Published ${run.modelSlug}/${run.id}; no generations were repeated.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
