import { AsyncLocalStorage } from 'async_hooks';

export type SecurityContext = {
  userId?: string;
  isAdmin?: boolean;
};

export const securityContext = new AsyncLocalStorage<SecurityContext>();

export const getSecurityContext = () => securityContext.getStore() || {};
