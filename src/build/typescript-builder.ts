import ts from 'typescript';
import fs from 'fs-extra';
import path from 'path';
import { OnLoadFileResult } from '../scripts/build';
import { config as xpineConfig } from '../util/get-config';
import { context } from '../context';

type ImportDeclaration = {
  node: ts.Node;
  importPath: string;
}

// node arg should initially be the source node
export function getImportDeclarationNodes(node: ts.Node, sourceFile: ts.SourceFile, importDeclarations: ImportDeclaration[] = []) {
  if (node.kind === ts.SyntaxKind.ImportDeclaration) {
    let importPath = null;
    node.forEachChild(child => {
      if (child.kind === ts.SyntaxKind.StringLiteral) {
        importPath = child.getText(sourceFile).replace(/[\"\']/g, '');
      }
    });
    importDeclarations.push({
      node,
      importPath,
    });
  }
  node.forEachChild(child => {
    getImportDeclarationNodes(child, sourceFile, importDeclarations);
  });
  return importDeclarations;
}

export function stripImportsNodesFromFile(importsToStrip: string[], content: string, importDeclarations: ImportDeclaration[]) {
  let outputContent = content;
  const filteredImports = importDeclarations.filter(item => importsToStrip.includes(item.importPath));
  for (const importItem of filteredImports) {
    outputContent = outputContent.slice(0, importItem.node.pos) + outputContent.slice(importItem.node.end);
  }
  return outputContent;
}

type FoundAlpineFunction = {
  name: string;
  isDefaultExport: boolean;
  hasExport: boolean;
}

export function findDataAttributesAndFunctions(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  foundDataAttributes: string[] = [],
  foundFunctions: FoundAlpineFunction[] = []
) {
  if (node.kind === ts.SyntaxKind.JsxAttribute) {
    const attribute = getAttributeValuePair(node, sourceFile);
    if (attribute?.[0] === 'x-data' && attribute?.[1]) {
      // We found a data attribute, 
      // so now we have to search throughout the file for a function declaration of the same name
      foundDataAttributes.push(attribute[1].replace(/[^a-zA-Z0-9]/g, ''));
    }
  }
  if (node.kind === ts.SyntaxKind.SourceFile) {
    node.forEachChild(child => {
      if ([ts.SyntaxKind.FunctionDeclaration, ts.SyntaxKind.VariableDeclaration].includes(child.kind)) {
        const functions = getFunctionDeclarationValue(child, sourceFile);
        foundFunctions.push(functions);
      }
    });
  }

  node.forEachChild(child => {
    findDataAttributesAndFunctions(child, sourceFile, foundDataAttributes, foundFunctions);
  });
  return {
    foundDataAttributes,
    foundFunctions,
  };
}

export function getAttributeValuePair(node: ts.Node, sourceFile: ts.SourceFile): string[] {
  const result = [];
  node.forEachChild(child => {
    result.push(child.getText(sourceFile));
  });
  return result;
}

export function getFunctionDeclarationValue(node: ts.Node, sourceFile: ts.SourceFile): FoundAlpineFunction {
  const result = {
    name: null,
    isDefaultExport: false,
    hasExport: false,
  };
  node.forEachChild(child => {
    if (child.kind === ts.SyntaxKind.ExportKeyword) {
      result.hasExport = true;
    }
    if (child.kind === ts.SyntaxKind.DefaultKeyword) {
      result.isDefaultExport = true;
    }
    if (child.kind === ts.SyntaxKind.Identifier) {
      result.name = child.getText(sourceFile);
    }
  });
  return result;
}

// Convert entry point files into one big bundle file
export function convertEntryPointsToSingleFile(entryPoints: string[], tempWritePath: string) {
  fs.writeFileSync(
    tempWritePath,
    entryPoints
      .map(entry => `import "${entry}"`)
      .join(';\n')
  );
}

export function removeClientScriptInTSXFile(pathName: string, source: ts.SourceFile) {
  const content = fs.readFileSync(pathName, 'utf-8');
  let toRemoveFrom: number;
  let clientDataStart: number;
  const clientImportsToHoist = [];
  const clientImportsToReplace = [];
  source.forEachChild((child) => {
    if (child.kind === ts.SyntaxKind.ExpressionStatement) {
      const text = child.getText(source);
      // Remove from here
      if (text.startsWith('<script')) {
        toRemoveFrom = child.pos;
        clientDataStart = child.end;
      }
    }
    // Hoist the client imports to above the <script /> tag
    if (child.kind === ts.SyntaxKind.ImportDeclaration && child.pos >= clientDataStart) {
      const text = child.getText(source);
      clientImportsToReplace.push(...getImportsToAbsolutePaths(child, source, pathName))
      clientImportsToHoist.push(text);
    }
  });
  let clientContent = !isNaN(clientDataStart) ? content.slice(clientDataStart) : '';
  for (const clientImport of clientImportsToReplace) {
    clientContent = clientContent.replace(clientImport.old, clientImport.new);
  }
  return {
    content: !isNaN(toRemoveFrom) ?
      clientImportsToHoist.join('\n') + content.slice(0, toRemoveFrom) :
      content,
    clientContent,
    fullContent: content,
    toRemoveFrom,
    clientDataStart,
  };
}

export function createStaticFile(pathName: string, source: ts.SourceFile) {
  source.forEachChild(child => {
    if (child.kind === ts.SyntaxKind.ExpressionStatement) {
      const text = child.getText(source);
      const cleanedText = text.replace(/["';]/g, '');
      if (cleanedText === 'xpine-static') {
        console.log('make this file static', pathName);
      }
    }
  });
}

export function getImportsToAbsolutePaths(child: ts.Node, source: ts.SourceFile, pathName: string) {
  const output = [];
  child.forEachChild(child => {
    if (child.kind === ts.SyntaxKind.StringLiteral) {
      // Keep track of imports needed for path replacement to be absolute
      const text = child.getText(source);
      const importPath = text.replace(/[\"\']/g, '');
      const isRelativeImport = importPath.startsWith('.') || importPath.startsWith('/');
      if (!isRelativeImport) return;
      output.push({
        old: importPath,
        new: path.join(path.dirname(pathName), importPath),
      });
    }
  });
  return output;
}

export function printRecursiveFrom(
  node: ts.Node, indentLevel: number, sourceFile: ts.SourceFile
) {
  const indentation = '-'.repeat(indentLevel);
  const syntaxKind = ts.SyntaxKind[node.kind];
  const nodeText = node.getText(sourceFile);
  console.log(`${indentation}${syntaxKind}: ${nodeText}`);

  node.forEachChild(child =>
    printRecursiveFrom(child, indentLevel + 1, sourceFile)
  );
}

export function getXpineOnLoadFunction(pathName: string, source: ts.SourceFile, onLoadFileResult: OnLoadFileResult) {
  const value = {
    imports: '',
    fn: '',
  };
  source.forEachChild(child => {
    if (child.kind == ts.SyntaxKind.ImportDeclaration) {
      let importText = child.getText(source);
      // Adjust import locations
      const importOutput = getImportsToAbsolutePaths(child, source, pathName);
      for (const importItem of importOutput) {
        importText = importText.replace(importItem.old, importItem.new);
      }
      value.imports = importText + '\n' + value.imports;
    }
    if ([ts.SyntaxKind.FirstStatement, ts.SyntaxKind.FunctionDeclaration].includes(child.kind)) {
      let text = child.getText(source);
      if (text.includes('xpineOnLoad')) {
        // @ts-ignore
        const body = (child?.body?.getText(source) || '');
        // Make the contents of the xpineOnLoad function an IIFE
        value.fn = value.fn + '\n' + body ? `(function() ${(body)})();` : '';
      }
    }
  });
  return value;
}

export async function triggerXPineOnLoad(noCache: boolean = false) {
  context.clear();
  const xpineOnLoad = (await import(
    path.join(xpineConfig.distDir, `./__xpineOnLoad.js${noCache ? `?cache=${Date.now()}` : ''}`),
  ))?.default;
  if (xpineOnLoad) await xpineOnLoad();
}