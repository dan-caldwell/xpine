import { WrapperProps } from "../../../../dist/types"
import Base from "../../components/Base"
import Navbar from "../../components/Navbar"

export default {
  wrapper({ req, children, data, routePath }: WrapperProps) {
    return (
      <Base
        title={data?.title || 'Default title'}
        description={data?.description}
        req={req}
        bundleID="secret-page"
      >
        <Navbar routePath={routePath} />
        <div data-testid="base-config"></div>
        {children}
        <h1 data-path={routePath} data-testid="url-path">Path: {routePath}</h1>
      </Base>
    )
  },
}