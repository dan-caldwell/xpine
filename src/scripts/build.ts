import path from 'path';
import fs from 'fs-extra';
import { build } from 'esbuild';
import ts from 'typescript';
import {
  convertEntryPointsToSingleFile,
  findDataAttributesAndFunctions,
} from '../build/typescript-builder';
import { globSync } from 'glob';
import postcss from 'postcss';
// @ts-ignore
import tailwindPostcss from '@tailwindcss/postcss';
import { config } from '../util/get-config';
import { getXPineDistDir } from '../util/require';
import postcssRemoveLayers from '../util/postcss/remove-layers';
import transformTSXFiles from '../build/esbuild/transformTSXFiles';
import addDotJS from '../build/esbuild/addDotJS';
import getDataFiles from '../build/esbuild/getDataFiles';
import regex from '../util/regex';
import { getCompleteConfig, sourcePathToDistPath } from '../util/config-file';
import { doctypeHTML } from '../util/constants';
import { ConfigFile, ServerRequest } from '../../types';

// Extensions to look for in the bundle
const extensions = ['.ts', '.tsx'];
const packageJson = JSON.parse(fs.readFileSync(config.packageJsonPath, 'utf-8'));
const allPackages = Object.keys(packageJson.devDependencies).concat(Object.keys(packageJson.dependencies));

const xpineDistDir = getXPineDistDir();

export async function buildApp(isDev = false) {
  try {
    const srcDirFiles = globSync(config.srcDir + '/**/*.{js,ts,tsx,jsx}');
    const { componentData, dataFiles, } = await buildAppFiles(srcDirFiles, isDev);
    const alpineDataFile = await buildAlpineDataFile(componentData, dataFiles);
    await buildClientSideFiles([alpineDataFile], isDev);
    fs.removeSync(config.distTempFolder);
    await buildCSS();
    await buildPublicFolderSymlinks();
    // Build files with configs if there are any
    if (!isDev) await buildFilesWithConfigs(componentData);
  } catch (err) {
    console.error('Build failed');
    console.error(err);
  }
}

async function buildAppFiles(files: string[], isDev?: boolean) {
  const componentData = [];
  const dataFiles = [];

  const pageConfigFiles = files.filter((file) => {
    const fileName = file.split('/').at(-1).split('.').shift();
    return fileName === '+config';
  });

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
      addDotJS(allPackages, extensions, isDev),
      transformTSXFiles(componentData, pageConfigFiles),
      getDataFiles(dataFiles),
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
  const devServerPath = path.join(xpineDistDir, './src/static/dev-server.js');
  const content = fs.readFileSync(devServerPath, 'utf-8');
  fs.appendFileSync(tempFilePath, `\n` + content);
}

function writeSpaClientSideCode(tempFilePath: string) {
  const spaPath = path.join(xpineDistDir, './src/static/spa.js');
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
    const result = await postcss([tailwindPostcss(), postcssRemoveLayers()]).process(fileContents, { from: file, });
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

export async function buildFilesWithConfigs(componentData: any[]) {
  const now = Date.now();
  const componentsWithConfigs = componentData.filter(item => item.configFiles);
  for (const component of componentsWithConfigs) {
    const config: ConfigFile = await getCompleteConfig(component.configFiles, now);
    if (config?.staticPaths) buildStaticFiles(config, component);
  }
}

export async function buildStaticFiles(config: ConfigFile, component) {
  let componentFileName: string = component.path.split('/').pop().replace(regex.endsWithJSX, '').replace(regex.endsWithTSX, '');
  const isDynamicRoute = component.path.match(regex.isDynamicRoute);
  // Handle dynamic routing
  if (isDynamicRoute) {
    componentFileName = component.path
      .split('/')
      .filter((dir: string) => dir.match(regex.isDynamicRoute))
      .join('/')
      .replace(regex.endsWithJSX, '')
      .replace(regex.endsWithTSX, '');
  }

  const builtComponentPath = sourcePathToDistPath(component.path);
  const componentDynamicPaths = getComponentDynamicPaths(componentFileName);
  const componentFn = (await import(builtComponentPath + `?cache=${Date.now()}`)).default;
  const outputPath = componentDynamicPaths?.length ?
    componentDynamicPaths.reduce((total, current) => {
      return total.replace(`/[${current}]`, '')
    }, path.dirname(builtComponentPath)) :
    path.dirname(builtComponentPath);
  if (typeof config?.staticPaths === 'boolean') {
    // Build as-is
    try {
      const staticComponentOutput = await componentFn();
      // Write file
      fs.writeFileSync(
        path.join(outputPath, `./index.html`), 
        doctypeHTML + (config?.wrapper ? await config.wrapper({ params: {} } as ServerRequest, staticComponentOutput, config) : staticComponentOutput)
      );
    } catch (err) {
      console.error(err);
      console.log('Could not build static component', component.path);
    }
  } else if (typeof config?.staticPaths === 'function') {
    const dynamicPaths = await config.staticPaths();
    for (const dynamicPath of dynamicPaths) {
      try {
        const req = {
          params: {
            ...(componentDynamicPaths?.length ? dynamicPath : {})
          }
        } as ServerRequest;
        const staticComponentOutput = await componentFn(req);
        // Write file
        const updatedOutDir = path.join(outputPath, `./${componentDynamicPaths.map(key => dynamicPath[key]).join('/')}`);
        fs.ensureDirSync(updatedOutDir);
        fs.writeFileSync(
          path.join(updatedOutDir, `./index.html`), 
          doctypeHTML + (config?.wrapper ? await config.wrapper(req, staticComponentOutput, config) : staticComponentOutput)
        );
      } catch (err) {
        console.log('Could not build static component', component.path);
        console.error(err);
      }
    }
  }
}

export function getComponentDynamicPaths(componentPath: string): string[] {
  const matches = [...componentPath.matchAll(regex.dynamicRoutes)];
  if (!matches?.length) return null;
  const output = [];
  for (const match of matches) {
    output.push(match[2]);
  }
  return output;
}
