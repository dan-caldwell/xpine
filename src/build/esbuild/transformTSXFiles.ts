import fs from 'fs-extra';
import { removeClientScriptInTSXFile } from '../typescript-builder';
import ts from 'typescript';
import path from 'path';

export default function transformTSXFiles(componentData: any[], pageConfigFiles: string[]) {
  return {
    name: 'transform-tsx-files',
    setup(build) {
      build.onLoad({ filter: /.tsx/, }, args => {
        const configFile = getConfigFile(args.path, pageConfigFiles);
        const content = fs.readFileSync(args.path, 'utf-8');
        const source = ts.createSourceFile(
          args.path,
          content,
          ts.ScriptTarget.Latest
        );
        const cleanedContent = removeClientScriptInTSXFile(args.path, source);
        const htmlImportStart = 'import { html } from \'xpine\';\n';
        const newContent = `${htmlImportStart}${cleanedContent.content}`;
        componentData.push({
          ...args,
          contents: `${htmlImportStart}${cleanedContent.fullContent}`,
          clientContent: cleanedContent.clientContent,
          configFile,
        });
        return {
          contents: newContent,
          loader: 'tsx',
        };
      });
    }
  }
}

function getConfigFile(pathName: string, pageConfigFiles: string[]) {
  const configs = [];
  for (const configFile of pageConfigFiles) {
    const result = path.relative(pathName, configFile)?.replace(/\+config\.[tj]s/g, '');
    const hasLetters = /[A-Za-z0-9]/g.test(result);
    if (!hasLetters) configs.push(configFile);
  }
  const configToUse = configs.sort((a, b) => b.length - a.length)?.[0];
  return configToUse;
}
