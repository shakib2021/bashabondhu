import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import ChatInbox from './ChatInbox';
import { getStoredUser } from '../../utils/authStorage';
import { getChatMessages, getMyChats, sendChatMessage } from '../../utils/chatApi';

vi.mock('../../components/common/Navbar', () => ({ default: () => null }));
vi.mock('../../components/common/Footer', () => ({ default: () => null }));
vi.mock('../../utils/authStorage', () => ({ getStoredUser: vi.fn() }));
vi.mock('../../utils/chatApi', () => ({
  getChatMessages: vi.fn(),
  getMyChats: vi.fn(),
  sendChatMessage: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getStoredUser.mockReturnValue({ id: 'tenant-id', token: 'tenant-token' });
  getMyChats.mockResolvedValue([{
    id: 'conversation-1',
    listingType: 'property',
    listingId: 'property-1',
    listingTitle: 'Sunny apartment',
    otherParticipant: { id: 'owner-id', fullName: 'Home Owner' },
    lastMessage: 'Is this available?',
    unreadCount: 0,
  }]);
  getChatMessages.mockResolvedValue([{
    id: 'message-1',
    senderId: 'owner-id',
    senderName: 'Home Owner',
    text: 'Yes, it is available.',
    createdAt: '2026-01-01T10:00:00.000Z',
  }]);
  sendChatMessage.mockResolvedValue({
    id: 'message-2',
    senderId: 'tenant-id',
    senderName: 'Home Seeker',
    text: 'Can I visit tomorrow?',
    createdAt: '2026-01-01T10:05:00.000Z',
  });
});

test('loads a private conversation and lets the user send a reply', async () => {
  render(
    <MemoryRouter initialEntries={['/messages?conversation=conversation-1']}>
      <Routes>
        <Route path="/messages" element={<ChatInbox />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText('Yes, it is available.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Your message'), {
    target: { value: 'Can I visit tomorrow?' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));

  await waitFor(() => {
    expect(sendChatMessage).toHaveBeenCalledWith('conversation-1', 'Can I visit tomorrow?');
    expect(screen.getByText('Can I visit tomorrow?')).toBeInTheDocument();
  });
});
