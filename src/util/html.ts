export class html {

  static attributeObjectToString(props) {
    if (!props) return '';
    return Object.entries(props)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value], index) => {
        const start = index === 0 ? ' ' : '';
        return `${start}${key}="${value}"`;
      })
      .join(' ');
  }

  static async fragment(props) {
    const childrenResult = await Promise.all(props.children.flat());
    return childrenResult.filter(Boolean).join('');
  }

  static async createElement(type, props, ...children) {
    const childrenResult = await Promise.all(children.flat());
    // Handle passing in another element
    if (typeof type === 'function') {
      const result = await type({ ...props, children: childrenResult, });
      return result;
    }
    return `<${type}${this.attributeObjectToString(props)}>${childrenResult.filter(Boolean).join('')}</${type}>`;
  }
}

export function JSXRuntime() {
  return true;
}