export default function MyNestedFolderPage({ data }) {
  return (
    <div>
      <div>My nested folder page</div>
      <div data-testid="nested-route-path">{data.routePath}</div>
    </div>
  )
}