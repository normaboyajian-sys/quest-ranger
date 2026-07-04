// SSR polyfill for `document` — must be imported before any module that
// touches `document` at module init (e.g. lottie-web via
// @lottiefiles/react-lottie-player, which is pulled into a shared SSR chunk
// by many route files). Keep this file self-contained and side-effect only.

if (typeof (globalThis as unknown as { document?: unknown }).document === "undefined") {
  const noop = () => {};
  const makeEl = () => ({
    style: {},
    setAttribute: noop,
    getAttribute: () => null,
    appendChild: noop,
    removeChild: noop,
    addEventListener: noop,
    removeEventListener: noop,
    getContext: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementsByTagName: () => [],
    getElementsByClassName: () => [],
    classList: { add: noop, remove: noop, contains: () => false, toggle: noop },
    children: [],
    childNodes: [],
    parentNode: null,
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,
    cloneNode() { return makeEl(); },
    dispatchEvent: () => true,
  });
  const doc = {
    createElement: makeEl,
    createElementNS: makeEl,
    createTextNode: makeEl,
    createDocumentFragment: makeEl,
    addEventListener: noop,
    removeEventListener: noop,
    getElementsByTagName: () => [],
    getElementsByClassName: () => [],
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    readyState: "complete",
    body: null,
    head: null,
    documentElement: null,
    cookie: "",
    location: { href: "", pathname: "/", search: "", hash: "", host: "", origin: "" },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).document = doc;
}

export {};
