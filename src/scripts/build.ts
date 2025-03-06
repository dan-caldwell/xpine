import path from 'path';
import fs from 'fs-extra';
import { build } from 'esbuild';
import builtinModules from 'builtin-modules';
import ts from 'typescript';
import {
  convertEntryPointsToSingleFile,
  findDataAttributesAndFunctions,
  removeClientScriptInTSXFile
} from '../build/typescript-builder.ts';
import { globSync } from 'glob';
import postcss from 'postcss';
// @ts-ignore
import tailwindPostcss from '@tailwindcss/postcss';
import { config } from '../util/get-config.ts';

// Extensions to look for in the bundle
const extensions = ['.ts', '.tsx'];
const packageJson = JSON.parse(fs.readFileSync(config.packageJsonPath, 'utf-8'));
const allPackages = Object.keys(packageJson.devDependencies).concat(Object.keys(packageJson.dependencies));
const allPackagesIncludingNode = allPackages.concat(builtinModules);

export async function buildApp(isDev = false) {
  try {
    const srcDirFiles = globSync(config.srcDir + '/**/*.{js,ts,tsx,jsx}');
    const { componentData, dataFiles, } = await buildAppFiles(srcDirFiles, isDev);
    const alpineDataFile = await buildAlpineDataFile(componentData, dataFiles);
    await buildClientSideFiles([alpineDataFile], isDev);
    fs.removeSync(config.distTempFolder);
    await buildCSS();
    await buildPublicFolderSymlinks();
  } catch (err) {
    console.error('Build failed');
    console.error(err);
  }
}

async function buildAppFiles(files: string[], isDev?: boolean) {
  const componentData = [];
  const dataFiles = [];
  // Filter out client side files and files that aren't of the allowed extensions
  const backendFiles = files
    .filter((file) => extensions.find(ext => file.endsWith(ext)))
    .filter((file) => !file.startsWith(config.publicDir));
  fs.ensureDirSync(config.distDir);
  // Build backend/SSR TSX modules
  await build({
    entryPoints: backendFiles,
    format: 'esm',
    platform: 'node',
    outdir: config.distDir,
    bundle: true,
    sourcemap: isDev ? 'inline' : false,
    external: allPackages,
    jsx: 'transform',
    minify: !isDev,
    plugins: [
      {
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
              return { path: outputPath, external: true, };
            }
          });
        },
      },
      {
        name: 'insert-html-banner-and-remove-client-scripts',
        setup(build) {
          build.onLoad({ filter: /.tsx/, }, args => {
            const cleanedContent = removeClientScriptInTSXFile(args.path);
            const htmlImportStart = 'import { html } from \'xpine\';\n';
            const newContent = `${htmlImportStart}${cleanedContent.content}`;
            componentData.push({
              ...args,
              contents: `${htmlImportStart}${cleanedContent.fullContent}`,
              clientContent: cleanedContent.clientContent,
            });
            return {
              contents: newContent,
              loader: 'tsx',
            };
          });
        },
      },
      {
        name: 'get-data-files',
        setup(build) {
          build.onLoad({ filter: /\.data\.(js|mjs|ts)$/, }, args => {
            const contents = fs.readFileSync(args.path, 'utf-8');
            dataFiles.push({
              ...args,
              contents,
            });
            return {
              contents,
              loader: 'ts',
            };
          });
        },
      }
    ],
  });
  await logSize(config.distDir, 'app');
  return {
    componentData,
    dataFiles,
  };
}

// Build client side files
async function buildClientSideFiles(alpineDataFiles: string[] = [], isDev?: boolean) {
  // Write the temp file to use
  const tempFilePath = path.join(config.distTempFolder, './app.ts');
  fs.ensureFileSync(tempFilePath);
  // Get all ts/js files in public folder but ignore the pages scripts
  const pagesScriptsGlob = config.publicDir + '/scripts/pages/**/*.{js,ts}';
  const clientFiles = globSync(
    config.publicDir + '/**/*.{js,ts}',
    {
      ignore: pagesScriptsGlob,
    }
  );
  // Filter out all public/pages files
  convertEntryPointsToSingleFile(alpineDataFiles.concat(clientFiles), tempFilePath);
  // Write dev server code to the temp file path
  if (isDev) writeDevServerClientSideCode(tempFilePath);
  // Write spa functionality to the temp file path
  writeSpaClientSideCode(tempFilePath);
  await build({
    entryPoints: [tempFilePath],
    bundle: true,
    outdir: config.distPublicScriptsDir,
    minify: !isDev,
    sourcemap: isDev ? 'inline' : false,
  });
  // Build pages files scripts
  const pagesFiles = globSync(pagesScriptsGlob);
  await build({
    entryPoints: pagesFiles || [],
    bundle: true,
    outdir: config.distPublicScriptsDir + '/pages',
    minify: !isDev,
    sourcemap: isDev ? 'inline' : false,
  });
  await logSize(config.distPublicDir, 'client');
}

