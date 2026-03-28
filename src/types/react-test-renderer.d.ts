declare module 'react-test-renderer' {
  interface ReactTestRendererJSON {
    type: string;
    props: { [propName: string]: unknown };
    children: ReactTestRendererJSON[] | null;
  }
}
