import { createContext } from 'xpine';

type NavbarContextProps = {
  children?: any;
}

export function NavbarContext({ children }: NavbarContextProps) {
  return children;
}

NavbarContext.context = createContext([]);