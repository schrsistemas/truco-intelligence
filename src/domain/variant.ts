/**
 * Contrato versionado de uma variante de truco.
 *
 * O campo "rules" guarda parâmetros específicos da variante em JSON.
 * O domínio valida a estrutura serializável, mas não interpreta regras
 * regionais que ainda não tenham um motor implementado.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface GameVariant {
  readonly variantId: string;
  readonly name: string;
  readonly rulesVersion: number;
  readonly targetScore: 12 | 15;
  readonly playersPerTeam: number;
  readonly rules: Readonly<Record<string, JsonValue>>;
}

export type VariantValidationError =
  | "INVALID_INPUT"
  | "INVALID_ID"
  | "INVALID_NAME"
  | "INVALID_RULES_VERSION"
  | "INVALID_TARGET_SCORE"
  | "INVALID_PLAYERS_PER_TEAM"
  | "RULES_MUST_BE_OBJECT"
  | "RULES_MUST_BE_JSON";

export type VariantValidationResult =
  | { readonly ok: true; readonly variant: GameVariant }
  | { readonly ok: false; readonly errors: readonly VariantValidationError[] };

export const DEFAULT_VARIANT: GameVariant = {
  variantId: "custom-scoreboard",
  name: "Contador personalizado",
  rulesVersion: 1,
  targetScore: 12,
  playersPerTeam: 2,
  rules: {}
};

function isJsonValue(value: unknown, ancestors = new WeakSet<object>()): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "object") {
    if (ancestors.has(value)) return false;

    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return false;

    ancestors.add(value);
    const values = Array.isArray(value)
      ? value
      : Object.values(value as Record<string, unknown>);
    const valid = values.every((item) => isJsonValue(item, ancestors));
    ancestors.delete(value);
    return valid;
  }

  return false;
}

/**
 * Valida metadados e garante que os parâmetros específicos possam ser
 * persistidos e transportados como JSON. Regras de jogo são validadas
 * pelo módulo da variante quando seu interpretador for implementado.
 */
export function validateVariant(input: unknown): VariantValidationResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: ["INVALID_INPUT"] };
  }

  const candidate = input as Record<string, unknown>;
  const errors: VariantValidationError[] = [];

  if (
    typeof candidate.variantId !== "string" ||
    !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(candidate.variantId)
  ) {
    errors.push("INVALID_ID");
  }

  if (
    typeof candidate.name !== "string" ||
    candidate.name.trim().length === 0 ||
    candidate.name.trim().length > 80
  ) {
    errors.push("INVALID_NAME");
  }

  if (
    !Number.isInteger(candidate.rulesVersion) ||
    (candidate.rulesVersion as number) < 1
  ) {
    errors.push("INVALID_RULES_VERSION");
  }

  if (candidate.targetScore !== 12 && candidate.targetScore !== 15) {
    errors.push("INVALID_TARGET_SCORE");
  }

  if (
    !Number.isInteger(candidate.playersPerTeam) ||
    (candidate.playersPerTeam as number) < 1 ||
    (candidate.playersPerTeam as number) > 4
  ) {
    errors.push("INVALID_PLAYERS_PER_TEAM");
  }

  if (
    typeof candidate.rules !== "object" ||
    candidate.rules === null ||
    Array.isArray(candidate.rules)
  ) {
    errors.push("RULES_MUST_BE_OBJECT");
  } else if (!isJsonValue(candidate.rules)) {
    errors.push("RULES_MUST_BE_JSON");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    variant: {
      variantId: candidate.variantId as string,
      name: (candidate.name as string).trim(),
      rulesVersion: candidate.rulesVersion as number,
      targetScore: candidate.targetScore as 12 | 15,
      playersPerTeam: candidate.playersPerTeam as number,
      rules: candidate.rules as Readonly<Record<string, JsonValue>>
    }
  };
}
