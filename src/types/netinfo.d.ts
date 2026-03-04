declare module '@react-native-community/netinfo' {
  interface NetInfoState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
  }

  type NetInfoChangeHandler = (state: NetInfoState) => void;

  interface NetInfo {
    addEventListener(listener: NetInfoChangeHandler): () => void;
    fetch(requestedInterface?: string): Promise<NetInfoState>;
  }

  const netInfo: NetInfo;
  export default netInfo;
}
