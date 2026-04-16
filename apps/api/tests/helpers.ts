import jwt from "jsonwebtoken";
import type { AuthPayload } from "../src/middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me";

export function generateToken(payload: Omit<AuthPayload, "sub"> & { sub?: string }, userId?: string): string {
  return jwt.sign(
    {
      sub: userId || "test-user-id",
      email: payload.email,
      role: payload.role,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

export function createAuthHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function makeRequest(
  method: string,
  path: string,
  token?: string,
  body?: unknown
): Promise<Response> {
  const baseUrl = "http://localhost:4000";
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method,
    headers,
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return fetch(`${baseUrl}${path}`, init);
}

export async function jsonResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}
