const MIN_SESSION_SECRET_BYTES = 32;

export function getSessionSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const secret = env.SESSION_SECRET;

  if (!secret || secret.trim().length === 0) {
    throw new Error(
      "SESSION_SECRET is required. Set a random secret of at least 32 bytes before starting the API.",
    );
  }

  if (secret.trim() !== secret || Buffer.byteLength(secret, "utf8") < MIN_SESSION_SECRET_BYTES) {
    throw new Error(
      "SESSION_SECRET must not contain surrounding whitespace and must be at least 32 bytes.",
    );
  }

  return secret;
}
