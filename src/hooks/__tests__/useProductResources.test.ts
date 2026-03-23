/**
 * @module useProductResources.test
 *
 * Tests for useProductResources hook — fetches product resources
 * (spec sheets, care guides, videos, etc.) from getProductResources webMethod.
 *
 * cm-z4amm
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useProductResources } from '../useProductResources';

const mockCallFunction = jest.fn();
let mockWixClient: { callFunction: jest.Mock } | null = { callFunction: mockCallFunction };

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockWixClient,
}));

const MOCK_RESOURCES = {
  resources: [
    {
      productId: 'prod-asheville',
      resourceType: 'SPEC_SHEET',
      label: 'Asheville Specifications',
      url: 'https://static.wixstatic.com/media/specs/asheville.pdf',
      sortOrder: 1,
    },
    {
      productId: 'prod-asheville',
      resourceType: 'CARE_GUIDE',
      label: 'Care Instructions',
      url: 'https://static.wixstatic.com/media/care/futon-care.pdf',
      sortOrder: 2,
    },
    {
      productId: 'prod-asheville',
      resourceType: 'VIDEO',
      label: 'Assembly Video',
      url: 'https://www.youtube.com/watch?v=abc123',
      sortOrder: 3,
    },
  ],
};

describe('useProductResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWixClient = { callFunction: mockCallFunction };
    mockCallFunction.mockResolvedValue(MOCK_RESOURCES);
  });

  it('returns loading=true initially', () => {
    const { result } = renderHook(() => useProductResources('prod-asheville'));
    expect(result.current.loading).toBe(true);
  });

  it('fetches resources and returns them sorted by sortOrder', async () => {
    const { result } = renderHook(() => useProductResources('prod-asheville'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.resources).toHaveLength(3);
    expect(result.current.resources[0].resourceType).toBe('SPEC_SHEET');
    expect(result.current.resources[1].resourceType).toBe('CARE_GUIDE');
    expect(result.current.resources[2].resourceType).toBe('VIDEO');
  });

  it('calls API with correct path and productId', async () => {
    const { result } = renderHook(() => useProductResources('prod-asheville'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockCallFunction).toHaveBeenCalledWith('/_functions/getProductResources', 'POST', {
      productId: 'prod-asheville',
    });
  });

  it('returns empty array when API returns no resources', async () => {
    mockCallFunction.mockResolvedValue({ resources: [] });
    const { result } = renderHook(() => useProductResources('prod-asheville'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.resources).toEqual([]);
  });

  it('returns empty array and error on API failure', async () => {
    mockCallFunction.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useProductResources('prod-asheville'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.resources).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

  it('returns empty array when wix client is null', async () => {
    mockWixClient = null;
    const { result } = renderHook(() => useProductResources('prod-asheville'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.resources).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when productId is empty', async () => {
    const { result } = renderHook(() => useProductResources(''));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockCallFunction).not.toHaveBeenCalled();
    expect(result.current.resources).toEqual([]);
  });

  it('handles malformed API response gracefully', async () => {
    mockCallFunction.mockResolvedValue({ resources: null });
    const { result } = renderHook(() => useProductResources('prod-asheville'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.resources).toEqual([]);
  });

  it('maps resource icon based on resourceType', async () => {
    const { result } = renderHook(() => useProductResources('prod-asheville'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.resources[0].icon).toBeDefined();
    expect(result.current.resources[2].icon).toBeDefined(); // VIDEO
  });
});
