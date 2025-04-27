import { PluginCreator } from 'postcss';

namespace plugin {
  export interface Options {}
}

// Removes layer declarations via PostCSS
// Useful for removing Tailwind layers
const plugin: PluginCreator<plugin.Options> = (opts = {}) => {
  return {
    postcssPlugin: 'postcssRemoveLayers',
    AtRule: {
      layer: atRule => {
        atRule.replaceWith(atRule.nodes);
      },
    },
  };
 };
plugin.postcss = true;

export default plugin;
