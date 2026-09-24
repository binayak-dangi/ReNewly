import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toApiError } from '../api/errors';

/**
 * Puts server-side validation errors next to the matching inputs.
 * Returns a message for anything that could not be attached to a field (show it above the form),
 * or null when every error was placed on a field.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  const apiError = toApiError(error);
  let placedAny = false;

  for (const field of fields) {
    const message = apiError.fieldError(field);
    if (message) {
      setError(field, { type: 'server', message }, { shouldFocus: !placedAny });
      placedAny = true;
    }
  }

  const unplaced = Object.keys(apiError.details).some(key => !fields.includes(key as Path<T>));
  if (!placedAny || unplaced) {
    return apiError.message;
  }
  return null;
}
