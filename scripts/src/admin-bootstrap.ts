export const ADMIN_BOOTSTRAP_LOCK_ID = "admin-bootstrap";

export interface AdminBootstrapInput {
  name: string;
  email: string;
  password: string;
}

export interface NormalizedAdminBootstrapInput {
  name: string;
  email: string;
  password: string;
}

export interface AdminBootstrapDependencies {
  countAdmins(): Promise<number>;
  claimBootstrap(): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
  createAdmin(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<void>;
}

export class AdminBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminBootstrapError";
  }
}

export function normalizeAdminBootstrapInput(
  input: AdminBootstrapInput,
): NormalizedAdminBootstrapInput {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name || name.length > 120) {
    throw new AdminBootstrapError("ADMIN_NAME must be between 1 and 120 characters.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AdminBootstrapError("ADMIN_EMAIL must be a valid email address.");
  }
  if (password.length < 12) {
    throw new AdminBootstrapError("ADMIN_PASSWORD must be at least 12 characters.");
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new AdminBootstrapError("ADMIN_PASSWORD must not exceed 72 UTF-8 bytes.");
  }

  return { name, email, password };
}

export function readAdminBootstrapInput(
  env: NodeJS.ProcessEnv = process.env,
): NormalizedAdminBootstrapInput {
  const name = env.ADMIN_NAME;
  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new AdminBootstrapError(
      "Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in the environment before bootstrapping.",
    );
  }

  return normalizeAdminBootstrapInput({ name, email, password });
}

export async function bootstrapInitialAdmin(
  input: AdminBootstrapInput,
  dependencies: AdminBootstrapDependencies,
): Promise<void> {
  const normalized = normalizeAdminBootstrapInput(input);

  if ((await dependencies.countAdmins()) > 0) {
    throw new AdminBootstrapError(
      "Admin bootstrap is closed because an admin account already exists.",
    );
  }

  if (!(await dependencies.claimBootstrap())) {
    throw new AdminBootstrapError(
      "Admin bootstrap has already been claimed. Inspect the database before retrying.",
    );
  }

  // Recheck after claiming the unique lock to protect against another writer
  // that created an admin without using this bootstrap command.
  if ((await dependencies.countAdmins()) > 0) {
    throw new AdminBootstrapError(
      "Admin bootstrap is closed because an admin account already exists.",
    );
  }

  const passwordHash = await dependencies.hashPassword(normalized.password);
  await dependencies.createAdmin({
    name: normalized.name,
    email: normalized.email,
    passwordHash,
  });
}
