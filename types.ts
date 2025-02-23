import { Request } from 'express';

export type XPineConfig = {
  [key: string]: string;
}

export type TokenUser = {
  email?: string;
  username?: string;
}

export type ServerRequest = Request & {
  user?: TokenUser;
}