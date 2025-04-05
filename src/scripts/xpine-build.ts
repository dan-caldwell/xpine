#!/usr/bin/env node

import { buildApp } from './build';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv)).argv;

// @ts-ignore
buildApp(argv?.isDev || false, argv?.removePreviousBuild || false);