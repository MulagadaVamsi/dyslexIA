// Bionic Reading - Bold the first portion of words to guide the eye

import { BionicReadingSettings } from '@/types';

const PROCESSED_ATTR = 'data-lexilens-bionic';
const ORIGINAL_ATTR = 'data-lexilens-original';

let isEnabled = false;

/**
 * Calculate how many characters to bold based on word length and percentage
 */
function getBoldLength(wordLength: number, percentage: number): number {
  if (wordLength <= 1) return 1;
  if (wordLength <= 3) return 1;
  return Math.ceil(wordLength * (percentage / 100));
}

/**
 * Process a single text node to apply bionic reading
 */
function processTextNode(textNode: Text, boldPercentage: number): DocumentFragment {
  const text = textNode.textContent || '';
  const fragment = document.createDocumentFragment();
  
  // Regex to match words (letters and apostrophes) and non-words
  const regex = /([a-zA-Z']+)|([^a-zA-Z']+)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const word = match[1];
    const nonWord = match[2];
    
    if (word) {
      const boldLen = getBoldLength(word.length, boldPercentage);
      const boldPart = word.slice(0, boldLen);
      const normalPart = word.slice(boldLen);
      
      const strong = document.createElement('strong');
      strong.textContent = boldPart;
      strong.style.fontWeight = '700';
      strong.setAttribute('data-lexilens-bionic-generated', 'true');
      fragment.appendChild(strong);
      
      if (normalPart) {
        fragment.appendChild(document.createTextNode(normalPart));
      }
    } else if (nonWord) {
      fragment.appendChild(document.createTextNode(nonWord));
    }
  }
  
  return fragment;
}

/**
 * Check if an element should be skipped
 */
function shouldSkipElement(element: Element): boolean {
  const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'CANVAS', 'CODE', 'PRE', 'KBD', 'SAMP'];
  const skipClasses = ['lexilens-widget', 'highlight', 'code'];
  
  if (skipTags.includes(element.tagName)) return true;
  if (element.hasAttribute(PROCESSED_ATTR)) return true;
  if (element.hasAttribute('data-lexilens-bionic-generated')) return true;
  if (element.closest('.lexilens-widget')) return true;
  if (skipClasses.some(cls => element.classList.contains(cls))) return true;
  if (element.getAttribute('contenteditable') === 'true') return true;
  
  return false;
}

/**
 * Apply bionic reading to a subtree
 */
function applyToSubtree(root: Element | Document, boldPercentage: number): void {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
        if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const textNodes: Text[] = [];
  let node: Text | null;
  
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }
  
  // Process in reverse to avoid invalidating node positions
  for (let i = textNodes.length - 1; i >= 0; i--) {
    const textNode = textNodes[i];
    const parent = textNode.parentElement;
    
    if (!parent || parent.hasAttribute(PROCESSED_ATTR)) continue;
    
    // Store original HTML for reverting
    if (!parent.hasAttribute(ORIGINAL_ATTR)) {
      parent.setAttribute(ORIGINAL_ATTR, parent.innerHTML);
    }
    
    const fragment = processTextNode(textNode, boldPercentage);
    textNode.replaceWith(fragment);
    parent.setAttribute(PROCESSED_ATTR, 'true');
  }
}

/**
 * Enable bionic reading
 */
export function enableBionicReading(settings: BionicReadingSettings): void {
  if (isEnabled) return;
  isEnabled = true;
  
  applyToSubtree(document.body, settings.boldPercentage);
  
  // Observe for new content
  // Optimize with debounce to prevent UI stuttering
  let timeout: number | null = null;

  // Observe for new content
  const observer = new MutationObserver((mutations) => {
    // Collect all elements to process
    const elementsToProcess: Element[] = [];
    
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (!shouldSkipElement(element)) {
            elementsToProcess.push(element);
          }
        }
      }
    }
    
    if (elementsToProcess.length === 0) return;

    // Debounce processing
    if (timeout) window.clearTimeout(timeout);
    
    timeout = window.setTimeout(() => {
      // Disconnect to avoid observing our own changes
      observer.disconnect();
      
      try {
        elementsToProcess.forEach(el => applyToSubtree(el, settings.boldPercentage));
      } finally {
        // Reconnect
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
        timeout = null;
      }
    }, 100);
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  // Store observer for cleanup
  (window as any).__lexilensBionicObserver = observer;
}

/**
 * Disable bionic reading and restore original content
 */
export function disableBionicReading(): void {
  isEnabled = false;
  
  // Disconnect observer
  const observer = (window as any).__lexilensBionicObserver as MutationObserver | undefined;
  if (observer) {
    observer.disconnect();
    delete (window as any).__lexilensBionicObserver;
  }
  
  // Restore original content
  const processed = document.querySelectorAll(`[${ORIGINAL_ATTR}]`);
  processed.forEach((el) => {
    const original = el.getAttribute(ORIGINAL_ATTR);
    if (original) {
      el.innerHTML = original;
    }
    el.removeAttribute(PROCESSED_ATTR);
    el.removeAttribute(ORIGINAL_ATTR);
  });
}

/**
 * Update bionic reading settings (requires reapplication)
 */
export function updateBionicReading(settings: BionicReadingSettings): void {
  if (isEnabled) {
    disableBionicReading();
    enableBionicReading(settings);
  }
}

/**
 * Check if bionic reading is active
 */
export function isBionicReadingActive(): boolean {
  return isEnabled;
}
