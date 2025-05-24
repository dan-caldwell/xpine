import { Response } from "express";
import { ServerRequest } from "../../../../../dist/types";

export default function route(req: ServerRequest, res: Response) {
  res.status(200).send(req.params[0]);
}
