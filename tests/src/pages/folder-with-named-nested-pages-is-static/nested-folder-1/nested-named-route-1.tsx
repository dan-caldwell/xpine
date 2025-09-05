export default function MyNestedFolderPage({ routePath }) {
  return (
    <div>
      <div>My nested folder page</div>
      <div data-testid="nested-route-path">{routePath}</div>
    </div>
  )
}