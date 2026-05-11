import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('SpeechFlow – Logopedyczna Gra Terenowa');
  console.log('Baza budynków jest pusta — dodaj miejsca przez panel administracyjny.');
  console.log('Uruchom seed-categories.ts i seed-achievements.ts żeby załadować kategorie i odznaki.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
