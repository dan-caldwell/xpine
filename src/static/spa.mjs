// Enables SPA like behavior for links

async function replaceDocumentContentsWithLinkResponse() {
  const links = [...document.querySelectorAll('[data-spa]')];
  for (const link of links) {
    link.addEventListener('click', updatePageOnLinkClick);
  }
}

async function updatePageOnLinkClick(e) {
  e.preventDefault();
  const targetHref = e?.target?.closest('a')?.getAttribute('href');
  if (!targetHref) return;
  const isExternal = isExternalURL(targetHref);
  if (isExternal && !e?.target?.getAttribute('data-spa-crossorigin')) return;
  e.preventDefault();
  try {
    if (targetHref === window.location.href) return;
    const newURL = isExternal ? safeParseURL(targetHref) : safeParseURL(window.location.href);
    const startEvent = new CustomEvent('spa-link-click', {
      detail: {
        state: 'start',
        href: targetHref,
        url: newURL,
      }
    });
    window.dispatchEvent(startEvent);
    await getNewPageContent(targetHref);
    window.history.pushState(
      {
        type: 'link-click',
        targetHref,
      },
      '',
      targetHref
    );
    const event = new CustomEvent('spa-update-page-url', {
      detail: {
        href: targetHref,
        url: newURL,
      },
    });
    window.dispatchEvent(event);
    const endEvent = new CustomEvent('spa-link-click', {
      detail: {
        state: 'end',
        href: targetHref,
        url: newURL,
      }
    });
    window.dispatchEvent(endEvent);
  } catch (err) {
    console.error(err);
  }
}

async function getNewPageContent(href) {
  try {
    const res = await fetch(href);
    const text = await res.text();
    const parser = new DOMParser();
    const dom = parser.parseFromString(text, 'text/html');
    diffHead(dom);
    const newScripts = removeBodyScripts(dom);
    const { persistentArea, persistentElements } = replacePersistentNodesOnDocument(dom);
    // Here we need to work around the persistent nodes in order to not have to reload images every time
    const documentRoot = document.body.querySelector('#xpine-root');
    const domRoot = dom?.body?.querySelector('#xpine-root');
    if (!documentRoot || !domRoot) {
      throw {
        message: 'Every page must be wrapped in an #xpine-root tag',
        documentRoot,
        domRoot,
      };
    }
    documentRoot?.replaceWith(domRoot);
    for (const el of persistentElements) {
      // @ts-ignore
      const newNode = document.body.querySelector(`[data-persistent="${el?.getAttribute('data-persistent')}"]`);
      newNode.replaceWith(el);
    }
    persistentArea.remove();
    replaceAttributesOnDocumentBody(dom);
    replaceDocumentContentsWithLinkResponse();
    const newDocumentRoot = document.body.querySelector('#xpine-root');
    for (const script of newScripts) newDocumentRoot.appendChild(script);
    // Send an event
    const event = new CustomEvent('spa-update-page-content', {
      detail: {
        href,
        url: safeParseURL(res.url),
      },
    });
    window.dispatchEvent(event);
  } catch (err) {
    console.error(err);
    console.error('Error getting link', href);
  }
}

function diffHead(dom) {
  const domHeadChildren = [...dom.head.children];
  const currentHeadChildren = [...document.head.children];
  const result = {
    childrenToAdd: [],
    childrenToRemove: [],
  };
  for (const domChild of domHeadChildren) {
    const foundInCurrentChildren = currentHeadChildren.find(child => child.outerHTML === domChild.outerHTML);
    if (!foundInCurrentChildren) result.childrenToAdd.push(domChild);
  }
  for (const currentChild of currentHeadChildren) {
    const foundInDomChildren = domHeadChildren.find(child => child.outerHTML === currentChild.outerHTML);
    if (!foundInDomChildren) result.childrenToRemove.push(currentChild);
  }
  applyHeadDiffsToDocument(result);
}

