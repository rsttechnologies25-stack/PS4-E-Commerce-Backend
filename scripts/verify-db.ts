import { basePrisma } from '../src/lib/prisma';

async function main() {
  console.log('--- START DATABASE DIAGNOSTIC ---');
  try {
    const databaseUrl = process.env.DATABASE_URL;
    console.log('DATABASE_URL from ENV:', databaseUrl ? '***PRESENT***' : '***MISSING***');

    console.log('\nChecking SiteSettings table columns...');
    const columns: any = await basePrisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'SiteSettings'
    `;
    
    if (columns.length === 0) {
      console.log('❌ TABLE NOT FOUND: SiteSettings does not exist in the database.');
    } else {
      console.log('Found columns:');
      columns.forEach((col: any) => {
        console.log(` - ${col.column_name} (${col.data_type})`);
      });
    }

    console.log('\nChecking for Order.readableId column...');
    const orderColumns: any = await basePrisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Order' AND column_name = 'readableId'
    `;
    console.log('Order.readableId exists:', orderColumns.length > 0 ? '✅ YES' : '❌ NO');

  } catch (error) {
    console.error('❌ DIAGNOSTIC FAILED:', error);
  } finally {
    await basePrisma.$disconnect();
    console.log('\n--- END DATABASE DIAGNOSTIC ---');
  }
}

main();
