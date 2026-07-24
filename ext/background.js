// background.js — Service Worker
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'openDashboard') {
    // Open dashboard tab
    chrome.tabs.create({
      url: 'https://fificheck.github.io/hktvmall-QA-checker/?extension=true'
    });
    sendResponse({ success: true, tabOpened: true });
    return true;
  }

  if (request.action === 'sendToDashboard') {
    // Send extracted product data to the dashboard content script
    chrome.tabs.query({ url: 'https://fificheck.github.io/hktvmall-QA-checker/*' }, function(tabs) {
      if (tabs && tabs.length > 0) {
        // Dashboard already open — send data directly
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'injectProductData',
          data: request.data
        }).catch(function() {
          // Tab might not be ready, fallback to storage
          chrome.storage.local.set({ pendingProductData: request.data });
        });
        sendResponse({ sent: true });
      } else {
        // Dashboard not open — save to storage first, then open
        chrome.storage.local.set({ pendingProductData: request.data }, function() {
          chrome.tabs.create({
            url: 'https://fificheck.github.io/hktvmall-QA-checker/?extension=true'
          });
        });
        sendResponse({ sent: true, openedNewTab: true });
      }
    });
    return true; // Keep channel open for async
  }
});
