import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const raw = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
const dbUrl = raw.startsWith('file:') ? raw.slice(5) : raw;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const achievements = [
  // ── Postęp odkrywania ───────────────────────────────────────────────────────
  {
    name: 'Pierwsze odkrycie',
    description: 'Odkryj swoje pierwsze miejsce logopedyczne',
    icon: '👣', color: '#00C4D4',
    conditionType: 'total_count', conditionValue: 1, conditionCategory: null, buildingIds: null, order: 1,
  },
  {
    name: 'Logopedyczny start',
    description: 'Odkryj 3 miejsca',
    icon: '🔭', color: '#00C4D4',
    conditionType: 'total_count', conditionValue: 3, conditionCategory: null, buildingIds: null, order: 2,
  },
  {
    name: 'Poszukiwacz wiedzy',
    description: 'Odkryj 5 miejsc',
    icon: '🗺️', color: '#0ECADC',
    conditionType: 'total_count', conditionValue: 5, conditionCategory: null, buildingIds: null, order: 3,
  },
  {
    name: 'Znawca logopedii',
    description: 'Odkryj 10 miejsc',
    icon: '⭐', color: '#1B6080',
    conditionType: 'total_count', conditionValue: 10, conditionCategory: null, buildingIds: null, order: 4,
  },
  {
    name: 'Eksplorator SpeechFlow',
    description: 'Odkryj 15 miejsc',
    icon: '🏅', color: '#1B6080',
    conditionType: 'total_count', conditionValue: 15, conditionCategory: null, buildingIds: null, order: 5,
  },
  {
    name: 'Mistrz szlaku',
    description: 'Odkryj 20 miejsc',
    icon: '🏆', color: '#0D3A52',
    conditionType: 'total_count', conditionValue: 20, conditionCategory: null, buildingIds: null, order: 6,
  },
  {
    name: 'Legenda SpeechFlow',
    description: 'Odkryj wszystkie miejsca w grze i zdobądź nagrodę! 🎟️',
    icon: '👑', color: '#0D3A52',
    conditionType: 'total_all', conditionValue: 0, conditionCategory: null, buildingIds: null, order: 7,
  },
  // ── Czasowe ─────────────────────────────────────────────────────────────────
  {
    name: 'Maraton odkrywcy',
    description: 'Odkryj wszystkie miejsca w ciągu jednego dnia',
    icon: '🎯', color: '#E67E22',
    conditionType: 'all_in_one_day', conditionValue: 1, conditionCategory: null, buildingIds: null, order: 100,
  },
  {
    name: 'Weekendowy odkrywca',
    description: 'Bądź aktywny przez 2 różne dni',
    icon: '📅', color: '#8E44AD',
    conditionType: 'days_active', conditionValue: 2, conditionCategory: null, buildingIds: null, order: 101,
  },
  {
    name: 'Wytrwały spacerowicz',
    description: 'Bądź aktywny przez 3 dni',
    icon: '🚶', color: '#8E44AD',
    conditionType: 'days_active', conditionValue: 3, conditionCategory: null, buildingIds: null, order: 102,
  },
  {
    name: 'Systematyczny eksplorator',
    description: 'Bądź aktywny przez 7 dni',
    icon: '🗓️', color: '#8E44AD',
    conditionType: 'days_active', conditionValue: 7, conditionCategory: null, buildingIds: null, order: 103,
  },
  {
    name: 'Powrót do gry',
    description: 'Wróć do gry po przerwie dłuższej niż 7 dni',
    icon: '🔄', color: '#1A7F4B',
    conditionType: 'return_after_break', conditionValue: 1, conditionCategory: null, buildingIds: null, order: 104,
  },
];

async function main() {
  console.log('Deleting existing achievements…');
  await prisma.achievement.deleteMany({});

  console.log(`Inserting ${achievements.length} achievements…`);
  await prisma.achievement.createMany({ data: achievements });

  const count = await prisma.achievement.count();
  console.log(`Done. Total achievements in DB: ${count}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
