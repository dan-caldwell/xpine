import path from 'path';

export function routePathToStaticFiles(routePath: string, staticFiles: string[]): string[] {
  const result = [];
  const routePathAsDir = path.dirname(routePath);
  for (const staticFile of staticFiles) {
    // console.log({
    //   relativeResult: path.relative(staticFile, routePathAsDir),
    //   staticFile,
    //   routePath,
    // });
  }
  return result;
}