import { globSync } from 'glob';
import { config } from '../util/get-config';
import fs from 'fs-extra';
import postcss from 'postcss';
import { logSize } from '../scripts/build';
import postcssRemoveLayers from './postcss/remove-layers';
import postcssAddBreakpointData from './postcss/add-breakpoint-data';
// @ts-ignore
import tailwindPostcss from '@tailwindcss/postcss';

export async function buildCSS(disableTailwind?: boolean) {
  const cssFiles = globSync(config.srcDir + '/**/*.css');
  for (const file of cssFiles) {
    try {
      const fileContents = fs.readFileSync(file, 'utf-8');
      let result = fileContents;
      if (!disableTailwind) {
        // Add the breakpoint data before processing Tailwind
        result = await postcss([postcssAddBreakpointData()]).process(fileContents, { from: file, });
        result = await postcss([tailwindPostcss(), postcssRemoveLayers()]).process(result.css, { from: file, });
      }
      // Write to dist folder
      const newPath = file.replace(config.srcDir, config.distDir);
      fs.ensureFileSync(newPath);
      fs.writeFileSync(newPath, result.css);
    } catch (err) {
      console.error(err);
    }
  }
  logSize(config.distPublicDir, 'css');
}
