import { Response } from 'express';
import { ServerRequest } from 'xpine/dist/types';

export default async function myEndpoint(req: ServerRequest, res: Response) {
  res.status(200).json({
    message: 'hello world',
  })
}
