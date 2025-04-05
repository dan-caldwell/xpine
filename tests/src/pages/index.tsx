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
  wrapper({ req, children, data }: WrapperProps) {
    return (
      <Base
        title={data?.title || 'My awesome website'}
        description={data?.description}
        req={req}
      >
        <Navbar />
        <div data-testid="home-page-wrapper"></div>
          {children}
      </Base>
    )
  }
}

export default function Home() {
  return (
    <div data-testid="hello-world">Hello world</div>
  );
}