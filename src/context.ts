import EventEmitter from "events";

export type ContextCallback = (currentContext: any) => any;

class ContextEmitter extends EventEmitter { };
const contextEmitter = new ContextEmitter();

export type State<StateProps> = {
  get: () => StateProps;
  set: (value: StateProps) => void;
}

export function createState<Type>(value: Type) {
  let stateValue: Type = value;
  return {
    get(): Type {
      return stateValue;
    },
    set(newValue: Type): void {
      stateValue = newValue;
    }
  }
}

export async function createContext(id: string, initialData: any) {
  let state = initialData;
  return function () {

  }
}


export async function setContext(id: string, callback) {

}

export async function getContext(id: string) {

}
