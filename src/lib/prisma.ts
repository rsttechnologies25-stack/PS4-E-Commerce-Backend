import { PrismaClient } from '../generated/client';
import { securityContext } from './context';

const prismaClient = new PrismaClient();

const prisma = prismaClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const context = securityContext.getStore();

        // If no context, just run the query (e.g. for background cron jobs or during startup)
        if (!context) {
          return query(args);
        }

        const { userId, isAdmin } = context;

        // Use a transaction to ensure SET LOCAL stays on the same connection
        // in PostgreSQL, SET LOCAL only lasts for the current transaction.
        return prismaClient.$transaction(async (tx) => {
          if (userId) {
            await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', '${userId}', TRUE)`);
          } else {
            await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', '', TRUE)`);
          }
          
          if (isAdmin) {
            await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', TRUE)`);
          } else {
            await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'false', TRUE)`);
          }

          return query(args);
        });
      },
    },
  },
});

export default prisma;
export { prismaClient as basePrisma };
