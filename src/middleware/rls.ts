import { Request, Response, NextFunction } from 'express';
import { securityContext } from '../lib/context';

export const rlsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Initialize an empty security context for the current request
  securityContext.run({}, () => next());
};
