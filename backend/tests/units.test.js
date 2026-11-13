const { nextStreak, effectiveStreak } = require('../utils/streak');
const { avatarError } = require('../utils/validators');
const { errorHandler } = require('../middleware/errorMiddleware');
const { renderEmail } = require('../services/emailTemplates');
const escapeHtml = require('../utils/escapeHtml');

describe('streak utils', () => {
  const now = new Date('2026-05-10T12:00:00Z');
  it('nextStreak', () => {
    expect(nextStreak(null, 0, now)).toBe(1);
    expect(nextStreak(new Date('2026-05-10T00:00:01Z'), 0, now)).toBe(1);
    expect(nextStreak(new Date('2026-05-10T00:00:01Z'), 3, now)).toBe(3);
    expect(nextStreak(new Date('2026-05-09T23:59:59Z'), 3, now)).toBe(4);
    expect(nextStreak(new Date('2026-05-08T23:59:59Z'), 3, now)).toBe(1);
  });
  it('effectiveStreak', () => {
    expect(effectiveStreak(null, 5, now)).toBe(0);
    expect(effectiveStreak(new Date('2026-05-09T01:00:00Z'), 5, now)).toBe(5);
    expect(effectiveStreak(new Date('2026-05-08T01:00:00Z'), 5, now)).toBe(0);
    expect(effectiveStreak(new Date('2026-05-10T01:00:00Z'), undefined, now)).toBe(0);
  });
});

describe('avatarError', () => {
  it('validates', () => {
    expect(avatarError('')).toBeNull();
    expect(avatarError('https://a.example/x.png')).toBeNull();
    expect(avatarError('data:image/jpeg;base64,QUJD')).toBeNull();
    expect(avatarError('data:image/jpeg;base64,QQ==')).toBeNull();
    expect(avatarError('not a url')).toMatch(/https URL/);
    expect(avatarError(`https://a.example/${'x'.repeat(2050)}`)).toMatch(/too long/);
  });
});

describe('errorHandler', () => {
  const run = (err, headersSent = false) => {
    const res = { headersSent, status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    errorHandler(err, {}, res, next);
    return { res, next };
  };
  it('maps known errors', () => {
    expect(run({ type: 'entity.too.large' }).res.status).toHaveBeenCalledWith(413);
    expect(run({ name: 'CastError', path: 'x' }).res.status).toHaveBeenCalledWith(400);
    expect(run({ name: 'ValidationError', errors: {} }).res.json).toHaveBeenCalledWith({ message: 'Invalid data' });
    expect(run({ code: 11000 }).res.status).toHaveBeenCalledWith(409);
    expect(run({ status: 418, message: 'teapot' }).res.json).toHaveBeenCalledWith({ message: 'teapot' });
    expect(run(new Error('x')).res.status).toHaveBeenCalledWith(500);
    expect(run(new Error('x'), true).next).toHaveBeenCalled();
  });
});

describe('email templates', () => {
  it('escapes user content', () => {
    const html = renderEmail({ heading: '<h>', paragraphs: ['<script>'], quote: '"q"', attribution: 'a&b', footer: 'f' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a&amp;b');
    expect(renderEmail({ heading: 'x' })).toContain('x');
    expect(escapeHtml(null)).toBe('');
  });
});
