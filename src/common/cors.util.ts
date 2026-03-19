const LOCALHOST_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes('*')) {
    return true;
  }

  if (LOCALHOST_ORIGIN_PATTERN.test(origin)) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

export function buildCorsOriginHandler(allowedOrigins: string[]) {
  return (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => {
    callback(null, isOriginAllowed(origin, allowedOrigins));
  };
}
