/**
 * Resolves {{variable}} placeholders in a string using the provided values.
 * Also resolves ${ENV_VAR} from process.env.
 */
export function resolveTemplate(
  template: string,
  values: Record<string, string | number | boolean>
): string {
  // 1. Resolve ${ENV_VAR} from environment
  let resolved = template.replace(/\$\{([^}]+)\}/g, (_, envKey: string) => {
    const val = process.env[envKey.trim()];
    if (val === undefined) {
      throw new Error(`Environment variable ${envKey.trim()} is not set`);
    }
    return val;
  });

  // 2. Resolve {{variable}} from provided values
  resolved = resolved.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (key in values) return String(values[key]);
    throw new Error(`Missing value for placeholder: {{${key}}}`);
  });

  return resolved;
}

/**
 * Resolve default values that reference env vars.
 */
export function resolveDefault(val: string | number | boolean | undefined): string | number | boolean | undefined {
  if (typeof val !== 'string') return val;
  const match = val.match(/^\$\{([^}]+)\}$/);
  if (match) {
    const envVal = process.env[match[1].trim()];
    return envVal ?? val; // return raw if env not set (will fail at validation)
  }
  return val;
}
