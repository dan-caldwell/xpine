import { Response } from "express";
import { ServerRequest } from "xpine/dist/types";

export const config = {
  routeMiddleware(req, res, next) {
    console.log('route middleware');
    next();
  }
}

export default async function uploadFile(req: ServerRequest, res: Response) {
  try {
    const {
      uploadId,
      partNumber,
    } = req?.query;
    console.log({
      uploadId,
      partNumber,
    });
    res.status(200).json({
      message: 'Uploaded file',
    })
  } catch (err) {
    console.error(err);
    return res.status(err?.status || 500).json(err?.response || { message: 'Error' });
  }
}