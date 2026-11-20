export async function connectBeforeListen<T>(
  connect: () => Promise<void>,
  listen: () => T | Promise<T>,
): Promise<T> {
  await connect();
  return listen();
}
