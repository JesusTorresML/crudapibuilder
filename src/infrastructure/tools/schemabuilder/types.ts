/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Field descriptors and schema definition types
 * used by the schema builder.
 */

export type StringField = {
  type: "string";
  min?: number;
  max?: number;
  regex?: RegExp;
  default?: string;
  required?: boolean;
  doc?: string;
};

export type NumberField = {
  type: "number";
  min?: number;
  max?: number;
  int?: boolean;
  default?: number;
  required?: boolean;
  doc?: string;
};

export type BooleanField = {
  type: "boolean";
  default?: boolean;
  required?: boolean;
  doc?: string;
};

export type DateField = {
  type: "date";
  default?: string;
  required?: boolean;
  doc?: string;
};

export type EnumField<T extends readonly [string, ...string[]]> = {
  type: "enum";
  values: T;
  default?: T[number];
  required?: boolean;
  doc?: string;
};

export type ArrayField = {
  type: "array";
  items: Field;
  default?: unknown[];
  required?: boolean;
  doc?: string;
};

export type ObjectField = {
  type: "object";
  properties: SchemaDef;
  required?: boolean;
  doc?: string;
};

export type Field =
  | StringField
  | NumberField
  | BooleanField
  | DateField
  | EnumField<any>
  | ArrayField
  | ObjectField;

/**
 * A schema definition is a record of property names to field definitions.
 */
export type SchemaDef = Record<string, Field>;
