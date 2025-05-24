import path from 'path';
import fs from 'fs-extra';
import { build } from 'esbuild';
import {
  convertEntryPointsToSingleFile,
  findDataAttributesAndFunctions,
  getXpineOnLoadFunction,
  triggerXPineOnLoad
} from '../build/typescript-builder';
import { globSync } from 'glob';
import { config } from '../util/get-config';
import { getXPineDistDir } from '../util/paths';
import transformTSXFiles from '../build/esbuild/transformTSXFiles';
import addDotJS from '../build/esbuild/addDotJS';
import getDataFiles from '../build/esbuild/getDataFiles';
import regex from '../util/regex';
import { getCompleteConfig, sourcePathToDistPath } from '../util/config-file';
import { doctypeHTML, staticComment } from '../util/constants';
import { ConfigFile, ServerRequest, FileItem, ComponentData } from '../../types';
import { context } from '../context';
import ts from 'typescript';
import { filePathToURLPath } from '../express';
import { buildCSS } from '../build/css';

// Extensions to look for in the bundle
const extensions = ['.ts', '.tsx'];
const packageJson = JSON.parse(fs.readFileSync(config.packageJsonPath, 'utf-8'));
const allPackages = Object.keys(packageJson.devDependencies).concat(Object.keys(packageJson.dependencies));

const xpineDistDir = getXPineDistDir();

type BuildAppArgs = {
  isDev?: boolean;
  removePreviousBuild?: boolean;
  disableTailwind?: boolean;
}

export async function buildApp(args: BuildAppArgs) {
  const isDev = args?.isDev || false;
  const removePreviousBuild = args?.removePreviousBuild || false;
  const disableTailwind = args?.disableTailwind || false;
  try {
    if (removePreviousBuild) fs.removeSync(config.distDir);
    const srcDirFiles = globSync(config.srcDir + '/**/*.{js,ts,tsx,jsx}');
    const { componentData, dataFiles, } = await buildAppFiles(srcDirFiles, isDev);
    const alpineDataFile = await buildAlpineDataFile(componentData, dataFiles);
    await buildClientSideFiles([alpineDataFile], isDev);
    fs.removeSync(config.distTempFolder);
    await buildCSS(disableTailwind);
    await buildPublicFolderSymlinks();
    await buildOnLoadFile(componentData, isDev);
    if (!isDev) await triggerXPineOnLoad();
    // Build files with configs if there are any
    if (!isDev) await buildFilesWithConfigs(componentData);
    if (!isDev) context.clear();
  } catch (err) {
    console.error('Build failed');
    console.error(err);
  }
}

async function buildAppFiles(files: string[], isDev?: boolean) {
  const componentData: ComponentData[] = [];
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
      getDataFiles(dataFiles)
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
  fs.appendFileSync(tempFilePath, '\n' + content);
}

function writeSpaClientSideCode(tempFilePath: string) {
  const spaPath = path.join(xpineDistDir, './src/static/spa.js');
  const content = fs.readFileSync(spaPath, 'utf-8');
  fs.appendFileSync(tempFilePath, '\n' + content);
}

