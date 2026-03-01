import { createMultiProvider } from '../providers/multiProvider';
import type { AnalyticsProvider } from '../analytics';

function createMockProvider(): AnalyticsProvider {
  return {
    trackEvent: jest.fn(),
    trackScreenView: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    setEnabled: jest.fn(),
  };
}

describe('multiProvider', () => {
  it('fans out trackEvent to all providers', () => {
    const p1 = createMockProvider();
    const p2 = createMockProvider();
    const multi = createMultiProvider([p1, p2]);

    multi.trackEvent('add_to_cart', { product_id: 'abc' });

    expect(p1.trackEvent).toHaveBeenCalledWith('add_to_cart', { product_id: 'abc' });
    expect(p2.trackEvent).toHaveBeenCalledWith('add_to_cart', { product_id: 'abc' });
  });

  it('fans out trackScreenView to all providers', () => {
    const p1 = createMockProvider();
    const p2 = createMockProvider();
    const multi = createMultiProvider([p1, p2]);

    multi.trackScreenView('Home', { tab: 'featured' });

    expect(p1.trackScreenView).toHaveBeenCalledWith('Home', { tab: 'featured' });
    expect(p2.trackScreenView).toHaveBeenCalledWith('Home', { tab: 'featured' });
  });

  it('fans out identify to all providers', () => {
    const p1 = createMockProvider();
    const p2 = createMockProvider();
    const multi = createMultiProvider([p1, p2]);

    multi.identify('user-1', { email: 'test@test.com' });

    expect(p1.identify).toHaveBeenCalledWith('user-1', { email: 'test@test.com' });
    expect(p2.identify).toHaveBeenCalledWith('user-1', { email: 'test@test.com' });
  });

  it('fans out reset to all providers', () => {
    const p1 = createMockProvider();
    const p2 = createMockProvider();
    const multi = createMultiProvider([p1, p2]);

    multi.reset();

    expect(p1.reset).toHaveBeenCalled();
    expect(p2.reset).toHaveBeenCalled();
  });

  it('fans out setEnabled to all providers', () => {
    const p1 = createMockProvider();
    const p2 = createMockProvider();
    const multi = createMultiProvider([p1, p2]);

    multi.setEnabled(false);

    expect(p1.setEnabled).toHaveBeenCalledWith(false);
    expect(p2.setEnabled).toHaveBeenCalledWith(false);
  });

  it('continues to other providers when one throws', () => {
    const p1 = createMockProvider();
    const p2 = createMockProvider();
    (p1.trackEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Provider 1 failed');
    });
    const multi = createMultiProvider([p1, p2]);

    multi.trackEvent('search', { query: 'futon' });

    expect(p1.trackEvent).toHaveBeenCalled();
    expect(p2.trackEvent).toHaveBeenCalledWith('search', { query: 'futon' });
  });
});
