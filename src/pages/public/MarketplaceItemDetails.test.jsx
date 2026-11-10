import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MarketplaceItemDetails from './MarketplaceItemDetails';
import { saveUserProfile } from '../../utils/authStorage';
import {
  createMarketplaceComment,
  createMarketplaceCommentReply,
  getMarketplaceItem,
} from '../../utils/marketplaceApi';

jest.mock('../../utils/marketplaceApi', () => ({
  createMarketplaceComment: jest.fn(),
  createMarketplaceCommentReply: jest.fn(),
  createMarketplaceOffer: jest.fn(),
  getMarketplaceItem: jest.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
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
});

test('uses public comments and replies instead of a private seller message', async () => {
  render(
    <MemoryRouter initialEntries={['/marketplace/items/item-id']}>
      <Routes>
        <Route path="/marketplace/items/:itemId" element={<MarketplaceItemDetails />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'Desk lamp' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Message to seller (optional)')).not.toBeInTheDocument();

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
});
