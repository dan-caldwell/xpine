import { config } from "./get-config";
import path from 'path';
import regex from "./regex";

export function sourcePathToDistPath(sourcePath: string) {
  return sourcePath?.replace(config.srcDir, config.distDir)?.replace(/\.ts$/, '.js')?.replace(/\.tsx$/, '.js');
}

export function getConfigFile(pathName: string, pageConfigFiles: string[]) {
  const configs = [];
  for (const configFile of pageConfigFiles) {
    const result = path.relative(pathName, configFile)?.replace(regex.configFile, '');
    const hasLetters = result.match(regex.hasLetters);
    if (!hasLetters) configs.push(configFile);
  }
  const configToUse = configs.sort((a, b) => b.length - a.length)?.[0];
  return configToUse;
}