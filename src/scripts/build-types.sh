#!/bin/bash

npx tsc \
  --declaration index.ts \
  --emitDeclarationOnly \
  --declarationMap \
  --allowImportingTsExtensions \
  --target esnext \
  --declarationDir ./dist \
  --skipLibCheck \
  --module preserve \
  --moduleResolution Bundler \
  --allowSyntheticDefaultImports
