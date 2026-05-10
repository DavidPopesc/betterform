import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma";

declare global {
	// eslint-disable-next-line no-var
	var __prisma: PrismaClient | undefined;
}

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	max: 10, // Connection pool size - appropriate for serverless
});

const adapter = new PrismaPg(pool);

const prisma =
	global.__prisma ??
	new PrismaClient({
		adapter,
		log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
	});

// Cache in all environments (especially important for serverless)
global.__prisma = prisma;

export default prisma;