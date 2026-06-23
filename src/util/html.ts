// Marks a string as already-safe HTML so it is not escaped again when rendered
// as a child. Component/element output is wrapped in this; plain interpolated
// values (e.g. {userInput}) are not, so they get escaped by default.
export class RawHtml {
  constructor(public value: string) { }
  toString() { return this.value; }
}

// Elements whose text content is raw (not HTML) and must not be escaped.
const RAW_TEXT_ELEMENTS = new Set(['script', 'style']);

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Wrap a trusted HTML string so it renders without being escaped. Use only with
// HTML you control — never with user input.
export function raw(value: string): RawHtml {
  return new RawHtml(value);
}

function renderChild(child: unknown, rawText: boolean): string {
  if (Array.isArray(child)) return child.map(item => renderChild(item, rawText)).join('');
  if (child instanceof RawHtml) return child.value;
  // Preserve the previous filter(Boolean) behavior: drop falsy children.
  if (!child) return '';
  return rawText ? String(child) : escapeHtml(child);
}

export class html {
  static raw = raw;

  static attributeObjectToString(props) {
    if (!props) return '';
    return Object.entries(props)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value], index) => {
        const start = index === 0 ? ' ' : '';
        // Escape values so a quote/angle bracket can't break out of the attribute.
        return `${start}${key}="${escapeHtml(value)}"`;
      })
      .join(' ');
  }

  static async fragment(props) {
    const childrenResult = await Promise.all(props.children.flat());
    return new RawHtml(childrenResult.map(child => renderChild(child, false)).join(''));
  }

  static async createElement(type, props, ...children) {
    const childrenResult = await Promise.all(children.flat());
    // Handle passing in another element (a component function)
    if (typeof type === 'function') {
      const result = await type({ ...props, children: childrenResult, });
      return result;
    }
    const rawText = RAW_TEXT_ELEMENTS.has(type);
    const inner = childrenResult.map(child => renderChild(child, rawText)).join('');
    return new RawHtml(`<${type}${this.attributeObjectToString(props)}>${inner}</${type}>`);
  }
}

export function JSXRuntime() {
  return true;
}
