export type SetContext<Type> = (currentContext: Type) => Type;

export type State<StateProps> = {
  get: (id: string) => StateProps;
  set: (id: string, callback: SetContext<StateProps>, defaultValue?: any) => void;
  clear: () => void;
  getAll: () => any;
  addToArray: (id: string, value: any, position?: number | Date) => void;
  getArrayQueue: () => any;
  runArrayQueue: () => void;
}

type ContextType<Type> = {
  [key: string]: Type;
}

type ArrayQueueItem<PositionType> = {
  id: string,
  value: (currentValue: any) => any[],
  position: PositionType,
}

export function createContext(value: ContextType<any>): State<any> {
  let stateValue = value;
  let arrayQueue = {};
  return {
    get(id: string): any {
      const val = stateValue[id];
      if (Array.isArray(val)) return val.filter(item => item !== undefined);
      return val;
    },
    set(id: string, callback: SetContext<any>, defaultValue?: any): void {
      if (!stateValue[id]) stateValue[id] = defaultValue ?? null;
      stateValue[id] = callback(stateValue[id]);
    },
    clear() {
      stateValue = {} as ContextType<any>;
    },
    getAll() {
      return stateValue;
    },
    getArrayQueue() {
      return arrayQueue;
    },
    addToArray(id: string, value: any, position?: number): void {
      const output: ArrayQueueItem<number | Date> = {
        id,
        value: addToContextArray(value, position),
        position,
      };
      if (!arrayQueue[id]) {
        arrayQueue[id] = [output];
      } else {
        arrayQueue[id].push(output);
      }
    },
    runArrayQueue() {
      Object.keys(arrayQueue).forEach((key) => {
        const dates = arrayQueue[key].filter((item: ArrayQueueItem<number | Date>) => item?.position instanceof Date);
        const numbers = arrayQueue[key].filter((item: ArrayQueueItem<number | Date>) => typeof item?.position === 'number' || !item?.position);

        const sortedDates = dates.toSorted((a: ArrayQueueItem<Date>, b: ArrayQueueItem<Date>) => b?.position.getTime() - a?.position.getTime());
        const sortedNumbers = numbers.toSorted((a: ArrayQueueItem<number>, b: ArrayQueueItem<number>) => (a?.position ?? Infinity) - (b.position ?? Infinity));

        const output = sortedNumbers.concat(sortedDates);

        for (const item of output) {
          this.set(key, item.value, []);
        }
      });
      arrayQueue = {};
    }
  }
}

export const context = createContext({});

export function addToContextArray(newValue: any, position?: number) {
  return function (currentValue: any) {
    if (!currentValue) return [newValue];
    if (typeof position === 'number') {
      if (position > currentValue?.length) {
        const output = [...currentValue, ...new Array(position + 1 - currentValue.length)];
        return output.toSpliced(position, 0, newValue);
      }
      if (currentValue?.[position] === undefined) return currentValue.toSpliced(position, 1, newValue);
      return currentValue.toSpliced(position, 0, newValue);
    }
    return [...currentValue, newValue];
  }
}