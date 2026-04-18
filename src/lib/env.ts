// Centralised env access. Throws early if required vars are missing.

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  anthropicApiKey: () => required("ANTHROPIC_API_KEY"),
  databaseUrl: () => required("DATABASE_URL"),
  redisUrl: () => required("REDIS_URL"),
  appPassword: () => required("APP_PASSWORD"),
  sessionSecret: () => required("SESSION_SECRET"),
  cronSecret: () => optional("CRON_SECRET", ""),
  publicAppUrl: () => optional("PUBLIC_APP_URL", ""),
  claudeModel: () => optional("CLAUDE_MODEL", "claude-sonnet-4-6"),
  claudeMaxTokens: () => parseInt(optional("CLAUDE_MAX_TOKENS", "4096"), 10),
};
