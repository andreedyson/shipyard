import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { apps } from "../src/apps.config.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

for (const app of apps) {
  await prisma.app.upsert({
    where: { name: app.id },
    update: {},
    create: { name: app.id },
  });
}

await prisma.$disconnect();
