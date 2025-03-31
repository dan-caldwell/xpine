import path from 'path';
import regex from './regex';

export function routePathToStaticFiles(routePath: string, staticFiles: string[]): string[] {
  const result = [];
  const routePathAsDir = path.dirname(routePath);
  for (const staticFile of staticFiles) {
    const relativeResult = path.relative(staticFile, routePathAsDir);
    const hasLetters = relativeResult.match(regex.hasLetters);
    if (!hasLetters) {
      console.log({
        relativeResult: path.relative(staticFile, routePathAsDir),
        staticFile,
        routePath,
      });
    }
  }
  return result;
}