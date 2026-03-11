export async function readJsonIfAvailable<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
