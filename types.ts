import { Request } from 'express';

export type XPineConfig = {
  [key: string]: any;
}

export type TokenUser = {
  email?: string;
  username?: string;
}

export type ServerRequest = Request & {
  user?: TokenUser;
}

export type ConfigFile = {
  staticPaths?: boolean | (() => Promise<{ [key: string]: string}[]>);
  wrapper?: (req: ServerRequest, children: any, config?: ConfigFile) => Promise<any>;
}