import { WrapperProps } from "xpine/dist/types";
import Base from "../components/Base";

export default {
  wrapper({ req, children, data }: WrapperProps) {
    return (
      <Base
        title={data?.title || 'Default title'}
        description={data?.description}
        req={req}
      >
        <div data-testid="base-config"></div>
          {children}
      </Base>
    )
  }
}