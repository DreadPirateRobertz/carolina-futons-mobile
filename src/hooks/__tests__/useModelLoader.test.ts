import { renderHook, act } from '@testing-library/react-native';
import { useModelLoader } from '../useModelLoader';

const mockLoadModelForProduct = jest.fn();
const mockPrefetchModel = jest.fn();

jest.mock('@/services/modelLoader', () => ({
  loadModelForProduct: (...args: any[]) => mockLoadModelForProduct(...args),
  prefetchModel: (...args: any[]) => mockPrefetchModel(...args),
}));

describe('useModelLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useModelLoader());
    expect(result.current.status).toEqual({ state: 'idle' });
  });

  it('transitions through states during load', async () => {
    const states: any[] = [];
    mockLoadModelForProduct.mockImplementation(async (_id: string, onProgress: any) => {
      onProgress({ state: 'checking-cache' });
      onProgress({ state: 'downloading', progress: 0.5 });
      onProgress({ state: 'ready', localUri: '/cache/model.glb' });
      return '/cache/model.glb';
    });

    const { result } = renderHook(() => useModelLoader());

    await act(async () => {
      const uri = await result.current.load('prod-asheville-full' as any);
      expect(uri).toBe('/cache/model.glb');
    });

    expect(mockLoadModelForProduct).toHaveBeenCalledWith(
      'prod-asheville-full',
      expect.any(Function),
    );
  });

  it('resets to idle', async () => {
    mockLoadModelForProduct.mockResolvedValue('/cache/model.glb');

    const { result } = renderHook(() => useModelLoader());

    await act(async () => {
      await result.current.load('prod-asheville-full' as any);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toEqual({ state: 'idle' });
  });

  it('exposes prefetch function', () => {
    const { result } = renderHook(() => useModelLoader());
    expect(typeof result.current.prefetch).toBe('function');
  });

  it('handles null return from loadModelForProduct', async () => {
    mockLoadModelForProduct.mockImplementation(async (_id: string, onProgress: any) => {
      onProgress({ state: 'error', message: 'No AR model available' });
      return null;
    });

    const { result } = renderHook(() => useModelLoader());

    await act(async () => {
      const uri = await result.current.load('nonexistent' as any);
      expect(uri).toBeNull();
    });
  });
});
