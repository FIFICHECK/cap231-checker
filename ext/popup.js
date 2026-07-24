// popup.js — Extension popup logic
(function() {
  'use strict';

  var statusEl = document.getElementById('status');
  var previewArea = document.getElementById('previewArea');
  var previewContent = document.getElementById('previewContent');
  var sendBtn = document.getElementById('sendBtn');
  var extractBtn = document.getElementById('extractBtn');
  var extractBtnMain = document.getElementById('extractBtnMain');

  var extractedData = null;

  // Check if we're on an HKTVmall product page
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    var tab = tabs[0];
    if (!tab) {
      setStatus('error', '❌ 無法取得當前頁面');
      return;
    }

    var url = tab.url || '';
    if (url.includes('hktvmall.com/hktv/p/') || url.includes('hktvmall.com/hktv/zh/')) {
      // On product page — auto-extract
      extractBtnMain.style.display = 'none';
      extractData(tab.id);
    } else {
      // Not on product page
      setStatus('error', '⚠️ 請先打開 HKTVmall 產品頁面');
      extractBtnMain.textContent = '🔍 去 HKTVmall 產品頁面';
      extractBtnMain.style.display = 'block';
      extractBtnMain.onclick = function() {
        chrome.tabs.create({ url: 'https://www.hktvmall.com/hktv/p/' });
      };
    }
  });

  function extractData(tabId) {
    setStatus('loading', '🔄 正在抽取產品資料...');

    chrome.tabs.sendMessage(tabId, { action: 'extractProduct' }, function(response) {
      if (chrome.runtime.lastError) {
        // Content script might not be injected yet — try injecting
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content-hktv.js']
        }, function() {
          // Retry after injection
          setTimeout(function() {
            chrome.tabs.sendMessage(tabId, { action: 'extractProduct' }, function(retryResponse) {
              if (retryResponse && retryResponse.success) {
                onDataExtracted(retryResponse.data);
              } else {
                setStatus('error', '❌ 無法抽取資料：' + ((retryResponse && retryResponse.error) || 'content script 加載失敗'));
              }
            });
          }, 500);
        });
        return;
      }

      if (response && response.success) {
        onDataExtracted(response.data);
      } else {
        setStatus('error', '❌ 抽取失敗：' + ((response && response.error) || '未知錯誤'));
      }
    });
  }

  function onDataExtracted(data) {
    extractedData = data;
    setStatus('success', '✅ 已抽取產品資料！');

    // Build preview
    var html = '';
    html += '<div class="label">📄 SKU</div><div>' + escapeHtml(data.sku || '-') + '</div>';
    html += '<div class="label">🏷️ 產品名稱</div><div>' + escapeHtml((data.skuName || '').substring(0, 80)) + '</div>';
    if (data.packageImages && data.packageImages.length > 0) {
      html += '<div class="label">📷 圖片（' + data.packageImages.length + ' 張）</div>';
      html += '<div class="img-grid">';
      for (var i = 0; i < Math.min(data.packageImages.length, 9); i++) {
        html += '<img src="' + escapeHtml(data.packageImages[i].thumb || data.packageImages[i].src) + '" title="' + escapeHtml(data.packageImages[i].alt || '') + '">';
      }
      html += '</div>';
    } else {
      html += '<div class="label">📷 圖片</div><div style="color:#999;">（未找到產品圖片）</div>';
    }

    previewContent.innerHTML = html;
    previewArea.style.display = 'block';

    // Send to dashboard button
    sendBtn.onclick = function() {
      sendBtn.disabled = true;
      sendBtn.textContent = '📤 傳送中...';
      sendToDashboard(data);
    };

    // Re-extract button
    extractBtn.onclick = function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) extractData(tabs[0].id);
      });
    };
  }

  function sendToDashboard(data) {
    chrome.runtime.sendMessage({
      action: 'sendToDashboard',
      data: data
    }, function(response) {
      if (chrome.runtime.lastError) {
        setStatus('error', '❌ 傳送失敗：' + chrome.runtime.lastError.message);
        sendBtn.disabled = false;
        sendBtn.textContent = '📤 傳送去 Dashboard 檢查';
        return;
      }
      setStatus('success', '✅ 已傳送去 Dashboard！自動開新 Tab 中...');
      sendBtn.textContent = '✅ 已傳送！';
    });
  }

  function setStatus(type, msg) {
    statusEl.className = 'status ' + type;
    statusEl.textContent = msg;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
