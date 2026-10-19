import { Transform } from 'class-transformer';
import { ValidateIf } from 'class-validator';

// For PATCH fields that can be left out but can't be cleared. class-validator's
// @IsOptional() skips validation for both undefined AND null, so a body like
// { "title": null } would slip through and fail in the database as a 500.
// This only skips when the field is absent, so null gets a proper 400.
export function IsOptionalButNotNull(): PropertyDecorator {
  return ValidateIf((_object, value) => value !== undefined);
}

// Trims surrounding whitespace before validation, so "   " counts as empty.
export function Trim(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}
