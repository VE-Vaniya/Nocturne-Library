// Exercises the real email service with nodemailer mocked.
jest.unmock('../services/emailService');

const mockSendMail = jest.fn();
const mockVerify = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail, verify: mockVerify })),
}));

const loadService = (env) => {
  jest.resetModules();
  const saved = { ...process.env };
  Object.assign(process.env, env);
  let mod;
  jest.isolateModules(() => {
    mod = jest.requireActual('../services/emailService');
  });
  process.env = saved;
  return mod;
};

describe('emailService', () => {
  const OLD = process.env.EMAIL_USER;
  afterEach(() => {
    process.env.EMAIL_USER = OLD || '';
  });

  it('is a no-op when email is not configured', async () => {
    process.env.EMAIL_USER = '';
    const { sendNotificationEmail } = loadService({});
    const result = await sendNotificationEmail('a@example.com', 's', 't', '<p>h</p>');
    expect(result.success).toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('sends and reports failures without throwing', async () => {
    const { sendNotificationEmail } = loadService({});
    process.env.EMAIL_USER = 'sender@example.com';
    mockSendMail.mockResolvedValueOnce({ messageId: 'id-1' });
    await expect(sendNotificationEmail('a@example.com', 's', 't', 'h')).resolves.toEqual({
      success: true,
      messageId: 'id-1',
    });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@example.com', subject: 's' }),
    );

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSendMail.mockRejectedValueOnce(new Error('smtp down'));
    await expect(sendNotificationEmail('a@example.com', 's', 't', 'h')).resolves.toEqual({
      success: false,
      error: 'smtp down',
    });
    spy.mockRestore();
  });

  it('verifies SMTP at startup outside tests', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockVerify.mockImplementation((cb) => cb(null));
    loadService({ NODE_ENV: 'production', EMAIL_USER: 'sender@example.com' });
    mockVerify.mockImplementation((cb) => cb(new Error('bad auth')));
    loadService({ NODE_ENV: 'production', EMAIL_USER: 'sender@example.com' });
    expect(mockVerify).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
    log.mockRestore();
    err.mockRestore();
  });
});
