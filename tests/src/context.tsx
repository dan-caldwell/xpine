import { createContext } from 'xpine';

export function NavbarContext() {
  const navbar = createContext([]);
  return {
    navbar,
  }
}