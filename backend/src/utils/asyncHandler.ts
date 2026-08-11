import { NextFunction, Request, RequestHandler, Response } from "express";

// Express 4 doesn't catch rejected promises from async handlers — left
// unwrapped, a thrown error becomes an unhandled rejection that crashes the
// whole process instead of producing a 500. Every route below is wrapped in
// this so failures reach the error middleware in index.ts instead.
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req as Req, res, next).catch(next);
  };
}
