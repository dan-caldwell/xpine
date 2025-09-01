import { Response } from "express";
import { ServerRequest } from "../../../../../dist/types";

export default function secretEndpoint(req: ServerRequest, res: Response) {
  res.status(200).json('Success from secret endpoint');
}