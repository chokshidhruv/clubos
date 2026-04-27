// sets up the prisma client as a singleton. one instance acorss the entire app. 

import { PrismaClient } from "@prisma/client/edge"

import { PrismaNeon } from "@prisma/adapter-neon"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
})

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

export default db