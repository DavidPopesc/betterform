import { PrismaClient } from "./generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
	// eslint-disable-next-line no-var
	var __prisma: PrismaClient | undefined;
	// eslint-disable-next-line no-var
	var __pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL is not set");
}

const pool = global.__pgPool ?? new Pool({ connectionString });
const prisma = global.__prisma ?? new PrismaClient({ adapter: new PrismaPg(pool) });

if (process.env.NODE_ENV !== "production") {
	global.__pgPool = pool;
	global.__prisma = prisma;
}

export default prisma;