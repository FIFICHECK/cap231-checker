// content-hktv.js — Extract 5 sections + images from HKTVmall product DOM
(function() {
  'use strict';

  // Listen for extract request from popup
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'extractProduct') {
      try {
        var data = extractAll();
        sendResponse({ success: true, data: data });
      } catch(e) {
        sendResponse({ success: false, error: e.message });
      }
    }
    return true; // Keep channel open for async response
  });

  function extractAll() {
    // 1. SKU name — from h1 or product title
    var skuName = '';
    var h1 = document.querySelector('h1, [class*="product-name"], [class*="productName"], .product-title');
    if (h1) skuName = h1.innerText.trim();
    if (!skuName) {
      var title = document.title;
      skuName = title.replace(/\s*\|.*$/, '').trim();
    }

    // 2. Short description — from product brief
    var shortDesc = '';
    var brief = document.querySelector('[class*="short-description"], [class*="brief"], [class*="product-brief"], .productBrief, [data-section="shortDesc"]');
    if (brief) shortDesc = brief.innerText.trim();
    if (!shortDesc) {
      // Try product attributes table
      var cells = document.querySelectorAll('table tr td');
      for (var i = 0; i < cells.length; i++) {
        if (cells[i].innerText.includes('商品簡介') || cells[i].innerText.includes('Short Description')) {
          shortDesc = (cells[i+1] || cells[i].parentElement.querySelector('td:last-child') || {}).innerText || '';
          shortDesc = shortDesc.trim();
          break;
        }
      }
    }

    // 3. Detailed description — from product detail tab
    var detailDesc = '';
    var detail = document.querySelector('[class*="product-detail"], [class*="description"], .productDescription, #productDetail, [data-section="detailDesc"]');
    if (detail) detailDesc = detail.innerText.trim();
    if (!detailDesc) {
      // Try clicking "詳細介紹" tab first, then read content
      var detailTab = document.querySelector('[class*="tab"]:has-text("詳細介紹"), button:has-text("詳細介紹"), [onclick*="detail"]');
      if (detailTab) detailTab.click();
      // Check after brief click — might need setTimeout but we handle sync here
      detail = document.querySelector('#detailTabContent, [class*="detail-content"], .product-detail-content');
      if (detail) detailDesc = detail.innerText.trim();
    }

    // 4. Tags / extras
    var tags = [];
    document.querySelectorAll('[class*="tag"], [class*="hashtag"], .product-tag, .sku-tag').forEach(function(el) {
      var t = el.innerText.trim();
      if (t && t.length > 1) tags.push(t);
    });
    // Try meta keywords
    var metaK = document.querySelector('meta[name="keywords"]');
    if (metaK) {
      var kw = metaK.content.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 1; });
      tags = tags.concat(kw);
    }
    // Deduplicate
    var seen = {};
    tags = tags.filter(function(t) { return seen[t] ? false : (seen[t] = true); });
    var extra = (tags.length > 0 ? '#' + tags.join(' #') : '').substring(0, 500);

    // 5. Package images — extract ALL product image URLs from rendered DOM
    var packageImages = [];
    var seenUrls = {};

    // 5a. data-primaryimagesrc (carousel primary)
    document.querySelectorAll('img[data-primaryimagesrc]').forEach(function(img) {
      var src = img.getAttribute('data-primaryimagesrc');
      if (src && !seenUrls[src]) {
        seenUrls[src] = true;
        packageImages.push({ src: src, alt: img.alt || '', thumb: img.src || '' });
      }
    });

    // 5b. uploadProductImage in src
    document.querySelectorAll('img[src*="uploadProductImage"]').forEach(function(img) {
      if (img.src && !seenUrls[img.src]) {
        seenUrls[img.src] = true;
        // Check if there's a larger version available
        var largeSrc = img.getAttribute('data-primaryimagesrc') || img.src;
        packageImages.push({ src: largeSrc, alt: img.alt || '', thumb: img.src });
      }
    });

    // 5c. Product carousel container
    var carousel = document.querySelector('[class*="product-primary-image"], [class*="carousel"], [class*="gallery"], .swiper, .slick-slider');
    if (carousel) {
      carousel.querySelectorAll('img').forEach(function(img) {
        var src = img.getAttribute('data-primaryimagesrc') || img.getAttribute('data-src') || img.src || '';
        if (src && !seenUrls[src] && src.includes('hktv')) {
          seenUrls[src] = true;
          packageImages.push({ src: src, alt: img.alt || '', thumb: img.src || '' });
        }
      });
    }

    // Get SKU from URL
    var skuMatch = window.location.pathname.match(/\/p\/([^/]+)/);
    var skuId = skuMatch ? skuMatch[1] : '';

    return {
      sku: skuId,
      skuName: skuName,
      shortDesc: shortDesc,
      detailDesc: detailDesc,
      extra: extra,
      packageImages: packageImages.slice(0, 20), // Max 20 images
      url: window.location.href,
      extractedAt: new Date().toISOString()
    };
  }
})();
