import { WrapperProps } from "xpine/dist/types";
import Base from "../components/Base";
import Navbar from "../components/Navbar";
import { NavbarContext } from "../context";

export default {
  wrapper({ req, children, data }: WrapperProps) {
    return (
      <Base
        title={data?.title || 'Default title'}
        description={data?.description}
        req={req}
      >
        <NavbarContext>
          <>
            <div data-testid="base-config"></div>
            {children}
          </>
        </NavbarContext>
        <Navbar />
      </Base>
    )
  },
}