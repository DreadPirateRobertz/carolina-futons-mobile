/**
 * TDD tests for npsSurvey service — cm-5cp.
 *
 * Tests: submit success, omit/include comment, network error,
 * null/undefined client, score boundary values (0 and 10),
 * NPSResponses collection, createdAt + suppressedUntil in Wix payload.
 */
import { submitNpsSurvey, type NpsSurveyData, type WixClientLike } from '../npsSurvey';

const makeClient = (overrides?: Partial<WixClientLike>): WixClientLike => ({
  insertDataItem: jest.fn().mockResolvedValue({ id: 'survey-abc123', data: {} }),
  ...overrides,
});

const CREATED_AT = '2026-04-04T12:00:00.000Z';
const SUPPRESSED_UNTIL = '2026-07-03T12:00:00.000Z'; // 90 days later

const baseData: NpsSurveyData = {
  orderId: 'order-001',
  score: 9,
  createdAt: CREATED_AT,
  suppressedUntil: SUPPRESSED_UNTIL,
};

afterEach(() => jest.clearAllMocks());

describe('submitNpsSurvey', () => {
  describe('success cases', () => {
    it('returns success=true with id when insert succeeds', async () => {
      const client = makeClient();
      const result = await submitNpsSurvey(client, baseData);
      expect(result.success).toBe(true);
      expect(result.id).toBe('survey-abc123');
    });

    it('inserts to NPSResponses collection', async () => {
      const client = makeClient();
      await submitNpsSurvey(client, baseData);
      expect(client.insertDataItem).toHaveBeenCalledWith(
        'NPSResponses',
        expect.objectContaining({ orderId: 'order-001', score: 9 }),
      );
    });

    it('passes createdAt through to the Wix payload', async () => {
      const client = makeClient();
      await submitNpsSurvey(client, baseData);
      const [, payload] = (client.insertDataItem as jest.Mock).mock.calls[0];
      expect(payload.createdAt).toBe(CREATED_AT);
    });

    it('passes suppressedUntil through to the Wix payload', async () => {
      const client = makeClient();
      await submitNpsSurvey(client, baseData);
      const [, payload] = (client.insertDataItem as jest.Mock).mock.calls[0];
      expect(payload.suppressedUntil).toBe(SUPPRESSED_UNTIL);
    });

    it('omits comment field when not provided', async () => {
      const client = makeClient();
      await submitNpsSurvey(client, baseData);
      const [, payload] = (client.insertDataItem as jest.Mock).mock.calls[0];
      expect('comment' in payload).toBe(false);
    });

    it('includes comment when provided', async () => {
      const client = makeClient();
      await submitNpsSurvey(client, { ...baseData, comment: 'Great quality!' });
      const [, payload] = (client.insertDataItem as jest.Mock).mock.calls[0];
      expect(payload.comment).toBe('Great quality!');
    });

    it('includes memberId when provided', async () => {
      const client = makeClient();
      await submitNpsSurvey(client, { ...baseData, memberId: 'member-007' });
      const [, payload] = (client.insertDataItem as jest.Mock).mock.calls[0];
      expect(payload.memberId).toBe('member-007');
    });

    it('omits memberId when not provided', async () => {
      const client = makeClient();
      await submitNpsSurvey(client, baseData);
      const [, payload] = (client.insertDataItem as jest.Mock).mock.calls[0];
      expect('memberId' in payload).toBe(false);
    });
  });

  describe('score boundary values', () => {
    it('accepts score 0 (minimum detractor)', async () => {
      const client = makeClient();
      const result = await submitNpsSurvey(client, { ...baseData, score: 0 });
      expect(result.success).toBe(true);
      const [, payload] = (client.insertDataItem as jest.Mock).mock.calls[0];
      expect(payload.score).toBe(0);
    });

    it('accepts score 10 (maximum promoter)', async () => {
      const client = makeClient();
      const result = await submitNpsSurvey(client, { ...baseData, score: 10 });
      expect(result.success).toBe(true);
      const [, payload] = (client.insertDataItem as jest.Mock).mock.calls[0];
      expect(payload.score).toBe(10);
    });
  });

  describe('error cases', () => {
    it('returns success=false with error when insertDataItem throws', async () => {
      const client = makeClient({
        insertDataItem: jest.fn().mockRejectedValue(new Error('Network error')),
      });
      const result = await submitNpsSurvey(client, baseData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('returns success=false when client is null', async () => {
      const result = await submitNpsSurvey(null, baseData);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/unavailable/i);
    });

    it('returns success=false when client is undefined', async () => {
      const result = await submitNpsSurvey(undefined, baseData);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/unavailable/i);
    });

    it('never throws — always returns a result object', async () => {
      const client = makeClient({
        insertDataItem: jest.fn().mockRejectedValue('raw string error'),
      });
      await expect(submitNpsSurvey(client, baseData)).resolves.toMatchObject({
        success: false,
      });
    });
  });
});
