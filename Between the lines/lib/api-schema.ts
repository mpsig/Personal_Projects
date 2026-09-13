import { z } from 'zod';

// Responses supports a subset of JSON Schema string formats. Keep the full
// portable schema and runtime URL validation; use the HTTP(S) pattern on wire.
export function apiSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema);
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const object = value as Record<string,unknown>;
    if (object.format === 'uri') delete object.format;
    Object.values(object).forEach(visit);
  }
  visit(json);
  return json;
}
