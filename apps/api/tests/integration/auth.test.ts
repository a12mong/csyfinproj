import { describe, it, expect } from "vitest";
import { testPrisma as prisma } from "../setup";
import { factories } from "../factories";
import { generateToken, createAuthHeader, makeRequest, jsonResponse } from "../helpers";

describe("Auth Integration Tests", () => {
  describe("POST /api/v1/auth/login", () => {
    it("should login with valid credentials", async () => {
      const user = await factories.createUser({
        email: "user@test.local",
      });

      const response = await makeRequest("POST", "/api/v1/auth/login", undefined, {
        email: "user@test.local",
        password: "Test1234!",
      });

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ token: string; user: { id: string; email: string } }>(response);
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe("user@test.local");
      expect(data.user.id).toBe(user.id);
    });

    it("should reject invalid credentials", async () => {
      await factories.createUser({
        email: "user@test.local",
      });

      const response = await makeRequest("POST", "/api/v1/auth/login", undefined, {
        email: "user@test.local",
        password: "WrongPassword",
      });

      expect(response.status).toBe(401);
      const data = await jsonResponse<{ error: string }>(response);
      expect(data.error).toContain("Invalid credentials");
    });

    it("should reject non-existent user", async () => {
      const response = await makeRequest("POST", "/api/v1/auth/login", undefined, {
        email: "nonexistent@test.local",
        password: "Test1234!",
      });

      expect(response.status).toBe(401);
      const data = await jsonResponse<{ error: string }>(response);
      expect(data.error).toContain("Invalid credentials");
    });

    it("should reject invalid request body", async () => {
      const response = await makeRequest("POST", "/api/v1/auth/login", undefined, {
        email: "user@test.local",
        // missing password
      });

      expect(response.status).toBe(400);
      const data = await jsonResponse<{ error: string }>(response);
      expect(data.error).toContain("Validation failed");
    });
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register new user as admin", async () => {
      const admin = await factories.createAdmin();
      const token = generateToken({ email: admin.email, role: "admin" }, admin.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/auth/register",
        token,
        {
          email: "newuser@test.local",
          password: "NewPass1234!",
          name: "New User",
          role: "staff",
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{ user: { email: string; name: string; role: string } }>(response);
      expect(data.user.email).toBe("newuser@test.local");
      expect(data.user.name).toBe("New User");
      expect(data.user.role).toBe("staff");
    });

    it("should reject registration without authentication", async () => {
      const response = await makeRequest("POST", "/api/v1/auth/register", undefined, {
        email: "newuser@test.local",
        password: "NewPass1234!",
        name: "New User",
        role: "staff",
      });

      expect(response.status).toBe(401);
    });

    it("should reject registration with insufficient role", async () => {
      const staffUser = await factories.createUser({ role: "staff" });
      const token = generateToken({ email: staffUser.email, role: "staff" }, staffUser.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/auth/register",
        token,
        {
          email: "newuser@test.local",
          password: "NewPass1234!",
          name: "New User",
          role: "staff",
        }
      );

      expect(response.status).toBe(403);
    });

    it("should reject duplicate email", async () => {
      const admin = await factories.createAdmin();
      const token = generateToken({ email: admin.email, role: "admin" }, admin.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/auth/register",
        token,
        {
          email: admin.email,
          password: "DifferentPass1234!",
          name: "Different Name",
          role: "staff",
        }
      );

      expect(response.status).toBe(409);
      const data = await jsonResponse<{ error: string }>(response);
      expect(data.error).toContain("Email already in use");
    });

    it("should reject invalid request body", async () => {
      const admin = await factories.createAdmin();
      const token = generateToken({ email: admin.email, role: "admin" }, admin.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/auth/register",
        token,
        {
          email: "newuser@test.local",
          // missing password, name, role
        }
      );

      expect(response.status).toBe(400);
      const data = await jsonResponse<{ error: string }>(response);
      expect(data.error).toContain("Validation failed");
    });
  });
});
