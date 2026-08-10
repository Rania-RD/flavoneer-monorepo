export interface EnvParser<Output> {
  parse(value: string | undefined, name: string): Output;
}

type EnvSchema = Record<string, EnvParser<unknown>>;

export type EnvInput<Schema extends EnvSchema> = {
  [Key in keyof Schema]: string | undefined;
};

export type InferEnv<Schema extends EnvSchema> = {
  readonly [Key in keyof Schema]: Schema[Key] extends EnvParser<infer Output> ? Output : never;
};

export class EnvValidationError extends Error {
  readonly variable: string;

  constructor(variable: string, reason: string) {
    super(`Invalid environment variable ${variable}: ${reason}`);
    this.name = "EnvValidationError";
    this.variable = variable;
  }
}

function normalized(value: string | undefined) {
  const result = value?.trim();
  return result ? result : undefined;
}

export function requiredString(): EnvParser<string> {
  return {
    parse(value, name) {
      const result = normalized(value);
      if (!result) {
        throw new EnvValidationError(name, "a non-empty value is required");
      }
      return result;
    },
  };
}

export function optionalString(): EnvParser<string | undefined> {
  return {
    parse(value) {
      return normalized(value);
    },
  };
}

export function stringWithDefault(defaultValue: string): EnvParser<string> {
  return {
    parse(value) {
      return normalized(value) ?? defaultValue;
    },
  };
}

type UrlOptions = {
  protocols?: readonly string[];
};

function validateUrl(value: string, name: string, options: UrlOptions) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new EnvValidationError(name, "a valid absolute URL is required");
  }

  if (options.protocols && !options.protocols.includes(parsed.protocol)) {
    throw new EnvValidationError(
      name,
      `the protocol must be one of ${options.protocols.join(", ")}`,
    );
  }
  return value;
}

export function requiredUrl(options: UrlOptions = {}): EnvParser<string> {
  const valueParser = requiredString();
  return {
    parse(value, name) {
      return validateUrl(valueParser.parse(value, name), name, options);
    },
  };
}

export function optionalUrl(options: UrlOptions = {}): EnvParser<string | undefined> {
  return {
    parse(value, name) {
      const result = normalized(value);
      return result ? validateUrl(result, name, options) : undefined;
    },
  };
}

export function urlWithDefault(defaultValue: string, options: UrlOptions = {}): EnvParser<string> {
  return {
    parse(value, name) {
      return validateUrl(normalized(value) ?? defaultValue, name, options);
    },
  };
}

export function booleanWithDefault(defaultValue: boolean): EnvParser<boolean> {
  return {
    parse(value, name) {
      const result = normalized(value)?.toLowerCase();
      if (!result) {
        return defaultValue;
      }
      if (["1", "true", "yes", "on"].includes(result)) {
        return true;
      }
      if (["0", "false", "no", "off"].includes(result)) {
        return false;
      }
      throw new EnvValidationError(name, "expected a boolean value");
    },
  };
}

export function parseEnv<const Schema extends EnvSchema>(
  schema: Schema,
  source: EnvInput<Schema>,
): InferEnv<Schema> {
  const result: Partial<Record<keyof Schema, unknown>> = {};
  for (const key of Object.keys(schema) as (keyof Schema)[]) {
    result[key] = schema[key].parse(source[key], String(key));
  }
  return Object.freeze(result) as InferEnv<Schema>;
}
