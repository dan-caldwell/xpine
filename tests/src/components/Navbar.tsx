export default function Navbar() {
  return (
    <div data-testid="navbar" data-persistent="navbar" style="display: flex; flex-direction: column;">
      <a href="/" data-spa="true" data-testid="navbar-home"><span>Home page</span></a>
      <a href="/boolean-static-path" data-spa="true" data-testid="navbar-boolean-static-path"><span>Boolean static path</span></a>
      <a href="/base-static-path" data-spa="true" data-testid="navbar-base-static-path"><span>Base static path</span></a>
      <a href="/base-static-path/non-static-path" data-spa="true" data-testid="navbar-non-static-path"><span>Non static path</span></a>
      <a href="/with-same-dir-wrapper" data-spa="true" data-testid="navbar-with-same-dir-wrapper"><span>With same dir wrapper</span></a>
      <a href="/my-path-a/my-path-b/1" data-spa="true" data-testid="navbar-path-c"><span>path c</span></a>
      <a href="/my-path-a2/my-path-b2/my-path-c2/2" data-spa="true" data-testid="navbar-path-d"><span>path d</span></a>
    </div>
  );
}
