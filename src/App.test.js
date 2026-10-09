import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

test('renders the home page and main navigation', () => {
  render(<App />);

  expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /find a place that feels like home/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
  expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register');
});

test('opens the navigation menu when its toggle is activated', () => {
  render(<App />);
  const menuToggle = screen.getByRole('button', { name: /open navigation menu/i });

  fireEvent.click(menuToggle);

  expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: /find a home/i })).toBeInTheDocument();
});

test('navigates between home, registration, and login without reloading', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('link', { name: /register/i }));
  expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/register');

  fireEvent.click(screen.getByRole('link', { name: /log in/i }));
  expect(screen.getByRole('heading', { name: /^log in$/i })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/login');
});

test('registration offers one account type and Google only', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: /register/i }));

  expect(screen.getByRole('radio', { name: /tenant/i })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /owner/i })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /admin/i })).toBeInTheDocument();
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(screen.getByRole('button', { name: /sign up with google/i })).toBeDisabled();
  expect(screen.queryByLabelText(/email|password/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('radio', { name: /tenant/i }));
  expect(screen.getByRole('radio', { name: /tenant/i })).toBeChecked();
});

test('login offers Google as its only sign-in method', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: /log in/i }));

  expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  expect(screen.queryByLabelText(/email|password/i)).not.toBeInTheDocument();
});
