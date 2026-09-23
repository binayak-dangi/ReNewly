import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { ApiError, ErrorCodes } from '../../api/errors';
import { Button } from '../Button';
import { ErrorState } from '../StateViews';
import { TextField } from '../TextField';

describe('design system', () => {
  it('Button reports busy and ignores presses while loading', async () => {
    const onPress = jest.fn();
    await render(<Button title="Save" loading onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Save' });
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });

  it('TextField shows the error and toggles password visibility', async () => {
    await render(<TextField label="Password" password value="secret" error="Password is required." />);

    expect(screen.getByText('Password is required.')).toBeTruthy();
    const input = screen.getByLabelText('Password');
    expect(input.props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
  });

  it('ErrorState distinguishes offline from server errors', async () => {
    const onRetry = jest.fn();
    const { rerender } = await render(
      <ErrorState error={new ApiError({ code: ErrorCodes.Network, message: 'No connection' })} onRetry={onRetry} />,
    );
    expect(screen.getByText("You're offline")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await rerender(<ErrorState error={new ApiError({ code: ErrorCodes.InternalError, message: 'Boom', status: 500 })} />);
    expect(screen.getByText("Couldn't load this")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
});
