import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const raw = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
const dbUrl = raw.startsWith('file:') ? raw.slice(5) : raw;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const categories = [
  { value: 'poradnia',    label: 'Poradnia',    icon: '🏥', order: 1 },
  { value: 'szkola',      label: 'Szkoła',      icon: '🏫', order: 2 },
  { value: 'przedszkole', label: 'Przedszkole', icon: '🎒', order: 3 },
  { value: 'uczelnia',    label: 'Uczelnia',    icon: '🎓', order: 4 },
  { value: 'centrum',     label: 'Centrum',     icon: '🏢', order: 5 },
  { value: 'historia',    label: 'Historia',    icon: '🏛️', order: 6 },
  { value: 'kultura',     label: 'Kultura',     icon: '🎭', order: 7 },
  { value: 'instytut',    label: 'Instytut',    icon: '🔬', order: 8 },
];

async function main() {
  console.log('Deleting existing categories…');
  await prisma.category.deleteMany({});

  console.log(`Inserting ${categories.length} categories…`);
  await prisma.category.createMany({ data: categories });

  const count = await prisma.category.count();
  console.log(`Done. Total categories in DB: ${count}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
