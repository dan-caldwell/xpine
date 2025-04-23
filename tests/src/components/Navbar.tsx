import { context } from 'xpine';

type NavbarProps = {
  children?: any;
  routePath: string;
}

export default async function Navbar({ children, routePath }: NavbarProps) {
  const now = Date.now();
  const navbar = context.get('navbar');
  return (
    <div 
      data-testid="navbar" 
      data-persistent="navbar" 
      style="display: flex; flex-direction: column;" 
      x-data="NavbarData"
      data-initial-active-page={routePath}
      {...{
        'x-on:spa-update-page-content.window': 'handlePageUpdate'
      }}
    >
      <div data-testid="active-page-switch" data-active-page={routePath} x-bind:data-active-page="activePage" x-text="`Active page: ${activePage}`"></div>
      <div>
        {navbar.map((item, index) => {
          return <div data-testid={`navbar-context-${item}`} data-index={index}>{item}</div>
        })}
      </div>
      <div data-testid="navbar-now" data-now={now}>Now: {now}</div>
      <a href="/page-sending-context?random-param1=1&random-param2=2" data-spa="true" data-testid="page-sending-context">Page sending context</a>
      <a href="/" data-spa="true" data-testid="navbar-home"><span>Home page</span></a>
      <a href="/boolean-static-path" data-spa="true" data-testid="navbar-boolean-static-path"><span>Boolean static path</span></a>
      <a href="/base-static-path" data-spa="true" data-testid="navbar-base-static-path"><span>Base static path</span></a>
      <a href="/base-static-path/non-static-path" data-testid="navbar-non-static-path-non-spa"><span>Non static path - no spa</span></a>
      <a href="/with-same-dir-wrapper" data-spa="true" data-testid="navbar-with-same-dir-wrapper"><span>With same dir wrapper</span></a>
      <a href="/my-path-a/my-path-b/1" data-spa="true" data-testid="navbar-path-c"><span>path c</span></a>
      <a href="/my-path-a2/my-path-b2/my-path-c2/2" data-spa="true" data-testid="navbar-path-d"><span>path d</span></a>
      <div style="max-width: 50px; max-height: 50px;"><img src="/images/simplified-giraffe.svg" /></div>
      <div style="max-width: 50px; max-height: 50px;"><img width="50" height="50" src="/images/8-cell-simple.gif" /></div>
      {children}
    </div>
  );
}

<script />

export function NavbarData() {
  return {
    activePage: this.$root.dataset.initialActivePage,
    handlePageUpdate(e) {
      this.activePage = e.detail.url?.pathname;
    }
  }
}
