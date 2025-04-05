import { WrapperProps } from 'xpine/dist/types';
import Base from '../components/Base';

export const config = {
  wrapper({ req, children, data }: WrapperProps) {
    return (
      <Base
        title={data?.title || 'My awesome website'}
        description={data?.description}
        req={req}
      >
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