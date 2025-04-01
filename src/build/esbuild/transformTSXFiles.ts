import fs from 'fs-extra';
import { removeClientScriptInTSXFile } from '../typescript-builder';
import ts from 'typescript';
import path from 'path';
import regex from '../../util/regex';
import { getConfigFile } from '../../util/config-file';

export default function transformTSXFiles(componentData: any[], pageConfigFiles: string[]) {
  return {
    name: 'transform-tsx-files',
    setup(build) {
      build.onLoad({ filter: regex.dotTsx, }, async args => {
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

