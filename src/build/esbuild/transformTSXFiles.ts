import fs from 'fs-extra';
import { removeClientScriptInTSXFile } from '../typescript-builder';
import ts from 'typescript';
import regex from '../../util/regex';
import { getConfigFiles, isAConfigFile } from '../../util/config-file';
import { ComponentData } from '../../../types';

export default function transformTSXFiles(componentData: ComponentData[], pageConfigFiles: string[]) {
  return {
    name: 'transform-tsx-files',
    setup(build) {
      build.onLoad({ filter: regex.dotTsx, }, async args => {
        const content = fs.readFileSync(args.path, 'utf-8');
        const source = ts.createSourceFile(
          args.path,
          content,
          ts.ScriptTarget.Latest
        );
        const cleanedContent = removeClientScriptInTSXFile(args.path, source);
        const htmlImportStart = [
          'import { html } from \'xpine\';'
        ]
        const newContent = `${htmlImportStart.join('\n')}${cleanedContent.content}`;
        componentData.push({
          ...args,
          contents: `${htmlImportStart}${cleanedContent.fullContent}`,
          clientContent: cleanedContent.clientContent,
          configFiles: isAConfigFile(args?.path) ? null : getConfigFiles(args.path, pageConfigFiles),
          source,
        });
        return {
          contents: newContent,
          loader: 'tsx',
        };
      });
    },
  };
}