async function buildAlpineDataFile(componentData: ComponentData[], dataFiles: any[]) {
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
    if (!component.source) {
      // Single source file
      component.source = ts.createSourceFile(
        component.path,
        component.contents,
        ts.ScriptTarget.Latest
      );
    }
    // Single source file
    const dataFunctionResult = findDataAttributesAndFunctions(component.source, component.source);
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

export async function buildFilesWithConfigs(componentData: ComponentData[]) {
  const now = Date.now();
  const componentsWithConfigs = componentData.filter(item => item.configFiles);
  for (const component of componentsWithConfigs) {
    let config: ConfigFile = await getCompleteConfig(component.configFiles, now);
    const builtComponentPath = sourcePathToDistPath(component.path);
    const componentImport = await import(builtComponentPath + `?cache=${Date.now()}`);
    if (componentImport?.config) {
      config = {
        ...config,
        ...componentImport.config,
      };
    }
    if (config?.staticPaths) buildStaticFiles(config, component, componentImport, builtComponentPath);
  }
}

export async function buildStaticFiles(config: ConfigFile, component: ComponentData, componentImport: any, builtComponentPath: string) {
  if (!config?.staticPaths) return;
  let componentFileName: string = component.path.split('/').pop().replace(regex.endsWithJSX, '').replace(regex.endsWithTSX, '');
  const isDynamicRoute = component.path.match(regex.isDynamicRoute);
  // Handle dynamic routing
  if (isDynamicRoute) {
    componentFileName = component.path
      .split('/')
      .filter((dir: string) => {
        return dir.match(regex.isDynamicRoute) || dir.match(regex.catchAllRouteFilePath)
      })
      .map(dir => {
        const matchesCatchAll = dir.match(regex.catchAllRouteFilePath);
        if (matchesCatchAll) return dir.replace(regex.catchAllRouteFileName, '[0]');
        return dir;
      })
      .join('/')
      .replace(regex.endsWithJSX, '')
      .replace(regex.endsWithTSX, '');
  }
  const componentDynamicPaths = getComponentDynamicPaths(componentFileName);
  const componentFn = componentImport.default;

  // onInit
  if (componentImport?.onInit) await componentImport.onInit();

  const outputPath = componentDynamicPaths?.length ?
    componentDynamicPaths.reduce((total, current) => {
      return total.replace(`/[${current}]`, '');
    }, path.dirname(builtComponentPath)) :
    path.dirname(builtComponentPath);
  if (typeof config?.staticPaths === 'boolean') {
    const urlPath = filePathToURLPath(outputPath);
    // Build as-is
    try {
      const req = { params: {}, } as ServerRequest;
      const data = config?.data ? await config.data(req) : null;
      const staticComponentOutput = await componentFn({ data, routePath: urlPath });
      // Write file
      fs.writeFileSync(
        path.join(outputPath, './index.html'),
        doctypeHTML + (config?.wrapper ? await config.wrapper({ req, children: staticComponentOutput, config, data, routePath: urlPath }) : staticComponentOutput) + staticComment
      );
    } catch (err) {
      console.error(err);
      console.error('Could not build static component', component.path);
    }
  } else if (typeof config?.staticPaths === 'function') {
    const dynamicPaths = await config.staticPaths();
    for (const dynamicPath of dynamicPaths) {
      try {
        const req = {
          params: {
            ...(componentDynamicPaths?.length ? dynamicPath : {}),
          },
        } as ServerRequest;
        const updatedOutDir = path.join(outputPath, `./${componentDynamicPaths.map(key => dynamicPath[key]).join('/')}`);
        const urlPath = filePathToURLPath(updatedOutDir);

        const data = config?.data ? await config.data(req) : null;
        const staticComponentOutput = await componentFn({ req, data, routePath: urlPath });
        // Write file
        fs.ensureDirSync(updatedOutDir);
        fs.writeFileSync(
          path.join(updatedOutDir, './index.html'),
          doctypeHTML + (config?.wrapper ? await config.wrapper({ req, children: staticComponentOutput, config, data, routePath: urlPath }) : staticComponentOutput) + staticComment
        );
      } catch (err) {
        console.error(err);
        console.error('Could not build static component', component.path);
      }
    }
  }
}

export function getComponentDynamicPaths(componentPath: string): string[] {
  const matches = [...componentPath.matchAll(regex.dynamicRoutes)].concat([...componentPath.matchAll(regex.catchAllRoute)]);
  if (!matches?.length) return null;
  const output = [];
  for (const match of matches) {
    output.push(match[2]);
  }
  return output;
}

export type OnLoadFileResult = {
  imports: string;
  fn: string;
}

// If a component has an onLoad export, add it to the onLoad file which gets when the server gets created
export async function buildOnLoadFile(componentData: ComponentData[], isDev?: boolean) {
  const onLoadFiles = [];
  const onLoadFileResult: OnLoadFileResult = {
    imports: '',
    fn: '',
  }
  for (const component of componentData) {
    if (component.contents.includes('xpineOnLoad')) {
      onLoadFiles.push({
        path: sourcePathToDistPath(component.path),
        source: component.source,
      });
    }
  }
  // Sort alphabetically to ensure builds are always the same
  onLoadFiles.sort((a, b) => {
    return a.path.localeCompare(b.path)
  });
  // Import each file and add to dist
  for (const file of onLoadFiles) {
    const result = getXpineOnLoadFunction(file.path, file.source, onLoadFileResult);
    onLoadFileResult.fn += result.fn;
    onLoadFileResult.imports += result.imports;
  }
  const output = `
    ${onLoadFileResult.imports}
    import { context } from "xpine";
    export default async function triggerOnLoad() {
      ${onLoadFileResult.fn}
      context.runArrayQueue();
    }
  `;
  // Transform the raw file into built Javascript
  const onLoadFilePath = path.join(config.distDir, './__xpineOnLoad.ts'); // No extension
  // Write the typescript file
  fs.writeFileSync(onLoadFilePath, output);

  // Compile the typescript file
  await build({
    entryPoints: [onLoadFilePath],
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
    ],
  });
}