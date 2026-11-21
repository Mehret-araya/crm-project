import assert from "node:assert/strict";
import { test } from "node:test";
import { registrationFormSchema } from "../src/lib/registration-schema.ts";

const validInput = {
  name: "CRM User",
  email: "user@example.test",
  password: "correct-horse-battery",
  confirmPassword: "correct-horse-battery",
};

test("registration form accepts valid account details", () => {
  assert.equal(registrationFormSchema.safeParse(validInput).success, true);
});

test("registration form rejects missing fields and invalid email", () => {
  assert.equal(registrationFormSchema.safeParse({}).success, false);
  assert.equal(registrationFormSchema.safeParse({ ...validInput, name: "   " }).success, false);
  assert.equal(registrationFormSchema.safeParse({ ...validInput, email: "not-an-email" }).success, false);
});

test("registration form enforces password length, UTF-8 byte limit, and confirmation", () => {
  assert.equal(registrationFormSchema.safeParse({
    ...validInput,
    password: "short",
    confirmPassword: "short",
  }).success, false);
  assert.equal(registrationFormSchema.safeParse({
    ...validInput,
    password: "😀".repeat(19),
    confirmPassword: "😀".repeat(19),
  }).success, false);
  assert.equal(registrationFormSchema.safeParse({
    ...validInput,
    confirmPassword: "different-password",
  }).success, false);
});
