export type SetContext<Type> = (currentContext: Type) => Type;

export type State<StateProps> = {
  get: (id: string) => StateProps;
  set: (id: string, callback: SetContext<StateProps>, defaultValue?: any) => void;
  clear: () => void;
  getAll: () => any;
}

type ContextType<Type> = {
  [key: string]: Type;
}

export function createContext<Type>(value: ContextType<Type>): State<Type> {
  let stateValue = value;
  return {
    get(id: string): Type {
      return stateValue[id];
    },
    set(id: string, callback: SetContext<Type>, defaultValue?: any): void {
      if (!stateValue[id]) stateValue[id] = defaultValue ?? null;
      stateValue[id] = callback(stateValue[id]);
    },
    clear() {
      stateValue = {} as ContextType<Type>;
    },
    getAll() {
      return stateValue;
    }
  }
}

export const context = createContext({});

export function addToArray(newValue: any, position?: number) {
  return function (currentValue: any) {
    if (!currentValue) return [newValue];
    if (typeof position === 'number') return currentValue.toSpliced(position, 0, newValue);
    return [...currentValue, newValue];
  }
}