function applyHeadDiffsToDocument(diff) {
  for (const child of diff.childrenToRemove) {
    // Remove from head
    document.head.removeChild(child);
  }
  for (const child of diff.childrenToAdd) {
    // Handle script tags
    if (child?.nodeName?.toLowerCase() == 'script') {
      const scriptElement = document.createElement('script');
      portAttributesToElement(child, scriptElement);
      scriptElement.innerHTML = child.innerHTML;
      document.head.appendChild(scriptElement);
      continue;
    }
    // Add to the head
    document.head.appendChild(child);
  }
}

function removeBodyScripts(dom) {
  const scripts = [...dom.body.querySelectorAll('script')];
  const newElements = [];
  for (const script of scripts) {
    const element = document.createElement('script');
    portAttributesToElement(script, element);
    element.innerHTML = script.innerHTML;
    script.remove();
    newElements.push(element);
  }
  return newElements;
}

function portAttributesToElement(oldEl, newEl) {
  for (const attribute of oldEl.attributes) {
    newEl.setAttribute(attribute.name, attribute.nodeValue);
  }
}

function replacePersistentNodesOnDocument(dom) {
  const persistentArea = document.createElement('div');
  persistentArea.style.display = 'none';
  document.body.appendChild(persistentArea);
  // Find persistent nodes
  const domPersistentNodes = [...dom.querySelectorAll('[data-persistent]')];
  const persistentNodesFromDom = domPersistentNodes.map(el => el.getAttribute('data-persistent'));
  const persistentNodesFromBody = [...document.body.querySelectorAll('[data-persistent]')];
  // Cross match the persistent nodes between current page and new page to find valid ones
  const persistentElements = [];
  persistentNodesFromBody.forEach(el => {
    const persistentAttribute = el.getAttribute('data-persistent');
    if (!persistentNodesFromDom.includes(persistentAttribute)) return false;
    dom.querySelector(`[data-persistent="${persistentAttribute}"]`).innerHTML = '';
    persistentArea.appendChild(el);
    persistentElements.push(el);
  });
  return {
    persistentElements,
    persistentArea,
  }
}

function replaceAttributesOnDocumentBody(dom) {
  while (document.body.attributes.length > 0) {
    document.body.removeAttribute(document.body.attributes[0].name);
  }
  // Set attributes on the body
  for (const attribute of dom.body.attributes) {
    document.body.setAttribute(attribute.name, attribute.nodeValue);
  }
}

async function handleBackButton() {
  if (window.xpineIgnorePopState) return;
  await getNewPageContent(window.history.state?.targetHref || window.location.href);
  const event = new CustomEvent('spa-popstate', {
    detail: {
      href: window.history.state?.targetHref || window.location.href,
    },
  });
  window.dispatchEvent(event);
}

function isRelativeURL(url) {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return false;
  } catch (err) {
    if (url?.startsWith('//')) return false;
    return true;
  }
}

function isExternalURL(url) {
  if (isRelativeURL(url)) return false;
  try {
    const computedURL = new URL(url);
    return computedURL?.origin !== window.location?.origin;
  } catch {
    return false; // Not a URL
  }
}

function safeParseURL(url) {
  try {
    return new URL(url);
  } catch (err) {
    return {};
  }
}

function handleBreakpointEvents() {
  let lastSentBreakpoint = '';
  let initial = true;
  return function () {
    const breakpoint = window.getComputedStyle(document.documentElement).getPropertyValue('--active-breakpoint')?.replace(/[\'\"]/g, '')?.trim() || '';
    if (breakpoint !== lastSentBreakpoint) {
      const event = new CustomEvent('breakpoint-change', {
        detail: {
          breakpoint,
          initial,
          previous: lastSentBreakpoint,
        },
      });
      window.dispatchEvent(event);
      lastSentBreakpoint = breakpoint;
      initial = false;
    }
  }
}

var breakpointEventsFunction = handleBreakpointEvents();

window.addEventListener('DOMContentLoaded', replaceDocumentContentsWithLinkResponse);
window.addEventListener('popstate', handleBackButton);
window.addEventListener('resize', breakpointEventsFunction);

// Call immediately
breakpointEventsFunction();

