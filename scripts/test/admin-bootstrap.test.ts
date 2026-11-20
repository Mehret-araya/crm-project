import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AdminBootstrapError,
  bootstrapInitialAdmin,
  readAdminBootstrapInput,
  type AdminBootstrapDependencies,
} from "../src/admin-bootstrap.ts";

test("bootstrap input requires environment values without exposing their contents", () => {
  assert.throws(
    () => readAdminBootstrapInput({}),
    (error: unknown) =>
      error instanceof AdminBootstrapError &&
      /ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD/.test(error.message),
  );
  assert.throws(() => readAdminBootstrapInput({
    ADMIN_NAME: "Admin",
    ADMIN_EMAIL: "admin@example.test",
    ADMIN_PASSWORD: "short",
  }), /at least 12 characters/);
});

test("bootstrap normalizes the email and stores only a password hash", async () => {
  let admins = 0;
  let claimed = false;
  let created: { name: string; email: string; passwordHash: string } | undefined;
  const dependencies: AdminBootstrapDependencies = {
    async countAdmins() { return admins; },
    async claimBootstrap() {
      if (claimed) return false;
      claimed = true;
      return true;
    },
    async hashPassword(password) { return `hash:${password}`; },
    async createAdmin(input) { created = input; admins += 1; },
  };

  await bootstrapInitialAdmin({
    name: "  CRM Admin ",
    email: " ADMIN@Example.Test ",
    password: "local-test-password",
  }, dependencies);

  assert.deepEqual(created, {
    name: "CRM Admin",
    email: "admin@example.test",
    passwordHash: "hash:local-test-password",
  });
  await assert.rejects(
    () => bootstrapInitialAdmin({ name: "Admin", email: "admin@example.test", password: "local-test-password" }, dependencies),
    /already exists/,
  );
});

test("a previously claimed bootstrap lock blocks a second account", async () => {
  let created = false;
  const dependencies: AdminBootstrapDependencies = {
    async countAdmins() { return 0; },
    async claimBootstrap() { return false; },
    async hashPassword() { throw new Error("must not hash when locked"); },
    async createAdmin() { created = true; },
  };

  await assert.rejects(
    () => bootstrapInitialAdmin({ name: "Admin", email: "admin@example.test", password: "local-test-password" }, dependencies),
    /already been claimed/,
  );
  assert.equal(created, false);
});

test("bootstrap refuses an existing admin before claiming the lock", async () => {
  let claimed = false;
  const dependencies: AdminBootstrapDependencies = {
    async countAdmins() { return 1; },
    async claimBootstrap() { claimed = true; return true; },
    async hashPassword() { throw new Error("must not hash when an admin exists"); },
    async createAdmin() {},
  };

  await assert.rejects(
    () => bootstrapInitialAdmin({ name: "Admin", email: "admin@example.test", password: "local-test-password" }, dependencies),
    /already exists/,
  );
  assert.equal(claimed, false);
});
