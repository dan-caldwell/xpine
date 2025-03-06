#!/bin/bash

mkdir -p dist/lib

npx tsc --declaration index.ts --emitDeclarationOnly --declarationMap --skipLibCheck --esModuleInterop --allowImportingTsExtensions --target esnext --moduleResolution NodeNext --module NodeNext &&

echo "
declare module 'xpine' {
    import main = require('index');
    export = main;
}
" >> dist/lib/index.d.ts