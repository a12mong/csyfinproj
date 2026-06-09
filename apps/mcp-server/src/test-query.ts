import { isSafeSelectQuery } from "./index.js";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const possibleEnvPaths = [
  path.resolve(__dirname, "../../../apps/api/.env"),
  path.resolve(__dirname, "../../api/.env"),
  path.resolve(process.cwd(), "apps/api/.env"),
  path.resolve(process.cwd(), "../api/.env"),
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`[TEST] Loaded environment from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

const testQueries = [
  // Safe queries
  { sql: "SELECT * FROM users LIMIT 1", expected: true },
  { sql: "  select id, email FROM users WHERE email = 'test@example.com'", expected: true },
  { sql: "SHOW TABLES", expected: true },
  { sql: "DESCRIBE users", expected: true },
  { sql: "EXPLAIN SELECT * FROM customers", expected: true },
  { sql: "WITH cte AS (SELECT * FROM users) SELECT * FROM cte", expected: true },
  { sql: "SELECT * FROM users; SELECT * FROM customers;", expected: true },
  
  // Unsafe queries
  { sql: "INSERT INTO users (email) VALUES ('hacked@hack.com')", expected: false },
  { sql: "UPDATE users SET active = 1", expected: false },
  { sql: "DELETE FROM users WHERE id = 1", expected: false },
  { sql: "DROP TABLE users", expected: false },
  { sql: "ALTER TABLE users ADD COLUMN age INT", expected: false },
  { sql: "TRUNCATE TABLE users", expected: false },
  { sql: "SELECT * FROM users; DROP TABLE customers;", expected: false },
  { sql: "SELECT * FROM users INTO OUTFILE '/tmp/users.txt'", expected: false },
];

console.log("\n--- Testing query safety filter ---");
let allTestsPassed = true;
for (const test of testQueries) {
  const result = isSafeSelectQuery(test.sql);
  const passed = result === test.expected;
  if (!passed) {
    allTestsPassed = false;
  }
  console.log(
    `[${passed ? "PASS" : "FAIL"}] SQL: "${test.sql.trim()}" -> Expected: ${test.expected}, Got: ${result}`
  );
}

if (allTestsPassed) {
  console.log("\n✅ All query safety filter tests passed!");
} else {
  console.log("\n❌ Some query safety filter tests failed!");
}

async function testConnection() {
  console.log("\n--- Testing Database Connection ---");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not found!");
    return;
  }

  try {
    const connection = await mysql.createConnection(databaseUrl);
    console.log("✅ Successfully connected to the database!");
    
    // Execute a simple query
    console.log("Executing simple query: SELECT COUNT(*) as count FROM users");
    const [rows]: any = await connection.query("SELECT COUNT(*) as count FROM users");
    console.log(`✅ Success! Row count:`, rows[0]?.count);
    
    await connection.end();
  } catch (error: any) {
    console.error(`❌ Connection failed: ${error.message}`);
  }
}

testConnection().catch(console.error);
