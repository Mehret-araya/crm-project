import type { RequestHandler } from "express";

export interface RegistrationInput {
  name: string;
  email: string;
  password: string;
}

export interface RegistrationAccount {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: "user";
}

export interface RegistrationDependencies {
  parseRegistrationBody(value: unknown): RegistrationInput | null;
  findExistingAccount(email: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
  createAccount(account: Omit<RegistrationAccount, "id">): Promise<{ id: number }>;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export function createRegistrationHandler(
  dependencies: RegistrationDependencies,
): RequestHandler {
  return async (req, res, next) => {
    const body = req.body;
    const normalizedBody =
      typeof body === "object" && body !== null && !Array.isArray(body)
        ? {
            ...body,
            ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
            ...(typeof body.email === "string" ? { email: body.email.trim() } : {}),
          }
        : body;
    const parsed = dependencies.parseRegistrationBody(normalizedBody);
    const name = parsed?.name.trim() ?? "";
    const email = parsed?.email.trim().toLowerCase() ?? "";
    const password = parsed?.password ?? "";

    if (
      !parsed ||
      !name ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      res.status(400).json({ error: "Invalid registration details" });
      return;
    }

    try {
      if (await dependencies.findExistingAccount(email)) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }

      const passwordHash = await dependencies.hashPassword(password);
      const account = await dependencies.createAccount({
        name,
        email,
        passwordHash,
        role: "user",
      });
      res.status(201).json({ id: account.id, name, email });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      next(error);
    }
  };
}
