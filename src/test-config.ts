function wrapperComponent() {
  return component();
}


function component() {
  return 'hello';
}

class ComponentWithConfig {
  config = null;
  constructor(component) {
    this.config = {
      a: 1,
      b: 2,
      c: 3,
    };
    component.call(this);
  }
}

new ComponentWithConfig(wrapperComponent);
