import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useNetworkErrorRecovery } from '../useNetworkErrorRecovery';
import { ConnectivityProvider } from '@/hooks/useConnectivity';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConnectivityProvider initialOnline={true} skipNetInfo>
      {children}
    </ConnectivityProvider>
  );
}

function offlineWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConnectivityProvider initialOnline={false} skipNetInfo>
      {children}
    </ConnectivityProvider>
  );
}

describe('useNetworkErrorRecovery', () => {
  it('returns initial state', () => {
    const fetcher = jest.fn().mockResolvedValue({ data: 'ok' });
    const { result } = renderHook(() => useNetworkErrorRecovery(fetcher), { wrapper });
    expect(result.current.error).toBeNull();
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.isStale).toBe(false);
  });

  it('execute calls fetcher and returns data', async () => {
    const fetcher = jest.fn().mockResolvedValue({ items: [1, 2, 3] });
    const { result } = renderHook(() => useNetworkErrorRecovery(fetcher), { wrapper });

    let data: unknown;
    await act(async () => {
      data = await result.current.execute();
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(data).toEqual({ items: [1, 2, 3] });
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('Network request failed'));
    const { result } = renderHook(() => useNetworkErrorRecovery(fetcher), { wrapper });

    await act(async () => {
      await result.current.execute().catch(() => {});
    });

    expect(result.current.error).toBe('Network request failed');
  });

  it('retry calls fetcher again and clears error on success', async () => {
    const fetcher = jest.fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce({ data: 'recovered' });

    const { result } = renderHook(() => useNetworkErrorRecovery(fetcher), { wrapper });

    await act(async () => {
      await result.current.execute().catch(() => {});
    });
    expect(result.current.error).toBe('Failed');

    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.error).toBeNull();
  });

  it('sets isRetrying during retry', async () => {
    let resolve: (v: unknown) => void;
    const fetcher = jest.fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockImplementationOnce(() => new Promise((r) => { resolve = r; }));

    const { result } = renderHook(() => useNetworkErrorRecovery(fetcher), { wrapper });

    await act(async () => {
      await result.current.execute().catch(() => {});
    });

    let retryPromise: Promise<unknown>;
    act(() => {
      retryPromise = result.current.retry();
    });
    expect(result.current.isRetrying).toBe(true);

    await act(async () => {
      resolve!({ data: 'ok' });
      await retryPromise!;
    });
    expect(result.current.isRetrying).toBe(false);
  });

  it('clearError resets error state', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('Oops'));
    const { result } = renderHook(() => useNetworkErrorRecovery(fetcher), { wrapper });

    await act(async () => {
      await result.current.execute().catch(() => {});
    });
    expect(result.current.error).toBe('Oops');

    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });

  it('marks data as stale when offline', () => {
    const fetcher = jest.fn().mockResolvedValue({});
    const { result } = renderHook(() => useNetworkErrorRecovery(fetcher), {
      wrapper: offlineWrapper,
    });
    expect(result.current.isStale).toBe(true);
  });

  it('marks data as not stale when online', () => {
    const fetcher = jest.fn().mockResolvedValue({});
    const { result } = renderHook(() => useNetworkErrorRecovery(fetcher), { wrapper });
    expect(result.current.isStale).toBe(false);
  });

  it('uses fallback error message for non-Error throws', async () => {
    const fetcher = jest.fn().mockRejectedValue('string error');
    const { result } = renderHook(() => useNetworkErrorRecovery(fetcher), { wrapper });

    await act(async () => {
      await result.current.execute().catch(() => {});
    });

    expect(result.current.error).toBe('Something went wrong. Please try again.');
  });
});
