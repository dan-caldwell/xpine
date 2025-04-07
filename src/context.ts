export type State<StateProps> = {
  get: () => StateProps;
  set: (value: StateProps) => void;
}

export function createContext<Type>(value: Type) {
  let stateValue: Type = value;
  return {
    get(): Type {
      return stateValue;
    },
    set(callback: (currentContext: Type) => Type): void {
      stateValue = callback(stateValue);
    },
  }
}
