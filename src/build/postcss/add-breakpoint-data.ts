import { Declaration, PluginCreator } from 'postcss';

namespace plugin {
  export interface Options { }
}

// Adds breakpoint data based on the @theme breakpoints
// This allows us to trigger breakpoint change events
const plugin: PluginCreator<plugin.Options> = (opts = {}) => {
  const nodeValues = [];
  return {
    postcssPlugin: 'addBreakpointData',
    AtRule: {
      theme(atRule) {
        const nodes = atRule.nodes.filter(node => {
          // @ts-ignore
          return node.prop.startsWith('--breakpoint-');
        });
        nodeValues.push(...nodes.map(node => {
          return {
            // @ts-ignore
            breakpoint: node.prop.replace('--breakpoint-', ''),
            // @ts-ignore
            value: node.value,
          };
        }));
      },
    },
    OnceExit(root) {
      root.append([
        ':root {',
        '--active-breakpoint: "default";',
        '}'
      ].join(''));
      const nodeValuesMapped = nodeValues
        .sort((a, b) => {
          // Sort values ascending to prevent browser from using wrong values
          return Number(a.value.replace(/[^0-9]/g, '')) - Number(b.value.replace(/[^0-9]/g, ''));
        }).map(({ breakpoint, value, }) => {
          return [
            `@media (min-width: ${value}) {`,
            ':root {',
            `--active-breakpoint: "${breakpoint}";`,
            '}',
            '}'
          ].join('');
        });
      for (const value of nodeValuesMapped) {
        root.append(value);
      }
    },
  };
};
plugin.postcss = true;

export default plugin;
