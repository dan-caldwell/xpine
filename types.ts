import { NextFunction, Request, Response } from 'express';
import ts from 'typescript';

export type XPineConfig = {
  [key: string]: any;
}

export type TokenUser = {
  email?: string;
  username?: string;
}

export type ServerRequest = Request & {
  user?: TokenUser;
  clientIp?: string;
}

export type WrapperProps = {
  req: ServerRequest;
  children: any;
  config: ConfigFile;
  data?: any;
  routePath?: string;
}

export type ConfigFile = {
  staticPaths?: boolean | (() => Promise<{ [key: string]: string }[]>);
  wrapper?: (props: WrapperProps) => Promise<any>;
  data?: (req: ServerRequest) => Promise<any>;
  routeMiddleware?: (req: ServerRequest, res: Response, next: NextFunction) => void;
}

export type PageProps = {
  req: ServerRequest;
  res: Response;
  data: any;
  routePath: string;
}

export type FileItem = {
  file: string;
  size: number;
}

export type ComponentData = {
  path: string;
  contents: string;
  clientContent: string;
  configFiles: string[];
  source: ts.SourceFile;
}