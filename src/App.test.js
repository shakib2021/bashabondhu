import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import {
  createContactRequest,
  createPropertyComment,
  createPropertyCommentReply,
  getMyContactRequest,
  getOwnerContactDetails,
  getPublicProperties,
  getPublicProperty,
} from './utils/propertyApi';
import { getNotifications } from './utils/notificationApi';

jest.mock('./utils/propertyApi', () => ({
  createProperty: jest.fn(),
  createContactRequest: jest.fn(),
  createPropertyComment: jest.fn(),
  createPropertyCommentReply: jest.fn(),
  getMyContactRequest: jest.fn(),
  getOwnerContactDetails: jest.fn(),
  getMyProperties: jest.fn().mockResolvedValue([]),
  getPublicProperties: jest.fn().mockResolvedValue([]),
  getPublicProperty: jest.fn(),
}));

jest.mock('./utils/notificationApi', () => ({
  getNotifications: jest.fn().mockResolvedValue([]),
  markNotificationRead: jest.fn().mockResolvedValue({ isRead: true }),
}));

beforeEach(() => {
  localStorage.removeItem('bashabondhu.user');
  window.history.replaceState({}, '', '/');
  getPublicProperties.mockImplementation(() => new Promise(() => {}));
  getPublicProperty.mockImplementation(() => new Promise(() => {}));
  getMyContactRequest.mockResolvedValue(null);
  getOwnerContactDetails.mockResolvedValue(null);
  getNotifications.mockResolvedValue([]);
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

test('searches home listings by street address and gender from the navbar', async () => {
  getPublicProperties.mockResolvedValueOnce([
    {
      _id: 'mens-listing',
      title: 'Bright room',
      address: '12 Lake Road',
      location: 'Dhanmondi',
      city: 'Dhaka',
      gender: 'men',
      images: [],
    },
    {
      _id: 'womens-listing',
      title: 'Quiet room',
      address: '12 Lake Road',
      location: 'Dhanmondi',
      city: 'Dhaka',
      gender: 'women',
      images: [],
    },
  ]);

  render(<App />);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search homes' }), {
    target: { value: 'Lake Road men' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));

  expect(await screen.findByRole('heading', { name: 'Bright room' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Quiet room' })).not.toBeInTheDocument();
  expect(screen.getByText('1 homes found for “Lake Road men”.')).toBeInTheDocument();
});

test('filters listings by gender and accommodation type', async () => {
  getPublicProperties.mockResolvedValueOnce([
    {
      _id: 'men-sublet',
      title: 'Men’s riverside sublet',
      accommodation_type: 'Sublet',
      gender: 'men',
      images: [],
    },
    {
      _id: 'women-sublet',
      title: 'Women’s garden sublet',
      accommodation_type: 'Sublet',
      gender: 'women',
      images: [],
    },
    {
      _id: 'men-mess',
      title: 'Men’s shared mess',
      accommodation_type: 'Mess',
      gender: 'men',
      images: [],
    },
  ]);

  render(<App />);

  await screen.findByRole('heading', { name: 'Men’s riverside sublet' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Filter by gender' }), {
    target: { value: 'men' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Filter by accommodation type' }), {
    target: { value: 'Sublet' },
  });

  expect(screen.getByRole('heading', { name: 'Men’s riverside sublet' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Women’s garden sublet' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Men’s shared mess' })).not.toBeInTheDocument();
  expect(screen.getByText('1 homes match your filters.')).toBeInTheDocument();
});

test('shows tenant workspace navigation and an empty notifications state', async () => {
  localStorage.removeItem('bashabondhu.user');
  window.history.replaceState({}, '', '/tenant/dashboard');

  render(<App />);

  const tenantNavigation = await screen.findByRole('navigation', { name: 'Tenant navigation' });
  expect(tenantNavigation).toBeInTheDocument();
  expect(within(tenantNavigation).getByRole('link', { name: 'My profile' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  expect(screen.getByText('You’re all caught up.')).toBeInTheDocument();
});

test('shows posted homes with badges based on rating, verification, and post age', async () => {
  getPublicProperties.mockResolvedValueOnce([
    {
      _id: 'popular-verified-new',
      title: 'Bright Dhanmondi room',
      accommodation_type: 'Rental room',
      location: 'Dhanmondi',
      city: 'Dhaka',
      monthly_rent: 18500,
      number_of_rooms: 1,
      bedrooms: 1,
      bathrooms: 1,
      rating: 4.7,
      isVerified: true,
      createdAt: new Date().toISOString(),
      images: [],
    },
    {
      _id: 'older-unverified',
      title: 'Older Gulshan sublet',
      accommodation_type: 'Sublet',
      location: 'Gulshan',
      city: 'Dhaka',
      monthly_rent: 22000,
      number_of_rooms: 2,
      bedrooms: 1,
      bathrooms: 1,
      rating: 0,
      isVerified: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      images: [],
    },
  ]);

  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Bright Dhanmondi room' })).toBeInTheDocument();
  expect(screen.getByText('Popular')).toBeInTheDocument();
  expect(screen.getByText('Verified')).toBeInTheDocument();
  expect(screen.getByText('New listing')).toBeInTheDocument();
  expect(screen.getByText('৳ 18,500')).toBeInTheDocument();
  const olderCard = screen.getByRole('heading', { name: 'Older Gulshan sublet' }).closest('.home-card');
  expect(olderCard).not.toHaveTextContent('Popular');
  expect(olderCard).not.toHaveTextContent('Verified');
  expect(olderCard).not.toHaveTextContent('New listing');
});

test('opens a home card, posts a comment, and replies beneath it', async () => {
  const property = {
    _id: 'property-42',
    title: 'Sunny rental room',
    accommodation_type: 'Rental room',
    location: 'Dhanmondi',
    city: 'Dhaka',
    monthly_rent: 25000,
    number_of_rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    description: 'A bright room near transit.',
    facilities: ['Wi-Fi'],
    images: [],
    gender: 'any',
    rating: 0,
    createdAt: new Date().toISOString(),
    owner: { fullName: 'Amina Owner', isVerified: true },
    comments: [],
  };
  getPublicProperties.mockResolvedValueOnce([property]);
  getPublicProperty.mockResolvedValueOnce(property);
  createPropertyComment.mockResolvedValueOnce({
    _id: 'comment-1',
    author: 'Mina Tenant',
    text: 'Is this still available?',
    createdAt: new Date().toISOString(),
  });
  createPropertyCommentReply.mockResolvedValueOnce({
    _id: 'reply-1',
    author: 'Amina Owner',
    text: 'Yes, it is available.',
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem('bashabondhu.user', JSON.stringify({ email: 'tenant@example.com', token: 'signed-token' }));

  render(<App />);

  fireEvent.click(await screen.findByRole('link', { name: 'View Sunny rental room' }));
  expect(await screen.findByRole('heading', { name: 'Sunny rental room' })).toBeInTheDocument();
  expect(screen.getByText('A bright room near transit.')).toBeInTheDocument();
  expect(screen.getAllByText('Verified owner')).toHaveLength(2);

  fireEvent.change(screen.getByLabelText('Share a question or comment'), {
    target: { value: 'Is this still available?' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Post comment' }));

  expect(await screen.findByRole('button', { name: 'Reply' })).toBeInTheDocument();
  expect(createPropertyComment).toHaveBeenCalledWith('property-42', 'Is this still available?');

  fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
  fireEvent.change(screen.getByLabelText('Reply to Mina Tenant'), {
    target: { value: 'Yes, it is available.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Post reply' }));

  const commentThread = screen.getByText('Is this still available?').closest('.property-comment-thread');
  expect(await within(commentThread).findByText('Yes, it is available.')).toBeInTheDocument();
  expect(createPropertyCommentReply).toHaveBeenCalledWith('property-42', 'comment-1', 'Yes, it is available.');
});

test('lets a tenant request contact from a property details page', async () => {
  const property = {
    _id: 'property-contact',
    title: 'Quiet rental house',
    accommodation_type: 'Rental house',
    location: 'Uttara',
    city: 'Dhaka',
    monthly_rent: 35000,
    number_of_rooms: 3,
    bedrooms: 2,
    bathrooms: 2,
    description: 'A family home.',
    facilities: [],
    images: [],
    gender: 'any',
    rating: 0,
    createdAt: new Date().toISOString(),
    owner: { fullName: 'Rafi Owner', isVerified: false },
    comments: [],
  };
  getPublicProperties.mockResolvedValueOnce([property]);
  getPublicProperty.mockResolvedValueOnce(property);
  getMyContactRequest.mockResolvedValueOnce(null);
  createContactRequest.mockResolvedValueOnce({ status: 'pending' });
  localStorage.setItem('bashabondhu.user', JSON.stringify({
    email: 'tenant@example.com',
    token: 'signed-token',
    role: 'tenant',
  }));

  render(<App />);

  fireEvent.click(await screen.findByRole('link', { name: 'View Quiet rental house' }));
  expect(await screen.findByRole('button', { name: 'Request contact' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Request contact' }));

  expect(await screen.findByText('Request sent · awaiting response')).toBeInTheDocument();
  expect(createContactRequest).toHaveBeenCalledWith('property-contact');
});

test('shows owner phone, email, and occupation after contact request acceptance', async () => {
  const property = {
    _id: 'property-accepted-contact',
    title: 'Garden apartment',
    accommodation_type: 'Rental house',
    location: 'Uttara',
    city: 'Dhaka',
    monthly_rent: 42000,
    number_of_rooms: 3,
    bedrooms: 2,
    bathrooms: 2,
    description: 'A quiet place.',
    facilities: [],
    images: [],
    gender: 'any',
    rating: 0,
    createdAt: new Date().toISOString(),
    owner: { fullName: 'Rafi Owner', isVerified: false },
    comments: [],
  };
  getPublicProperties.mockResolvedValueOnce([property]);
  getPublicProperty.mockResolvedValueOnce(property);
  getMyContactRequest.mockResolvedValueOnce({ status: 'accepted' });
  getOwnerContactDetails.mockResolvedValueOnce({
    fullName: 'Rafi Owner',
    occupation: 'Architect',
    phone: '+8801712345678',
    email: 'rafi@example.com',
  });
  localStorage.setItem('bashabondhu.user', JSON.stringify({
    email: 'tenant@example.com',
    token: 'signed-token',
    role: 'tenant',
  }));

  render(<App />);

  fireEvent.click(await screen.findByRole('link', { name: 'View Garden apartment' }));
  expect(await screen.findByText('OWNER CONTACT')).toBeInTheDocument();
  expect(screen.getByText('Architect')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '+8801712345678' })).toHaveAttribute('href', 'tel:+8801712345678');
  expect(screen.getByRole('link', { name: 'rafi@example.com' })).toHaveAttribute('href', 'mailto:rafi@example.com');
  expect(getOwnerContactDetails).toHaveBeenCalledWith('property-accepted-contact');
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
  expect(screen.queryByRole('radio', { name: /admin/i })).not.toBeInTheDocument();
  expect(screen.getAllByRole('radio')).toHaveLength(2);
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
