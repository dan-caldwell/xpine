import { WrapperProps } from "xpine/dist/types";
import Base from "../components/Base";
import Navbar from "../components/Navbar";

export default {
  wrapper({ req, children, data, path }: WrapperProps) {
    return (
      <Base
        title={data?.title || 'Default title'}
        description={data?.description}
        req={req}
      >
        <Navbar />
        <div data-testid="base-config"></div>
        {children}
        <h1 data-path={path} data-testid="url-path">Path: {path}</h1>
      </Base>
    )
  },
}