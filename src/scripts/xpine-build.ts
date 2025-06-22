#!/usr/bin/env node

import { buildApp } from './build';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv)).argv;

// @ts-ignore
const { isDev, removePreviousBuild, disableTailwind, } = argv;
buildApp({ isDev, removePreviousBuild, disableTailwind, });
