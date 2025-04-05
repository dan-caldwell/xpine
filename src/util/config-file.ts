import { config } from './get-config';
import path from 'path';
import regex from './regex';
import { ConfigFile } from '../../types';

export function sourcePathToDistPath(sourcePath: string) {
  return sourcePath?.replace(config.srcDir, config.distDir)?.replace(/\.ts$/, '.js')?.replace(/\.tsx$/, '.js');
}

export function getConfigFiles(pathName: string, pageConfigFiles: string[], returnDistPaths: boolean = true): string[] | null {
  const configs: string[] = [];
  for (const configFile of pageConfigFiles) {
    const result = path.relative(pathName, configFile)?.replace(regex.configFile, '');
    const hasLetters = result.match(regex.hasLetters);
    if (!hasLetters) {
      configs.push(returnDistPaths ? sourcePathToDistPath(configFile) : configFile);
    }
  }
  if (!configs.length) return null;
  // Returns configs from closest matching to furthest matching
  return configs.sort((a, b) => b.length - a.length);
}

export async function getCompleteConfig(configFiles: string[], cacheKey: string | number) {
  let config: ConfigFile = {};
  for (const configFile of configFiles) {
    config = {
      ...(await import(configFile + `?cache=${cacheKey}`)).default,
      ...config,
    };
  }
  return config;
}

export function isAConfigFile(pathName: string) {
  return !!(pathName.match(regex.configFile));
}
