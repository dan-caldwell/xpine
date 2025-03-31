import fs from 'fs-extra';
import path from 'path';
import builtinModules from 'builtin-modules';

export default function addDotJS(allPackages: string[], extensions: string[], isDev: boolean) {
  const allPackagesIncludingNode = allPackages.concat(builtinModules);
  return {
    name: 'add-dot-js',
    setup(build) {
      build.onResolve({ filter: /.*/, }, args => {
        const hasAtSign = args.path.startsWith('@');
        const isPackage = hasAtSign ?
          allPackagesIncludingNode.includes(args.path) :
          allPackagesIncludingNode.includes(args.path.split('/').shift());
        if (args.importer && !isPackage) {
          // If we're doing an index import we need /index.js
          const calculatedDir = path.join(args.resolveDir, args.path);
          let existsAsFile = false;
          for (const extension of extensions) {
            const asFile = calculatedDir + extension;
            const exists = fs.existsSync(asFile);
            if (exists) existsAsFile = true;
          }
          let outputPath = args.path + (existsAsFile ? '' : '/index') + '.js';
          outputPath = args.path.endsWith('.js') || args.path.endsWith('.mjs') ? args.path : outputPath;
          return { path: outputPath + (isDev ? `?cache=${Date.now()}` : ''), external: true, };
        }
      });
    },
  };
}
