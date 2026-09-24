import React from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { TextField, TextFieldProps } from './TextField';

export interface FormTextFieldProps<T extends FieldValues> extends Omit<TextFieldProps, 'value' | 'onChangeText' | 'error'> {
  control: Control<T>;
  name: Path<T>;
  /** Convert the string input into the form value (e.g. numbers). Defaults to the raw text. */
  parse?: (text: string) => unknown;
  /** Convert the form value to display text. Defaults to String(value ?? ''). */
  format?: (value: unknown) => string;
}

/** TextField wired to react-hook-form, showing the field's validation message. */
export function FormTextField<T extends FieldValues>({ control, name, parse, format, onBlur, ...rest }: FormTextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...rest}
          ref={field.ref}
          value={format ? format(field.value) : field.value == null ? '' : String(field.value)}
          onChangeText={text => field.onChange(parse ? parse(text) : text)}
          onBlur={e => {
            field.onBlur();
            onBlur?.(e);
          }}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
