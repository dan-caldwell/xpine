import path from 'path';
import require from './require';
import { XPineConfig } from '../../types';

const rootDir = process.cwd();

export function fromRoot(pathName?: string) {
  if (!pathName) return rootDir;
  return path.join(rootDir, pathName);
}

const userConfig = require(path.join(process.cwd(), './xpine.config.mjs')).default;

const configDefaults = {
  rootDir: fromRoot(),
  srcDir: fromRoot('./src'),
  distDir: fromRoot('./dist'),
  packageJsonPath: fromRoot('package.json'),
  // We need to use getters here in the event someone wants to change folders, such as the dist folder
  get distPublicDir() {
    return path.join(this.distDir, './public');
  },
  get distPublicScriptsDir() {
    return path.join(this.distPublicDir, './scripts');
  },
  get distTempFolder() {
    return path.join(this.distDir, './temp');
  },
  get clientJSBundlePath() {
    return path.join(this.distPublicScriptsDir, './app.js');
  },
  get alpineDataPath() {
    return path.join(this.distTempFolder, './alpine-data.ts');
  },
  get serverDistDir() {
    return path.join(this.distDir, './server');
  },
  get serverDistAppPath() {
    return path.join(this.serverDistDir, './app.js');
  },
  // Important dirs/paths
  get pagesDir() {
    return path.join(this.srcDir, './pages');
  },
  get distPagesDir() {
    return path.join(this.distDir, './pages');
  },
  get publicDir() {
    return path.join(this.srcDir, './public');
  },
  get serverDir() {
    return path.join(this.srcDir, './server');
  },
  get runDir() {
    return path.join(this.serverDir, './run');
  },
  get serverAppPath() {
    return path.join(this.serverDir, './app.ts');
  },
  get globalCSSFile() {
    return path.join(this.publicDir, './styles/global.css');
  },
};

export const config: XPineConfig = {
  ...configDefaults,
  ...userConfig,
};
