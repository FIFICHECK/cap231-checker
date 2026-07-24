// content-dashboard.js — Listen for extension data and inject into dashboard page
(function() {
  'use strict';

  // Signal to dashboard that extension is installed
  window.__EXTENSION_LOADED = true;
  document.documentElement.setAttribute('data-extension-marker', 'hktv-qa');

  // Listen for messages from the extension background
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'injectProductData') {
      // Dispatch a custom DOM event that the dashboard can listen for
      window.dispatchEvent(new CustomEvent('hktv-qa-extension-data', {
        detail: request.data
      }));
      sendResponse({ success: true });
    }
    return true;
  });

  // Also check storage on page load (in case data was saved earlier)
  chrome.storage.local.get('pendingProductData', function(result) {
    if (result.pendingProductData) {
      window.dispatchEvent(new CustomEvent('hktv-qa-extension-data', {
        detail: result.pendingProductData
      }));
      chrome.storage.local.remove('pendingProductData');
    }
  });
})();
