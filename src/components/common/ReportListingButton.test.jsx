import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReportListingButton from './ReportListingButton';
import { saveUserProfile } from '../../utils/authStorage';
import { reportProperty } from '../../utils/propertyReportApi';

jest.mock('../../utils/propertyReportApi', () => ({
  reportProperty: jest.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  saveUserProfile(
    { id: 'mongo-user-id', email: 'home@example.com' },
    { fullName: 'Home User' },
    'tenant',
    'signed-token',
  );
});

test('opens the report options and submits a selected reason', async () => {
  reportProperty.mockResolvedValue({ id: 'report-id' });
  render(<ReportListingButton propertyId="property-id" propertyTitle="Sunny home" />);

  fireEvent.click(screen.getByRole('button', { name: 'More options for Sunny home' }));
  fireEvent.click(screen.getByRole('button', { name: 'Report listing' }));
  fireEvent.change(screen.getByLabelText('Why are you reporting this?'), { target: { value: 'scam' } });
  fireEvent.change(screen.getByLabelText(/Additional details/i), { target: { value: 'Rent request seems suspicious.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));

  await waitFor(() => {
    expect(reportProperty).toHaveBeenCalledWith('property-id', {
      category: 'scam',
      details: 'Rent request seems suspicious.',
    });
  });
  expect(await screen.findByText('Thank you. Your report has been sent for review.')).toBeInTheDocument();
});

test('prompts signed-out users to log in before reporting', () => {
  localStorage.clear();
  const onSignInRequired = jest.fn();
  render(
    <ReportListingButton
      propertyId="property-id"
      propertyTitle="Sunny home"
      onSignInRequired={onSignInRequired}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'More options for Sunny home' }));
  fireEvent.click(screen.getByRole('button', { name: 'Report listing' }));

  expect(onSignInRequired).toHaveBeenCalledTimes(1);
  expect(reportProperty).not.toHaveBeenCalled();
});
