import { WrapperProps } from 'xpine/dist/types';
import Base from '../components/Base';
import Navbar from '../components/Navbar';

export const config = {
  data() {
    return {
      title: 'Home page',
      description: 'The description',
    }
  },
  wrapper({ req, children, data, path }: WrapperProps) {
    return (
      <Base
        title={data?.title || 'My awesome website'}
        description={data?.description}
        req={req}
      >
        <Navbar>
          <h1>Home page</h1>
        </Navbar>
        <div data-testid="home-page-wrapper"></div>
        {children}
        <h1 data-path={path} data-testid="url-path">Path: {path}</h1>
      </Base>
    )
  },
}

export default function Home({ config }) {
  return (
    <div data-testid="hello-world">Hello world</div>
  );
}