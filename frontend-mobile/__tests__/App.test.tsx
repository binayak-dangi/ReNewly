import { render, screen } from '@testing-library/react-native';
import React from 'react';
import App from '../App';

describe('App', () => {
  it('boots to the welcome screen when there is no stored session', async () => {
    await render(<App />);

    expect(await screen.findByRole('header', { name: 'Welcome' })).toBeTruthy();
  });
});
