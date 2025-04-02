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
  staticPaths?: boolean | (() => Promise<string[]>);
  wrapper?: (req: ServerRequest, children: any) => Promise<any>;
}