function writeDevServerClientSideCode(tempFilePath: string) {
  const devServerPath = path.join(import.meta.dirname, '../static/dev-server.js');
  const content = fs.readFileSync(devServerPath, 'utf-8');
  fs.appendFileSync(tempFilePath, `\n` + content);
}

function writeSpaClientSideCode(tempFilePath: string) {
  const spaPath = path.join(import.meta.dirname, '../static/spa.js');
  const content = fs.readFileSync(spaPath, 'utf-8');
  fs.appendFileSync(tempFilePath, `\n` + content);
}

async function buildAlpineDataFile(componentData: any[], dataFiles: any[]) {
  const output = {
    imports: [
      'import Alpine from \'alpinejs\';'
    ],
    code: [],
    end: [
      'window.Alpine = Alpine;'
    ],
  };
  const dataFunctionResults = {
    foundDataAttributes: [],
    foundFunctions: [],
    foundImports: [],
  };
  const componentsAndDataFiles = componentData.concat(dataFiles);
  for (const component of componentsAndDataFiles) {
    // Single source file
    const sourceFile = ts.createSourceFile(
      component.path,
      component.contents,
      ts.ScriptTarget.Latest
    );
    const dataFunctionResult = findDataAttributesAndFunctions(sourceFile, sourceFile);
    dataFunctionResults.foundDataAttributes.push(...dataFunctionResult.foundDataAttributes);
    const foundFunctionsWithPath = dataFunctionResult.foundFunctions.map(item => {
      return {
        ...item,
        path: component.path,
        content: component.clientContent,
      };
    });
    dataFunctionResults.foundFunctions.push(...foundFunctionsWithPath);
  }
  const validDataFunctions = dataFunctionResults.foundFunctions.filter(item => {
    return dataFunctionResults.foundDataAttributes.includes(item.name) && item.content;
  });
  for (const dataFunction of validDataFunctions) {
    if (!dataFunction.hasExport) continue;
    output.code.push(dataFunction.content);
    output.code.push(`Alpine.data('${dataFunction.name}', ${dataFunction.name});`);
  }
  const result = output.imports.join('\n') + '\n' + output.code.join('\n') + '\n' + output.end.join('\n');
  fs.ensureFileSync(config.alpineDataPath);
  fs.writeFileSync(config.alpineDataPath, result);
  return config.alpineDataPath;
}

export async function buildCSS() {
  const cssFiles = globSync(config.srcDir + '/**/*.css');
  for (const file of cssFiles) {
    const fileContents = fs.readFileSync(file, 'utf-8');
    const result = await postcss([tailwindPostcss()]).process(fileContents, { from: file, });
    // Write to dist folder
    const newPath = file.replace(config.srcDir, config.distDir);
    fs.ensureFileSync(newPath);
    fs.writeFileSync(newPath, result.css);
  }
  logSize(config.distPublicDir, 'css');
}

// We need to symlink the non CSS or JS files from the src/public folder into the dist folder
export async function buildPublicFolderSymlinks() {
  const files = globSync(config.publicDir + '/**/*.*', {
    ignore: '/**/*.{css,js,ts,tsx,jsx}',
  });

  // Create symlinks in dist directory
  for (const file of files) {
    try {
      const newPath = file.replace(config.srcDir, config.distDir);
      const splitNewPath = newPath.split('/');
      splitNewPath.pop();
      const newDir = splitNewPath.join('/');
      fs.ensureDirSync(newDir);
      fs.symlinkSync(file, newPath);
    } catch { }
  }
}

type FileItem = {
  file: string;
  size: number;
}

export async function logSize(pathName: string, type: 'app' | 'client' | 'css', validExtensions = ['.js', '.css']) {
  const files = globSync(pathName + '/**/*' + (type === 'css' ? '.css' : ''));
  const fileSizes = files.map((file) => {
    if (!validExtensions.find(ext => file.endsWith(ext))) return false;
    return {
      file,
      size: (fs.statSync(file).size) / (1024 * 1000),
    };
  }).filter(Boolean);
  const totalSize = fileSizes.reduce((total, current: FileItem) => {
    return current.size + total;
  }, 0);
  console.info(`[${totalSize.toFixed(3)} MB] Built ${type}`);
}
