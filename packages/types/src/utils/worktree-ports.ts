const WTC_PORT_OFFSET = 20_000;

type EnvMap = Record<string, string | undefined>;

function parsePort(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function detectIndexFromPort(portValue: string | undefined, defaultPort: number): number | null {
  const port = parsePort(portValue);
  if (port === null) {
    return null;
  }

  const index = port - WTC_PORT_OFFSET - defaultPort;
  return index >= 1 ? index : null;
}

export function detectWtcWorktreeIndex(env: EnvMap): number | null {
  return (
    detectIndexFromPort(env.GATEWAY_PORT, 8000) ??
    detectIndexFromPort(env.POSTGRES_PORT, 5432)
  );
}

export function resolveWorktreePort(
  defaultPort: number,
  explicitPort: string | undefined,
  env: EnvMap,
): number {
  const parsedExplicitPort = parsePort(explicitPort);
  if (parsedExplicitPort !== null && parsedExplicitPort !== defaultPort) {
    return parsedExplicitPort;
  }

  return deriveWorktreePort(defaultPort, env) ?? parsedExplicitPort ?? defaultPort;
}

export function deriveWorktreePort(defaultPort: number, env: EnvMap): number | null {
  const worktreeIndex = detectWtcWorktreeIndex(env);
  if (worktreeIndex === null) {
    return null;
  }

  return WTC_PORT_OFFSET + defaultPort + worktreeIndex;
}

export function resolveLocalServiceUrl({
  defaultPort,
  explicitPort,
  explicitUrl,
  env,
}: {
  defaultPort: number;
  explicitPort?: string;
  explicitUrl?: string;
  env: EnvMap;
}): string {
  const parsedExplicitPort = parsePort(explicitPort);
  const localPortOverride =
    parsedExplicitPort !== null && parsedExplicitPort !== defaultPort
      ? parsedExplicitPort
      : deriveWorktreePort(defaultPort, env) ?? parsedExplicitPort;
  if (localPortOverride !== null) {
    return `http://localhost:${localPortOverride}`;
  }

  return explicitUrl ?? `http://localhost:${defaultPort}`;
}
