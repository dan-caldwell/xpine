import fs from 'fs-extra';

export default function getDataFiles(dataFiles: any[]) {
  return {
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
  };
}
