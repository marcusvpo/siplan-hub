const LEGACY_PHOTO_KEYS = new Set(["printer_photos", "q_printer_photos"]);

const LEGACY_PHOTO_TITLES = new Set([
  "fotos dos perifericos",
  "fotos e imagens das impressoras do cliente",
]);

type JsonObject = Record<string, unknown>;

const asJsonObject = (value: unknown): JsonObject | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as JsonObject;
};

const normalizeIdentifier = (value: unknown): string => {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
};

const isLegacyPhotoField = (key: string, fieldSchema: unknown): boolean => {
  const normalizedKey = normalizeIdentifier(key);
  const title = normalizeIdentifier(asJsonObject(fieldSchema)?.title);

  return LEGACY_PHOTO_KEYS.has(normalizedKey) || LEGACY_PHOTO_TITLES.has(title);
};

export interface SanitizedAdherenceSchema<TSchema, TUiSchema> {
  schema: TSchema;
  uiSchema: TUiSchema;
}

/**
 * Remove a galeria geral legada sem alterar as imagens vinculadas às perguntas.
 */
export function stripLegacyAdherencePhotoField<TSchema, TUiSchema>(
  schema: TSchema,
  uiSchema: TUiSchema,
): SanitizedAdherenceSchema<TSchema, TUiSchema> {
  const schemaObject = asJsonObject(schema);
  const properties = asJsonObject(schemaObject?.properties);

  if (!schemaObject || !properties) return { schema, uiSchema };

  const legacyKeys = Object.entries(properties)
    .filter(([key, fieldSchema]) => isLegacyPhotoField(key, fieldSchema))
    .map(([key]) => key);

  if (legacyKeys.length === 0) return { schema, uiSchema };

  const legacyKeySet = new Set(legacyKeys);
  const sanitizedProperties = Object.fromEntries(
    Object.entries(properties).filter(([key]) => !legacyKeySet.has(key)),
  );

  const sanitizedSchema: JsonObject = {
    ...schemaObject,
    properties: sanitizedProperties,
  };

  if (Array.isArray(schemaObject.required)) {
    sanitizedSchema.required = schemaObject.required.filter(
      (key): key is string => typeof key === "string" && !legacyKeySet.has(key),
    );
  }

  const uiSchemaObject = asJsonObject(uiSchema);
  const sanitizedUiSchema = uiSchemaObject
    ? Object.fromEntries(
        Object.entries(uiSchemaObject).filter(([key]) => !legacyKeySet.has(key)),
      )
    : uiSchema;

  return {
    schema: sanitizedSchema as TSchema,
    uiSchema: sanitizedUiSchema as TUiSchema,
  };
}

export function stripLegacyPhotoFieldFromTemplate<
  TTemplate extends { schema_json: unknown; ui_json: unknown },
>(template: TTemplate): TTemplate {
  const { schema, uiSchema } = stripLegacyAdherencePhotoField(
    template.schema_json,
    template.ui_json,
  );

  if (schema === template.schema_json && uiSchema === template.ui_json) return template;

  return {
    ...template,
    schema_json: schema,
    ui_json: uiSchema,
  };
}
