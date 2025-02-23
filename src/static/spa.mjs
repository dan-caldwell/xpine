// Enables SPA like behavior for links

async function replaceDocumentContentsWithLinkResponse() {
  const links = [...document.querySelectorAll('[data-spa]')];
  for (const link of links) {
    link.addEventListener('click', updatePageOnLinkClick);
  }

}

async function updatePageOnLinkClick(e) {
  const targetHref = e?.target?.getAttribute('href');
  if (!targetHref) return;
  if (isExternalURL(targetHref) && !e?.target?.getAttribute('data-spa-crossorigin')) return;
  e.preventDefault();
  try {
    await getNewPageContent(targetHref);
    if (targetHref === window.location.pathname) return;
    window.history.pushState(
      {
        type: 'link-click',
        targetHref,
      },
      '',
      targetHref
    );
    const event = new CustomEvent('spa:updatePageURL', {
      detail: {
        href: targetHref,
      },
    });
    window.dispatchEvent(event);
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
    const clonedPersistentNodes = getPersistentNodesFromDocument(dom);
    const body = dom.body.innerHTML;
    document.body.innerHTML = body;
    for (const clonedNode of clonedPersistentNodes) {
      // @ts-ignore
      const newNode = document.body.querySelector(`[data-persistent="${clonedNode?.getAttribute('data-persistent')}"]`);
      newNode.replaceWith(clonedNode);
    }
    replaceAttributesOnDocumentBody(dom);
    replaceDocumentContentsWithLinkResponse();
    for (const script of newScripts) document.body.appendChild(script);
    // Send an event
    const event = new CustomEvent('spa:updatePageContent', {
      detail: {
        href,
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
    dom.body.removeChild(script);
    newElements.push(element);
  }
  return newElements;
}

function portAttributesToElement(oldEl, newEl) {
  for (const attribute of oldEl.attributes) {
    newEl.setAttribute(attribute.name, attribute.nodeValue);
  }
}

function getPersistentNodesFromDocument(dom) {
  // Find persistent nodes
  const persistentNodesFromDom = [...dom.querySelectorAll('[data-persistent]')].map(el => el.getAttribute('data-persistent'));
  const persistentNodesFromBody = [...document.body.querySelectorAll('[data-persistent]')];
  // Cross match the persistent nodes between current page and new page to find valid ones
  const validPersistentNodes = persistentNodesFromBody.filter(el => {
    return persistentNodesFromDom.includes(el.getAttribute('data-persistent'));
  });
  // Clone
  return validPersistentNodes.map(el => el.cloneNode(true));
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
  await getNewPageContent(window.history.state?.targetHref || window.location.href);
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

window.addEventListener('DOMContentLoaded', replaceDocumentContentsWithLinkResponse);
window.addEventListener('popstate', handleBackButton);

