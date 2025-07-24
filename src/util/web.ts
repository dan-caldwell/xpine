export function getCurrentBreakpoint() {
  return window.getComputedStyle(document.documentElement).getPropertyValue('--active-breakpoint')?.replace(/[\'\"]/g, '')?.trim() || '';
}
