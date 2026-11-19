import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import ChatInbox from './ChatInbox';
import { getStoredUser } from '../../utils/authStorage';
import { getChatMessages, getMyChats, sendChatMessage } from '../../utils/chatApi';
import { createContactRequest, getMyContactRequest, getOwnerContactDetails } from '../../utils/propertyApi';
import { createVisitRequest, getMyVisitRequest } from '../../utils/visitRequestApi';

const socketState = vi.hoisted(() => {
  const handlers = {};
  const socket = {
    on: vi.fn((event, handler) => {
      handlers[event] = handler;
      return socket;
    }),
    disconnect: vi.fn(),
  };
  return { handlers, socket, io: vi.fn(() => socket) };
});

vi.mock('socket.io-client', () => ({ io: socketState.io }));
vi.mock('../../components/common/Navbar', () => ({ default: () => null }));
vi.mock('../../components/common/Footer', () => ({ default: () => null }));
vi.mock('../../utils/authStorage', () => ({ getStoredUser: vi.fn() }));
vi.mock('../../utils/chatApi', () => ({
  getChatMessages: vi.fn(),
  getMyChats: vi.fn(),
  sendChatMessage: vi.fn(),
}));
vi.mock('../../utils/propertyApi', () => ({
  createContactRequest: vi.fn(),
  getMyContactRequest: vi.fn(),
  getOwnerContactDetails: vi.fn(),
}));
vi.mock('../../utils/visitRequestApi', () => ({
  createVisitRequest: vi.fn(),
  getMyVisitRequest: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(socketState.handlers).forEach((event) => delete socketState.handlers[event]);
  socketState.socket.on.mockClear();
  getStoredUser.mockReturnValue({ id: 'tenant-id', token: 'tenant-token' });
  getMyContactRequest.mockResolvedValue(null);
  getOwnerContactDetails.mockResolvedValue(null);
  getMyVisitRequest.mockResolvedValue(null);
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
  createVisitRequest.mockResolvedValue({
    _id: 'visit-request-1',
    status: 'pending',
    visitAt: '2030-01-02T12:30:00.000Z',
  });
  createContactRequest.mockResolvedValue({ _id: 'contact-request-1', status: 'pending' });
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

test('shows new chat messages received through Socket.IO immediately', async () => {
  getChatMessages.mockResolvedValue([
    {
      id: 'message-1',
      senderId: 'owner-id',
      senderName: 'Home Owner',
      text: 'Yes, it is available.',
      createdAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'message-3',
      senderId: 'owner-id',
      senderName: 'Home Owner',
      text: 'New real-time reply',
      createdAt: '2026-01-01T10:10:00.000Z',
    },
  ]);
  render(
    <MemoryRouter initialEntries={['/messages?conversation=conversation-1']}>
      <Routes>
        <Route path="/messages" element={<ChatInbox />} />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByText('Yes, it is available.');
  expect(socketState.io).toHaveBeenCalledWith(
    'http://localhost:5000',
    { auth: { token: 'tenant-token' } },
  );
  await act(async () => {
    socketState.handlers['chat:new-message']({
      conversationId: 'conversation-1',
      message: {
        id: 'message-3',
        senderId: 'owner-id',
        senderName: 'Home Owner',
        text: 'New real-time reply',
        createdAt: '2026-01-01T10:10:00.000Z',
      },
    });
  });

  expect(screen.getByText('New real-time reply')).toBeInTheDocument();
});

test('lets a tenant request owner contact details from the conversation', async () => {
  getStoredUser.mockReturnValue({ id: 'tenant-id', token: 'tenant-token', role: 'tenant' });
  render(
    <MemoryRouter initialEntries={['/messages?property=property-1']}>
      <Routes>
        <Route path="/messages" element={<ChatInbox />} />
      </Routes>
    </MemoryRouter>,
  );

  const requestButton = await screen.findByRole('button', { name: 'Request contact' });
  fireEvent.click(requestButton);

  await waitFor(() => {
    expect(createContactRequest).toHaveBeenCalledWith('property-1');
    expect(screen.getByText('Request sent · awaiting response')).toBeInTheDocument();
  });
});

test('shows owner contact details in chat after a request is accepted', async () => {
  getStoredUser.mockReturnValue({ id: 'tenant-id', token: 'tenant-token', role: 'tenant' });
  getMyContactRequest.mockResolvedValue({ _id: 'contact-request-1', status: 'accepted' });
  getOwnerContactDetails.mockResolvedValue({
    fullName: 'Home Owner',
    occupation: 'Engineer',
    phone: '+880123456789',
    email: 'owner@example.com',
  });
  render(
    <MemoryRouter initialEntries={['/messages?property=property-1']}>
      <Routes>
        <Route path="/messages" element={<ChatInbox />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText('owner@example.com')).toHaveAttribute('href', 'mailto:owner@example.com');
  expect(screen.getByText('+880123456789')).toHaveAttribute('href', 'tel:+880123456789');
});

test('lets a tenant request a property visit from the conversation', async () => {
  getStoredUser.mockReturnValue({ id: 'tenant-id', token: 'tenant-token', role: 'tenant' });
  render(
    <MemoryRouter initialEntries={['/messages?property=property-1']}>
      <Routes>
        <Route path="/messages" element={<ChatInbox />} />
      </Routes>
    </MemoryRouter>,
  );

  const visitDateTimeInput = await screen.findByLabelText('Requested date and time');
  fireEvent.change(visitDateTimeInput, {
    target: { value: '2030-01-02T12:30' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Request visit' }));

  await waitFor(() => {
    expect(createVisitRequest).toHaveBeenCalledWith(
      'property-1',
      new Date('2030-01-02T12:30').toISOString(),
    );
    expect(screen.getByText('Visit pending')).toBeInTheDocument();
  });
});
