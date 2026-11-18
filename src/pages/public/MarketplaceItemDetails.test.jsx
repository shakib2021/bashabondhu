import { vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MarketplaceItemDetails from './MarketplaceItemDetails';
import { saveUserProfile } from '../../utils/authStorage';
import {
  createMarketplaceComment,
  createMarketplaceCommentReply,
  getMarketplaceItem,
} from '../../utils/marketplaceApi';
import { startChat } from '../../utils/chatApi';

vi.mock('../../utils/marketplaceApi', () => ({
  createMarketplaceComment: vi.fn(),
  createMarketplaceCommentReply: vi.fn(),
  createMarketplaceOffer: vi.fn(),
  getMarketplaceItem: vi.fn(),
}));

vi.mock('../../utils/chatApi', () => ({
  startChat: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  saveUserProfile(
    { id: 'buyer-id', email: 'buyer@example.com' },
    { fullName: 'Buyer' },
    'tenant',
    'buyer-token',
  );
  getMarketplaceItem.mockResolvedValue({
    _id: 'item-id',
    sellerId: 'seller-id',
    sellerName: 'Seller',
    title: 'Desk lamp',
    description: 'Works well.',
    price: 1200,
    condition: 'Good',
    location: 'Dhanmondi',
    status: 'available',
    images: [],
    comments: [],
  });
  createMarketplaceComment.mockResolvedValue({
    _id: 'comment-id',
    author: 'Buyer',
    text: 'Is pickup available?',
    replies: [],
  });
  createMarketplaceCommentReply.mockResolvedValue({
    _id: 'reply-id',
    author: 'Buyer',
    text: 'Thanks!',
  });
  startChat.mockResolvedValue({ id: 'conversation-id' });
});

test('offers private seller chat alongside public comments and replies', async () => {
  render(
    <MemoryRouter initialEntries={['/marketplace/items/item-id']}>
      <Routes>
        <Route path="/marketplace/items/:itemId" element={<MarketplaceItemDetails />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'Desk lamp' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Message Seller' })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Share a question or comment'), {
    target: { value: 'Is pickup available?' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Post comment' }));

  expect(await screen.findByText('Is pickup available?')).toBeInTheDocument();
  await waitFor(() => {
    expect(createMarketplaceComment).toHaveBeenCalledWith('item-id', 'Is pickup available?');
  });

  fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
  fireEvent.change(screen.getByLabelText('Reply to Buyer'), { target: { value: 'Thanks!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Post reply' }));

  await waitFor(() => {
    expect(createMarketplaceCommentReply).toHaveBeenCalledWith('item-id', 'comment-id', 'Thanks!');
    expect(screen.getByText('Thanks!')).toBeInTheDocument();
  });

  fireEvent.change(screen.getByLabelText('Your message to Seller'), {
    target: { value: 'Could I pick this up today?' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => {
    expect(startChat).toHaveBeenCalledWith('marketplace', 'item-id', 'Could I pick this up today?');
  });
});
