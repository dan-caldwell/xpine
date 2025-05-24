import { PageProps } from "../../../../../../dist/types";

export const config = {
  staticPaths() {
    return [
      {
        dynamic: '123',
        0: '456/789',
      }
    ]
  },
}

export default function Page({ req }: PageProps) {
  return (
    <div>
      <div>Catch all route page (static)</div>
      <div data-testid="catch-all-route-page">{req.params.dynamic}/{req.params[0]}</div>
    </div>
  )
}
