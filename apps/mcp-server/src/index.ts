import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try resolving .env path from multiple potential locations for robustness
const possibleEnvPaths = [
  path.resolve(__dirname, "../../../apps/api/.env"),
  path.resolve(__dirname, "../../api/.env"),
  path.resolve(process.cwd(), "apps/api/.env"),
  path.resolve(process.cwd(), "../api/.env"),
  path.resolve(process.cwd(), ".env"),
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.error(`Loaded environment from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.error("Warning: Could not find apps/api/.env in standard locations. Relying on existing process environment variables.");
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Error: DATABASE_URL not found in environment or apps/api/.env");
  process.exit(1);
}

// Create connection pool
const pool = mysql.createPool({
  uri: databaseUrl,
  connectionLimit: 5,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

const server = new Server(
  {
    name: "csyfin-db-reader",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register list tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_select",
        description: "Run a read-only SELECT query on the csyfinproj MySQL database to retrieve data. Note: Only SELECT queries are permitted.",
        inputSchema: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "The SQL SELECT statement to execute. Must be read-only.",
            },
          },
          required: ["sql"],
        },
      },
    ],
  };
});

/**
 * Checks if a SQL statement is safe and read-only.
 * Only allows SELECT, SHOW, DESCRIBE, EXPLAIN, WITH.
 * Strictly blocks modifying statements and administrative functions.
 */
export function isSafeSelectQuery(sql: string): boolean {
  // Remove comments (both inline -- and block /* */ comments)
  const cleanSql = sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (!cleanSql) return false;

  // Split by semicolon to analyze individual statements
  const statements = cleanSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (statements.length === 0) return false;

  // Each statement must start with SELECT, SHOW, DESCRIBE, DESC, EXPLAIN, WITH
  const allowedStartRegex = /^(select|show|describe|desc|explain|with)\b/i;
  
  // Standalone keywords that modify database structure/data or escape queries
  const restrictedKeywords = /\b(insert|update|delete|drop|alter|truncate|create|replace|grant|revoke|rename|call|execute|into\s+outfile|into\s+dumpfile|load\s+data|handler)\b/i;

  for (const stmt of statements) {
    if (!allowedStartRegex.test(stmt)) {
      return false;
    }
    if (restrictedKeywords.test(stmt)) {
      return false;
    }
  }

  return true;
}

// Register tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== "query_select") {
    throw new Error(`Tool not found: ${name}`);
  }

  const sql = String(args?.sql || "").trim();

  if (!isSafeSelectQuery(sql)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN, WITH) are allowed. Modifying operations are strictly blocked.",
        },
      ],
      isError: true,
    };
  }

  try {
    const [rows] = await pool.query(sql);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(rows, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Database Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CSY Fin DB Reader MCP Server running on stdio");
}

// Only start the server when run directly, not when imported for testing
if (process.argv[1] && (process.argv[1].endsWith("index.ts") || process.argv[1].endsWith("index.js"))) {
  main().catch((err) => {
    console.error("Fatal error starting server:", err);
    process.exit(1);
  });
}
