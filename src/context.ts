export type SetContext<Type> = (currentContext: Type) => Type;

export type State<StateProps> = {
  get: () => StateProps;
  set: (callback: SetContext<StateProps>) => void;
}

// export function createContext<Type>(value: Type): State<Type> {
//   let stateValue: Type = value;
//   return {
//     get(): Type {
//       return stateValue;
//     },
//     set(callback: SetContext<Type>): void {
//       stateValue = callback(stateValue);
//       console.log("setting context", stateValue);
//     },
//   }
// }

export function getConfig() {

}

export function createContext(initialValue: any) {
  const target = {
    data: initialValue,
  }
  const handler = {
    get(target, prop, receiver) {
      // @ts-ignore
      return Reflect.get(...arguments);
    },
    set(target, prop, value, receiver) {
      target[prop] = value;
      // @ts-ignore
      return Reflect.set(...arguments);
    }
  }
  return new Proxy(target, handler);
}


// export class Context {
//   context = null;
//   children = null;

//   constructor(initialValue) {
//     this.context = initialValue;
//   }

//   initContext(callback: SetContext<any>) {
    
//   }

//   provider() {
//     this.context = createContext(this.initialValue);
//     return {
//       render: this.render,
//     }
//   }
//   render({ children }) {
//     return children;
//   }
// }

// export function getContext(contextFn) {
//   return contextFn.context.get();
// }

// export function setContext(contextFn, callback: SetContext<any>) {
//   return contextFn.set(callback);
// }