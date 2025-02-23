import fs from 'fs-extra';
import { build } from 'esbuild';
import { config } from '../util/get-config.js';
import path from 'path';

// Extensions to look for in the bundle
const packageJson = JSON.parse(fs.readFileSync(config.packageJsonPath, 'utf-8'));
const allPackages = Object.keys(packageJson.devDependencies).concat(Object.keys(packageJson.dependencies));
const dirname = import.meta.dirname;

export async function buildXPine() {
  await build({
    entryPoints: [
      // The contents of XPine itself
      path.join(dirname, '../../index.ts'),
      // The script for xpine-build
      path.join(dirname, './xpine-build.ts'),
      // The script for xpine-dev
      path.join(dirname, './xpine-dev.ts'),
      // Static files
      path.join(dirname, '../static/dev-server.mjs'),
      path.join(dirname, '../static/spa.mjs'),
    ],
    format: 'esm',
    platform: 'node',
    outdir: path.join(dirname, '../../dist'),
    bundle: true,
    sourcemap: 'inline',
    external: allPackages,
    jsx: 'transform',
    minify: false,
    plugins: [],
  });
}

buildXPine();
