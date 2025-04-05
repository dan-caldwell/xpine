export default {
  dotTsx: /.tsx/,
  hasLetters: /[A-Za-z0-9]/g,
  configFile: /\+config\.[tj]sx?/g,
  dynamicRoutes: /(\[)(.*?)(\])/g,
  isDynamicRoute: /\[(.*)\]/g,
  endsWithTSX: /\.tsx$/,
  endsWithJSX: /\.jsx$/,
};
