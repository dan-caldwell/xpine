import { WrapperProps } from "xpine/dist/types";
import Base from "../components/Base";
import Navbar from "../components/Navbar";

export default {
  wrapper({ req, children, data }: WrapperProps) {
    return (
      <Base
        title={data?.title || 'Default title'}
        description={data?.description}
        req={req}
      >
        <Navbar />
        <div data-testid="base-config"></div>
          {children}
      </Base>
    )
  }
}