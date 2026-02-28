import { Alert, Linking, Platform } from 'react-native';
import { openARViewer, getARModelAssets, buildSceneViewerUrl } from '../openARViewer';
import { getModel3DForProduct, MODEL_CDN_BASE } from '@/data/models3d';

jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true));
jest.spyOn(Linking, 'canOpenURL').mockImplementation(() => Promise.resolve(true));
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getARModelAssets', () => {
  it('returns URLs from models3d catalog for known products', () => {
    const asset = getModel3DForProduct('prod-asheville-full')!;
    const assets = getARModelAssets('asheville-full');
    expect(assets.usdzUrl).toBe(asset.usdzUrl);
    expect(assets.glbUrl).toBe(asset.glbUrl);
  });

  it('returns URLs for murphy bed products', () => {
    const asset = getModel3DForProduct('prod-murphy-queen-vertical')!;
    const assets = getARModelAssets('murphy-queen-vertical');
    expect(assets.usdzUrl).toBe(asset.usdzUrl);
    expect(assets.glbUrl).toBe(asset.glbUrl);
  });

  it('falls back to CDN convention for unknown models', () => {
    const assets = getARModelAssets('unknown-product');
    expect(assets.usdzUrl).toBe(`${MODEL_CDN_BASE}/usdz/unknown-product.usdz`);
    expect(assets.glbUrl).toBe(`${MODEL_CDN_BASE}/glb/unknown-product.glb`);
  });
});

describe('buildSceneViewerUrl', () => {
  it('builds a Scene Viewer URL with file and mode params', () => {
    const glbUrl = `${MODEL_CDN_BASE}/glb/asheville-full-a1b2c3.glb`;
    const url = buildSceneViewerUrl(glbUrl, 'The Asheville');
    expect(url).toContain('arvr.google.com/scene-viewer/1.0');
    expect(url).toContain('file=');
    expect(url).toContain('mode=ar_preferred');
    expect(url).toContain('title=The+Asheville');
  });
});

describe('openARViewer', () => {
  describe('iOS', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('opens USDZ URL via Linking on iOS', async () => {
      const asset = getModel3DForProduct('prod-asheville-full')!;
      await openARViewer('asheville-full', 'The Asheville');
      expect(Linking.canOpenURL).toHaveBeenCalledWith(asset.usdzUrl);
      expect(Linking.openURL).toHaveBeenCalledWith(asset.usdzUrl);
    });

    it('shows alert when iOS device cannot open AR', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);
      await openARViewer('asheville-full', 'The Asheville');
      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'AR Not Available',
        expect.stringContaining('iOS 12'),
      );
    });
  });

  describe('Android', () => {
    beforeEach(() => {
      (Platform as any).OS = 'android';
    });

    it('opens Scene Viewer intent URL on Android', async () => {
      await openARViewer('asheville-full', 'The Asheville');
      expect(Linking.openURL).toHaveBeenCalledTimes(1);
      const url = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('intent://arvr.google.com/scene-viewer');
      expect(url).toContain('asheville-full');
      expect(url).toContain('.glb');
      expect(url).toContain('ar_preferred');
      expect(url).toContain('The%20Asheville');
    });

    it('falls back to web Scene Viewer when intent fails', async () => {
      (Linking.openURL as jest.Mock)
        .mockRejectedValueOnce(new Error('Intent not supported'))
        .mockResolvedValueOnce(true);
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(true);

      await openARViewer('asheville-full', 'The Asheville');
      expect(Linking.openURL).toHaveBeenCalledTimes(2);
      const fallbackUrl = (Linking.openURL as jest.Mock).mock.calls[1][0] as string;
      expect(fallbackUrl).toContain('https://arvr.google.com/scene-viewer');
    });

    it('shows alert when Android has no AR support', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);

      await openARViewer('asheville-full', 'The Asheville');
      expect(Alert.alert).toHaveBeenCalledWith(
        'AR Not Available',
        expect.stringContaining('Google Play Services'),
      );
    });
  });

  describe('Web / unsupported', () => {
    it('shows alert on web platform', async () => {
      (Platform as any).OS = 'web';
      await openARViewer('asheville-full', 'The Asheville');
      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'AR Not Available',
        expect.stringContaining('mobile devices'),
      );
    });
  });
});
