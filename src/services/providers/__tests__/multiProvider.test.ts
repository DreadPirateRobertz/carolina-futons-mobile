import type { AnalyticsProvider } from '../../analytics';
import { MultiProvider } from '../multiProvider';

function createMockProvider(): jest.Mocked<AnalyticsProvider> {
  return {
    trackEvent: jest.fn(),
    trackScreenView: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    setEnabled: jest.fn(),
  };
}

describe('MultiProvider', () => {
  let providerA: jest.Mocked<AnalyticsProvider>;
  let providerB: jest.Mocked<AnalyticsProvider>;
  let multi: MultiProvider;

  beforeEach(() => {
    providerA = createMockProvider();
    providerB = createMockProvider();
    multi = new MultiProvider([providerA, providerB]);
  });

  it('fans out trackEvent to all providers', () => {
    multi.trackEvent('add_to_cart', { product_id: 'abc' });
    expect(providerA.trackEvent).toHaveBeenCalledWith('add_to_cart', { product_id: 'abc' });
    expect(providerB.trackEvent).toHaveBeenCalledWith('add_to_cart', { product_id: 'abc' });
  });

  it('fans out trackScreenView to all providers', () => {
    multi.trackScreenView('Home', { tab: 'shop' });
    expect(providerA.trackScreenView).toHaveBeenCalledWith('Home', { tab: 'shop' });
    expect(providerB.trackScreenView).toHaveBeenCalledWith('Home', { tab: 'shop' });
  });

  it('fans out identify to all providers', () => {
    multi.identify('user-123', { email: 'test@example.com' });
    expect(providerA.identify).toHaveBeenCalledWith('user-123', { email: 'test@example.com' });
    expect(providerB.identify).toHaveBeenCalledWith('user-123', { email: 'test@example.com' });
  });

  it('fans out reset to all providers', () => {
    multi.reset();
    expect(providerA.reset).toHaveBeenCalled();
    expect(providerB.reset).toHaveBeenCalled();
  });

  it('fans out setEnabled to all providers', () => {
    multi.setEnabled(false);
    expect(providerA.setEnabled).toHaveBeenCalledWith(false);
    expect(providerB.setEnabled).toHaveBeenCalledWith(false);
  });

  it('continues if one provider throws on trackEvent', () => {
    providerA.trackEvent.mockImplementation(() => {
      throw new Error('boom');
    });
    multi.trackEvent('search');
    expect(providerB.trackEvent).toHaveBeenCalledWith('search', undefined);
  });

  it('continues if one provider throws on identify', () => {
    providerA.identify.mockImplementation(() => {
      throw new Error('boom');
    });
    multi.identify('user-1');
    expect(providerB.identify).toHaveBeenCalledWith('user-1', undefined);
  });

  it('continues if one provider throws on reset', () => {
    providerA.reset.mockImplementation(() => {
      throw new Error('boom');
    });
    multi.reset();
    expect(providerB.reset).toHaveBeenCalled();
  });
});
