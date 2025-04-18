// ==UserScript==
// @name         Address Form Configuration Editor
// @namespace    http://tampermonkey.net/
// @version      5.1
// @description  Frontend to configure address_form_configuration.json.
// @author       julpif
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Address%20Form%20Configuration%20Editor.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Address%20Form%20Configuration%20Editor.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Include Font Awesome for Icons
    const fontAwesomeLink = document.createElement('link');
    fontAwesomeLink.rel = 'stylesheet';
    fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesomeLink);

    // Include SortableJS for Drag-and-Drop functionality (we still load it, but we won't use it for layout fields now)
    const sortableScript = document.createElement('script');
    sortableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js';
    sortableScript.onload = () => {
        console.log('SortableJS loaded successfully.');
    };
    document.head.appendChild(sortableScript);

    /* ------------------- Notification Function ------------------- */

    // Create Notification Element
    const notification = document.createElement('div');
    notification.id = 'afce-notification';
    document.body.appendChild(notification);

    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.style.background = type === 'success' ? '#28a745' : '#dc3545'; // Green for success, Red for danger
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    /* ------------------- Modal Structures ------------------- */

    // Create the Main Modal Structure
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'afce-modal-overlay';
    document.body.appendChild(modalOverlay);

    // Create Input Modal Structure
    const inputModalOverlay = document.createElement('div');
    inputModalOverlay.id = 'afce-input-modal-overlay';
    document.body.appendChild(inputModalOverlay);

    // Create Confirmation Modal Structure
    const confirmModalOverlay = document.createElement('div');
    confirmModalOverlay.id = 'afce-confirm-modal-overlay';
    document.body.appendChild(confirmModalOverlay);

    /* ------------------- CSS Styles ------------------- */

    GM_addStyle(`
    /* Modal Overlay */
    #afce-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.4);
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(3px);
        animation: fadeIn 0.3s;
    }

    /* By Country Section Styles */
    .afce-section-by-country {
        padding: 20px;
        background-color: #ffffff;
    }

    .afce-section-by-country .afce-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
    }

    .afce-section-by-country .afce-table th,
    .afce-section-by-country .afce-table td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid #e0e0e0;
        vertical-align: middle;
        word-wrap: break-word;
        white-space: normal;
    }

    .afce-section-by-country .afce-table th {
        background-color: #f5f5f5;
        font-weight: 600;
        position: sticky;
        top: 0;
        z-index: 2;
    }

    .afce-section-by-country .afce-table tr:hover {
        background-color: #fafafa;
    }

    .afce-section-by-country .afce-table input[type="text"],
    .afce-section-by-country .afce-table select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.3s, box-shadow 0.3s;
    }

    .afce-section-by-country .afce-table input[type="text"]:focus,
    .afce-section-by-country .afce-table select:focus {
        border-color: #007BFF;
        box-shadow: 0 0 5px rgba(0,123,255,0.5);
        outline: none;
    }

    .afce-section-by-country .afce-button {
        padding: 8px 12px;
        font-size: 14px;
        border-radius: 6px;
        margin-right: 5px;
    }

    .afce-section-by-country .afce-button.secondary {
        background-color: #007BFF;
        color: #fff;
    }

    .afce-section-by-country .afce-button.secondary:hover {
        background-color: #0056b3;
    }

    .afce-section-by-country .afce-button.danger {
        background-color: #dc3545;
        color: #fff;
    }

    .afce-section-by-country .afce-button.danger:hover {
        background-color: #a71d2a;
    }

    @media (max-width: 768px) {
        .afce-section-by-country .afce-table th,
        .afce-section-by-country .afce-table td {
            padding: 8px 12px;
        }
        .afce-section-by-country .afce-button {
            padding: 6px 10px;
            font-size: 13px;
        }
    }

    #afce-modal {
        background: #fff;
        width: 95%;
        max-width: 1200px;
        height: 85%;
        border-radius: 10px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 16px rgba(0,0,0,0.15);
        position: relative;
        animation: slideIn 0.3s;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    #afce-header {
        padding: 10px 20px;
        background: #000000;
        color: #ffffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    #afce-header h2 {
        color: #fff;
        margin: 0;
        font-size: 18px;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    #afce-close-btn {
        background: transparent;
        border: none;
        color: #ffffff;
        cursor: pointer;
        font-size: 18px;
    }

    #afce-tabs {
        display: flex;
        border-bottom: 1px solid #ddd;
        background: #f9f9f9;
        align-items: center;
        padding: 0 20px;
    }

    .afce-tab {
        padding: 8px 16px;
        cursor: pointer;
        transition: background-color 0.3s, color 0.3s;
        font-size: 13px;
        position: relative;
    }

    .afce-tab:hover {
        background: #e0e0e0;
    }

    .afce-tab.active {
        background: #ffffff;
        border-bottom: 3px solid #000000;
        font-weight: bold;
    }

    #afce-publish-button {
        margin-left: auto;
        padding: 8px 16px;
        background: #000000;
        color: #ffffff;
        border: none;
        cursor: pointer;
        border-radius: 4px;
        font-size: 14px;
        transition: background-color 0.3s, transform 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }

    #afce-publish-button:hover {
        background: #333333;
    }

    #afce-publish-button:active {
        background: #555555;
        transform: scale(0.98);
    }

    #afce-content {
        overflow-y: auto;
        padding: 15px 20px;
        overflow-x: hidden;
        max-width: 100%;
        box-sizing: border-box;
    }

    .afce-section {
        display: none;
        animation: fadeIn 0.3s;
    }

    .afce-section.active {
        display: block;
    }

    .afce-form-group {
        margin-bottom: 10px;
    }

    .afce-form-group label {
        display: block;
        margin-bottom: 4px;
        font-weight: bold;
        font-size: 13px;
        text-align: left;
    }

    .afce-form-group input,
    .afce-form-group select,
    .afce-form-group textarea {
        padding: 6px 6px;
        box-sizing: border-box;
        border: 1px solid #cccccc;
        border-radius: 4px;
        font-size: 13px;
        transition: border-color 0.3s;
    }

    .afce-form-group input:focus,
    .afce-form-group select:focus,
    .afce-form-group textarea:focus {
        border-color: #000000;
        outline: none;
    }

    .afce-layout-box,
    .afce-validation-box,
    .afce-feature-box {
        width: 100%;
    }

    .afce-button {
        padding: 8px 14px;
        background: #000000;
        color: #ffffff;
        border: none;
        cursor: pointer;
        border-radius: 4px;
        margin-right: 8px;
        margin-top: 8px;
        font-size: 13px;
        transition: background-color 0.3s, transform 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }

    .afce-button:hover {
        background: #333333;
    }

    .afce-button:active {
        background: #555555;
        transform: scale(0.98);
    }

    .afce-button.secondary {
        background: #007BFF;
    }

    .afce-button.secondary:hover {
        background: #0056b3;
    }

    .afce-button.danger {
        background: #dc3545;
    }

    .afce-button.danger:hover {
        background: #a71d2a;
    }

    .afce-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
        font-size: 12px;
        table-layout: fixed;
    }

    .afce-table th, .afce-table td {
        border: 1px solid #dddddd;
        padding: 8px 10px;
        text-align: left;
        word-wrap: break-word;
        white-space: normal;
    }

    .afce-table th {
        background-color: #f2f2f2;
        font-weight: bold;
    }

    .afce-table tbody tr:hover {
        background-color: #f1f1f1;
    }

    #afce-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: #ffffff;
        padding: 12px 16px;
        border-radius: 4px;
        display: none;
        z-index: 100000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-size: 13px;
        animation: fadeIn 0.5s;
    }

    #afce-input-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.4);
        z-index: 10002;
        display: none;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(3px);
        animation: fadeIn 0.3s;
    }
    .afce-field-item .handle {
    cursor: move;
    margin-right: 8px;
    color: #555;
    font-size: 14px;
}

    #afce-input-modal {
        background: #fff;
        width: 80%;
        max-width: 800px;
        max-height: 85%;
        border-radius: 10px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 16px rgba(0,0,0,0.15);
        position: relative;
        animation: slideIn 0.3s ease-out;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    #afce-input-header {
        padding: 10px 16px;
        background: #000000;
        color: #ffffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    #afce-input-header h3 {
        color: #fff;
        margin: 0;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    #afce-input-close-btn {
        background: transparent;
        border: none;
        color: #ffffff;
        cursor: pointer;
        font-size: 18px;
    }

    #afce-confirm-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.4);
        z-index: 10003;
        display: none;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(3px);
        animation: fadeIn 0.3s;
    }
.afce-header {
    background-color: #f0f0f0;
    padding: 8px 12px;
    border-bottom: 2px solid #ccc;
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 10px;
    user-select: none;
}

    #afce-confirm-modal {
        background: #fff;
        width: 80%;
        max-width: 450px;
        border-radius: 10px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 16px rgba(0,0,0,0.15);
        position: relative;
        animation: slideIn 0.3s ease-out;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    #afce-confirm-header {
        padding: 10px 16px;
        background: #dc3545;
        color: #ffffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    #afce-confirm-header h3 {
        margin: 0;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    #afce-confirm-close-btn {
        background: transparent;
        border: none;
        color: #ffffff;
        cursor: pointer;
        font-size: 18px;
    }

    #afce-confirm-content {
        padding: 10px 16px;
        text-align: center;
        font-size: 13px;
    }

    #afce-confirm-footer {
        padding: 10px 16px;
        display: flex;
        justify-content: center;
        gap: 12px;
    }

    .afce-checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .afce-checkbox-group label {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
    }

    #afce-content::-webkit-scrollbar,
    #afce-input-content::-webkit-scrollbar {
        width: 6px;
    }

    #afce-content::-webkit-scrollbar-thumb,
    #afce-input-content::-webkit-scrollbar-thumb {
        background-color: rgba(0,0,0,0.2);
        border-radius: 3px;
    }

    .afce-two-column-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        grid-gap: 16px;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideIn {
        from { transform: translateY(-30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    .afce-inline-form input[type="text"],
    .afce-inline-form select {
        width: 100%;
        box-sizing: border-box;
    }

    .afce-inline-form button {
        margin-top: 0;
    }

    /* JSON Section Styles - now taking almost full window height */
    #afce-json-content {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    #afce-json-display {
        width: 100%;
        height: calc(100vh - 150px);
        background: #f5f5f5;
        border: 1px solid #ccc;
        padding: 10px;
        overflow: auto;
        font-family: monospace;
        white-space: pre-wrap;
        word-wrap: break-word;
        border-radius: 4px;
    }

    /* Highlight style for search results */
    .highlight {
        background-color: yellow;
    }

    #afce-copy-json-btn {
        align-self: flex-end;
    }

    .afce-toggle-container {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 10px;
    }

    .afce-toggle-switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
    }

    .afce-toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .afce-toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: .4s;
        border-radius: 24px;
    }

    .afce-toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
    }

    .afce-toggle-switch input:checked + .afce-toggle-slider {
        background-color: #007BFF;
    }

    .afce-toggle-switch input:checked + .afce-toggle-slider:before {
        transform: translateX(26px);
    }

    .billing-layout-column,
    .billing-validation-column,
    .billing-features-column {
        display: none;
    }

    .billing-columns-visible .billing-layout-column,
    .billing-columns-visible .billing-validation-column,
    .billing-columns-visible .billing-features-column {
        display: table-cell;
    }

    /* Container Styles for layout fields */
    .afce-fields-container {
        display: flex;
        gap: 20px;
        margin-top: 10px;
    }

    .afce-fields-container .afce-column {
        flex: 1;
        min-width: 200px;
        background-color: #f1f1f1;
        padding: 10px;
        border: 1px dashed #ccc;
        border-radius: 4px;
        max-height: 480px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }

    .afce-fields-container .afce-column h4 {
        margin-top: 0;
        text-align: center;
        flex: 0 0 auto;
    }

    .afce-fields-container .afce-column .afce-field-item {
        flex: 0 0 auto;
    }

    .afce-fields-container .afce-column::-webkit-scrollbar {
        width: 6px;
    }

    .afce-fields-container .afce-column::-webkit-scrollbar-thumb {
        background-color: rgba(0,0,0,0.2);
        border-radius: 3px;
    }

    #afce-input-content {
        display: flex;
        margin: 10px;
        flex-direction: column;
        height: 100%;
    }

    #afce-input-content .afce-form-group {
        flex: 1 1 auto;
        overflow: hidden;
    }

    #afce-input-content .afce-fields-container {
        flex: 1 1 auto;
        overflow: hidden;
    }

    #afce-input-submit-btn {
        flex: 0 0 auto;
        align-self: flex-end;
        margin: 10px;
    }
/* Updated Layout Preview Styles for a 2025 Vibe - White Background, Black Accents */
    #layoutPreview {
        min-height: 120px;
        background: #fff;
        padding: 10px;
        display: flex;
        flex-wrap: wrap;
    }

    /* Updated individual field styles with margin to simulate gap */
    .form-field {
        margin: 2px 0px 2px 0px;
        background: #fff;
        padding: 10px;
        border: 1px solid #000;
        border-radius: 8px;
        color: #000;
        font-family: 'Segoe UI', sans-serif;
    }

      .dragging-field {
      background-color: #eef5e3;
      opacity: 0.8;
  }
    /* Inactive Container Scroll Styles */
  #inactiveContainer {
      max-height: 500px;  /* Adjust this value to suit your needs */
      overflow-y: auto;
  }

    `);

    /* ------------------- Event Listener to Trigger the Editor ------------------- */

    window.addEventListener('openAfceEditor', function() {
        initializeConfig();
    }, false);

    /* ------------------- Helper ------------------- */

    function renderFormPreview(layoutFields) {
  const preview = document.getElementById('layoutPreview');
  if (!preview) return;
  preview.innerHTML = ''; // Clear any previous preview

  let currentRow = document.createElement('div');
  currentRow.className = 'form-row';
  let currentSpan = 0;

  layoutFields.forEach((field, idx) => {
    // If adding this field would exceed 12 columns, start a new row.
    if (currentSpan + field.span > 12) {
      preview.appendChild(currentRow);
      currentRow = document.createElement('div');
      currentRow.className = 'form-row';
      currentSpan = 0;
    }
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'form-field';
    // Set the width proportionally based on the 12‑column grid.
    fieldDiv.style.flex = `0 0 ${(field.span / 12) * 100}%`;
    fieldDiv.setAttribute('data-index', idx);
    fieldDiv.innerHTML = `<strong>${field.name}</strong><br>
      <input type="range" min="1" max="12" value="${field.span}" class="field-slider" data-index="${idx}">
      <span>${field.span} col${field.span > 1 ? 's' : ''}</span>`;
    currentRow.appendChild(fieldDiv);
    currentSpan += field.span;
  });
  preview.appendChild(currentRow);

  // Initialise slider events for live updates.
  preview.querySelectorAll('.field-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'), 10);
      const newSpan = parseInt(e.target.value, 10);
      layoutFields[idx].span = newSpan;
      renderFormPreview(layoutFields); // Re-render the preview after slider change.
    });
  });

  // Initialise drag-and-drop on the preview container using SortableJS.
new Sortable(preview, {
    animation: 150,
    handle: '.form-field',
    ghostClass: 'dragging-field', // Added visual cue for dragged field
    onEnd: function(evt) {
        const movedItem = layoutFields.splice(evt.oldIndex, 1)[0];
        layoutFields.splice(evt.newIndex, 0, movedItem);
        renderFormPreview(layoutFields);
    }
});
}

    /* ------------------- Initialize Configuration ------------------- */

    function initializeConfig() {
        const siteId = unsafeWindow.siteId;
        const authToken = unsafeWindow.authToken;
        if (!siteId || !authToken) {
            console.error('Site ID or Auth Token not found.');
            showNotification('Site ID or Auth Token not found.', 'danger');
            return;
        }

        let apiEndpoint = 'https://api-stage.ingrid.com/v1/config/site.get?siteId=' + siteId;
        const pageUrl = window.location.href;

        if (pageUrl.startsWith('https://mad.ingrid.com/')) {
            apiEndpoint = 'https://api.ingrid.com/v1/config/site.get?siteId=' + siteId;
        }

        fetch(apiEndpoint, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + authToken,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                console.error('API request failed with status:', response.status);
                showNotification('API request failed. Status: ' + response.status, 'danger');
                return Promise.reject('API request failed');
            }
            return response.json();
        })
        .then(data => {
            console.log('API response data:', data);
            let addressFormConfig = null;

            if (data.address_form_configuration) {
                addressFormConfig = data.address_form_configuration;
            } else if (data.data && data.data.address_form_configuration) {
                addressFormConfig = data.data.address_form_configuration;
            } else if (data.site && data.site.address_form_configuration) {
                addressFormConfig = data.site.address_form_configuration;
            }

            let version = null;
            if (data.site && data.site.version) {
                version = data.site.version;
            } else if (data.version) {
                version = data.version;
            } else if (data.data && data.data.version) {
                version = data.data.version;
            }

            if (addressFormConfig) {
                window.afceConfig = addressFormConfig;
                window.afceConfig.layouts = window.afceConfig.layouts || {};
                window.afceConfig.validations = window.afceConfig.validations || {};
                window.afceConfig.features = window.afceConfig.features || {};
                window.afceConfig.by_country = window.afceConfig.by_country || {};

                const missingSections = [];
                if (!addressFormConfig.layouts) missingSections.push('Layouts');
                if (!addressFormConfig.validations) missingSections.push('Validations');
                if (!addressFormConfig.features) missingSections.push('Features');
                if (!addressFormConfig.by_country) missingSections.push('By Country');

                if (missingSections.length > 0) {
                    showNotification(`Initialized missing sections: ${missingSections.join(', ')}.`, 'success');
                }

            } else {
                window.afceConfig = {
                    "layouts": {},
                    "validations": {},
                    "features": {},
                    "by_country": {}
                };
                console.warn('address_form_configuration is missing. Initializing with empty configuration.');
                showNotification('address_form_configuration is missing. Initialized with empty configuration.', 'success');
            }

            window.afceVersion = version;
            console.log('Parsed addressFormConfig:', window.afceConfig);
            initEditor(data);
            modalOverlay.style.display = 'flex';
        })
        .catch(error => {
            console.error('Failed to fetch or parse API response:', error);
            showNotification('Failed to fetch or parse API response.', 'danger');
        });
    }

    /* ------------------- Main Editor Initialization ------------------- */

    function initEditor(fullData) {
        if (!window.afceConfig) {
            window.afceConfig = {
                "layouts": {},
                "validations": {},
                "features": {},
                "by_country": {}
            };
        }

        modalOverlay.innerHTML = `
            <div id="afce-modal">
                <div id="afce-header">
                    <h2><i class="fas fa-edit"></i> Address Form Configuration Editor</h2>
                    <button id="afce-close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div id="afce-tabs">
                    <div class="afce-tab active">Layouts</div>
                    <div class="afce-tab">Validations</div>
                    <div class="afce-tab">Features</div>
                    <div class="afce-tab">By Country</div>
                    <div class="afce-tab">JSON</div>
                    <button id="afce-publish-button"><i class="fas fa-upload"></i> Publish Configuration</button>
                </div>
                <div id="afce-content">
                </div>
            </div>
        `;

        inputModalOverlay.innerHTML = `
            <div id="afce-input-modal">
                <div id="afce-input-header">
                    <h3><i class="fas fa-edit"></i> Input</h3>
                    <button id="afce-input-close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div id="afce-input-content">
                </div>
            </div>
        `;

        confirmModalOverlay.innerHTML = `
            <div id="afce-confirm-modal">
                <div id="afce-confirm-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Confirm Action</h3>
                    <button id="afce-confirm-close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div id="afce-confirm-content">
                </div>
                <div id="afce-confirm-footer">
                    <button id="afce-confirm-yes-button" class="afce-button danger"><i class="fas fa-check"></i> Yes</button>
                    <button id="afce-confirm-no-button" class="afce-button secondary"><i class="fas fa-times"></i> No</button>
                </div>
            </div>
        `;

        modalOverlay.querySelector('#afce-close-btn').addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });

        inputModalOverlay.querySelector('#afce-input-close-btn').addEventListener('click', hideInputModal);

        confirmModalOverlay.querySelector('#afce-confirm-close-btn').addEventListener('click', hideConfirmModal);

        window.addEventListener('click', (event) => {
            if (event.target == modalOverlay) {
                modalOverlay.style.display = 'none';
            }
            if (event.target == inputModalOverlay) {
                hideInputModal();
            }
            if (event.target == confirmModalOverlay) {
                hideConfirmModal();
            }
        });

        const tabs = modalOverlay.querySelectorAll('.afce-tab');
        const sections = {
            'layouts': createLayoutsSection(),
            'validations': createValidationsSection(),
            'features': createFeaturesSection(),
            'by-country': createByCountrySection(),
            'json': createJsonSection(fullData)
        };

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                modalOverlay.querySelectorAll('.afce-section').forEach(section => section.classList.remove('active'));
                const sectionName = tab.textContent.toLowerCase().replace(' ', '-');
                const targetSection = document.getElementById(`afce-section-${sectionName}`);
                if (sectionName === 'json') {
                    updateJsonSection(targetSection, fullData);
                }
                targetSection.classList.add('active');
            });
        });

        const contentContainer = modalOverlay.querySelector('#afce-content');
        for(const [id, section] of Object.entries(sections)) {
            contentContainer.appendChild(section);
        }

        const publishButton = modalOverlay.querySelector('#afce-publish-button');
publishButton.addEventListener('click', () => {
    publishConfig(fullData);
});

        function showInputModal(title, contentHTML, onSubmit) {
            const inputHeader = inputModalOverlay.querySelector('#afce-input-header h3');
            inputHeader.innerHTML = `<i class="fas fa-edit"></i> ${title}`;
            const inputContent = inputModalOverlay.querySelector('#afce-input-content');
            inputContent.innerHTML = contentHTML;
            inputModalOverlay.style.display = 'flex';
            const submitButton = inputContent.querySelector('#afce-input-submit-btn');
            if (submitButton) {
                submitButton.addEventListener('click', () => {
                    const data = onSubmit();
                    if (data !== null) {
                        inputModalOverlay.style.display = 'none';
                    }
                });
            }
        }

        function hideInputModal() {
            inputModalOverlay.style.display = 'none';
        }

        function showConfirmModal(message, onConfirm) {
            const confirmContent = confirmModalOverlay.querySelector('#afce-confirm-content');
            confirmContent.textContent = message;
            confirmModalOverlay.style.display = 'flex';
            const confirmYesButton = confirmModalOverlay.querySelector('#afce-confirm-yes-button');
            const confirmNoButton = confirmModalOverlay.querySelector('#afce-confirm-no-button');
            confirmYesButton.replaceWith(confirmYesButton.cloneNode(true));
            confirmNoButton.replaceWith(confirmNoButton.cloneNode(true));
            const newConfirmYesButton = confirmModalOverlay.querySelector('#afce-confirm-yes-button');
            const newConfirmNoButton = confirmModalOverlay.querySelector('#afce-confirm-no-button');
            newConfirmYesButton.addEventListener('click', () => {
                onConfirm();
                hideConfirmModal();
            });
            newConfirmNoButton.addEventListener('click', hideConfirmModal);
        }

        function hideConfirmModal() {
            confirmModalOverlay.style.display = 'none';
        }

        function getAvailableFields() {
            return ['ADDRESS_LINE','APARTMENT_NUMBER','CARE_OF','CITY','COMPANY_NAME','EMAIL','FIRST_NAME','FLOOR','LAST_NAME','NAME','NATIONAL_IDENTIFICATION_NUMBER','PHONE_NUMBER','POSTAL_CODE','REGION','STREET','STREET_NUMBER','SUBREGION','VAT'];
        }

        /* ------------------- Layouts Section ------------------- */

        function createLayoutsSection() {
            const section = document.createElement('div');
            section.id = 'afce-section-layouts';
            section.className = 'afce-section active';

            const addBtn = document.createElement('button');
            addBtn.className = 'afce-button';
            addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Layout';
            addBtn.addEventListener('click', () => {
                openAddLayoutModal();
            });

            section.appendChild(addBtn);
            section.appendChild(document.createElement('hr'));

            const table = createLayoutsTable();
            section.appendChild(table);

            return section;
        }

        function createLayoutsTable() {
            const table = document.createElement('table');
            table.className = 'afce-table';
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th style="width: 15%;"><i class="fas fa-th"></i> Layout Name</th>
                    <th style="width: 60%;"><i class="fas fa-list"></i> Fields</th>
                    <th style="width: 25%;"><i class="fas fa-tools"></i> Actions</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');

            for(const [layoutName, layout] of Object.entries(window.afceConfig.layouts)) {
                const tr = document.createElement('tr');

                const tdName = document.createElement('td');
                tdName.textContent = layoutName;
                tr.appendChild(tdName);

                const tdFields = document.createElement('td');
                tdFields.textContent = layout.fields.map(f => `${f.name} (span: ${f.span})`).join(', ');
                tr.appendChild(tdFields);

                const tdActions = document.createElement('td');
                const editBtn = document.createElement('button');
                editBtn.className = 'afce-button secondary';
                editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
                editBtn.addEventListener('click', () => {
                    editLayout(layoutName);
                });

                const copyBtn = document.createElement('button');
                copyBtn.className = 'afce-button';
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Clone';
                copyBtn.style.backgroundColor = '#17a2b8';
                copyBtn.style.marginRight = '5px';
                copyBtn.addEventListener('click', () => {
                    copyCreateLayout(layoutName);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'afce-button danger';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
                deleteBtn.addEventListener('click', () => {
                    showConfirmModal(`Are you sure you want to delete layout "${layoutName}"?`, () => {
                        delete window.afceConfig.layouts[layoutName];
                        renderLayoutsTable(document.getElementById('afce-section-layouts'));
                        showNotification('Layout deleted successfully.');
                    });
                });

                tdActions.appendChild(editBtn);
                tdActions.appendChild(copyBtn);
                tdActions.appendChild(deleteBtn);
                tr.appendChild(tdActions);

                tbody.appendChild(tr);
            }

            table.appendChild(tbody);
            return table;
        }

        function renderLayoutsTable(section) {
            const existingTable = section.querySelector('table.afce-table');
            if(existingTable) existingTable.remove();
            const table = createLayoutsTable();
            section.appendChild(table);
        }

function openAddLayoutModal(existingLayout = null) {
    // Get all available fields from your system.
    const allFields = getAvailableFields();
    let previewFields = [];
    let inactiveFields = [];

    if (existingLayout) {
        previewFields = existingLayout.fields.map(f => ({ ...f }));
        const activeNames = previewFields.map(f => f.name);
        inactiveFields = allFields.filter(f => !activeNames.includes(f));
    } else {
        previewFields = [];
        inactiveFields = [...allFields];
    }

    const contentHTML = `
        <div class="afce-form-group">
            <label for="afce-new-layout-name">Layout Name:</label>
            <input type="text" id="afce-new-layout-name" placeholder="Enter layout name (alphanumeric, _, -)" class="afce-layout-box" />
        </div>
        <div style="display: flex; gap: 20px; margin-top: 10px;">
            <div id="activePreviewContainer" style="flex: 2; border: 1px solid #ccc; padding: 10px;">
                <h4>Active Fields Preview</h4>
                <div id="layoutPreview" style="min-height: 40px; display: flex; flex-wrap: wrap;">
                    <!-- Active fields preview goes here -->
                </div>
            </div>
            <div id="inactiveContainer" style="flex: 1; border: 1px solid #ccc; padding: 10px;">
                <h4>Inactive Fields</h4>
                <div id="inactiveFieldsList">
                    ${inactiveFields.map(field => `
                        <div class="inactive-field-item" data-field-name="${field}" style="padding: 5px; border: 1px solid #ddd; margin-bottom: 5px; cursor: move;" title="${field}">
                            ${field}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        <button id="afce-input-submit-btn" class="afce-button" style="margin-top: 15px;">
            <i class="fas fa-save"></i> ${existingLayout ? 'Save Layout Copy' : 'Save Layout'}
        </button>
    `;

    showInputModal(existingLayout ? 'Clone Layout' : 'Add New Layout', contentHTML, function() {
        const layoutName = document.getElementById('afce-new-layout-name').value.trim();
        if (!layoutName || !/^[a-zA-Z0-9_-]+$/.test(layoutName)) {
            showNotification('Invalid layout name. Use only alphanumeric characters, underscores, or hyphens.', 'danger');
            return null;
        }
        if (window.afceConfig.layouts[layoutName]) {
            showNotification('Layout name already exists.', 'danger');
            return null;
        }
        const updatedFields = getActivePreviewFields();
        if (updatedFields.length === 0) {
            showNotification('Add at least one bloody field, you muppet!', 'danger');
            return null;
        }
        window.afceConfig.layouts[layoutName] = { fields: updatedFields };
        renderLayoutsTable(document.getElementById('afce-section-layouts'));
        showNotification('Layout added successfully, you legend!');
        return {};
    });

    function getActivePreviewFields() {
        const preview = document.getElementById('layoutPreview');
        let fields = [];
        preview.querySelectorAll('.form-field').forEach(div => {
            const name = div.getAttribute('data-field-name');
            const span = parseInt(div.getAttribute('data-span'), 10) || 1;
            let fieldObj = { name, span };
            const toggle = div.querySelector('.field-toggle');
            if (toggle && toggle.checked) {
                fieldObj.type = name === 'ADDRESS_LINE' ? "OPTIONAL_ADDRESS_LINE_STREET_NUMBER" : "SEARCHABLE";
            }
            fields.push(fieldObj);
        });
        return fields;
    }

function renderPreview() {
    const preview = document.getElementById('layoutPreview');
    if (!preview) return;
    preview.innerHTML = '';
    preview.style.display = 'flex';
    preview.style.flexWrap = 'wrap';
    preview.style.gap = '0px';
    preview.style.minHeight = '40px';

    previewFields.forEach((field, index) => {
        // Force ADDRESS_LINE to always be 12 columns
        if (field.name === "ADDRESS_LINE") {
            field.span = 12;
        }

        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-field';
        fieldDiv.style.position = 'relative';
        fieldDiv.style.flex = `0 0 ${(field.span / 12) * 100}%`;
        fieldDiv.style.minWidth = '0';
        fieldDiv.style.overflow = 'hidden';
        fieldDiv.style.whiteSpace = 'nowrap';
        fieldDiv.style.lineHeight = '1.2';
        fieldDiv.style.border = '1px solid #aaa';
        fieldDiv.style.padding = '5px';
        fieldDiv.style.boxSizing = 'border-box';
        fieldDiv.setAttribute('data-index', index);
        fieldDiv.setAttribute('data-span', field.span);
        fieldDiv.setAttribute('data-field-name', field.name);
        fieldDiv.title = field.name;

        let innerHTML = `<span>${field.name}</span>`;
        if (field.name === "ADDRESS_LINE") {
            // Render the checkbox and fixed span in a flex container
            innerHTML += `<div style="display: flex; align-items: center; justify-content: space-between;">
                <div class="field-toggle-container" style="font-size: 10px; margin-top: 0;">
                    <label title="Optional Street">
                        <input type="checkbox" class="field-toggle" ${field.type ? 'checked' : ''}>
                        Optional Street
                    </label>
                </div>
                <span style="font-size: 10px; white-space: nowrap;">(fixed)</span>
            </div>`;
        } else {
            if (['REGION'].includes(field.name)) {
                innerHTML += `<div class="field-toggle-container" style="font-size: 10px; margin-top: 0;">
                    <label title="Search Dropdown">
                        <input type="checkbox" class="field-toggle" ${field.type ? 'checked' : ''}>
                        Search Dropdown
                    </label>
                </div>`;
            }
            innerHTML += `<div class="resize-handle" style="position: absolute; top: 0; right: 0; bottom: 0; width: 10px; cursor: ew-resize; background: #ddd;"></div>`;
        }
        fieldDiv.innerHTML = innerHTML;
        preview.appendChild(fieldDiv);

        // For ADDRESS_LINE, bind an event listener to persist the checkbox state
        if (field.name === "ADDRESS_LINE") {
            const checkbox = fieldDiv.querySelector('.field-toggle');
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    field.type = checkbox.checked ? "OPTIONAL_ADDRESS_LINE_STREET_NUMBER" : null;
                });
            }
        }
    });

    setupResizeHandlers();
    setupCombinedActiveSortable();
}

    function setupCombinedActiveSortable() {
        const preview = document.getElementById('layoutPreview');
        if (!preview) return;
        if (preview.sortableInstance) {
            preview.sortableInstance.destroy();
        }
preview.sortableInstance = new Sortable(preview, {
    draggable: '.form-field',
    group: {
        name: 'shared',
        pull: true,
        put: true
    },
    animation: 150,
    fallbackOnBody: true,
    ghostClass: 'dragging-field', // Added visual cue for dragged field
    onEnd: function(evt) {
        const items = preview.querySelectorAll('.form-field');
        const newOrder = Array.from(items).map(item => item.getAttribute('data-field-name'));
        previewFields.sort((a, b) => newOrder.indexOf(a.name) - newOrder.indexOf(b.name));
        renderPreview();
    },
    onAdd: function(evt) {
        const fieldName = evt.item.getAttribute('data-field-name');
        if (fieldName) {
            previewFields.splice(evt.newIndex, 0, { name: fieldName, span: 4 });
            evt.item.parentNode.removeChild(evt.item);
            setTimeout(() => {
                renderPreview();
                updateInactiveList();
            }, 0);
        }
    }
});
    }

    function setupResizeHandlers() {
        const handles = document.querySelectorAll('#layoutPreview .resize-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', initResize, false);
        });
    }

    let currentResizing = null, startX, startSpan, fieldDivResizing, rowWidth;
    function initResize(e) {
        e.preventDefault();
        fieldDivResizing = e.target.parentElement;
        currentResizing = fieldDivResizing;
        startX = e.clientX;
        startSpan = parseInt(fieldDivResizing.getAttribute('data-span'), 10);
        rowWidth = fieldDivResizing.parentElement.getBoundingClientRect().width;
        document.addEventListener('mousemove', performResize, false);
        document.addEventListener('mouseup', stopResize, false);
    }
    function performResize(e) {
        if (!currentResizing) return;
        const dx = e.clientX - startX;
        const colWidth = rowWidth / 12;
        let spanChange = Math.round(dx / colWidth);
        let newSpan = startSpan + spanChange;
        if (newSpan < 1) newSpan = 1;
        if (newSpan > 12) newSpan = 12;
        currentResizing.style.flex = `0 0 ${(newSpan / 12) * 100}%`;
        currentResizing.setAttribute('data-span', newSpan);
        const index = parseInt(currentResizing.getAttribute('data-index'), 10);
        previewFields[index].span = newSpan;
    }
    function stopResize(e) {
        document.removeEventListener('mousemove', performResize, false);
        document.removeEventListener('mouseup', stopResize, false);
        currentResizing = null;
        renderPreview();
    }

    function setupInactiveSortable() {
        const inactiveList = document.getElementById('inactiveFieldsList');
        if (!inactiveList) return;
        if (inactiveList.sortableInstance) {
            inactiveList.sortableInstance.destroy();
        }
        inactiveList.sortableInstance = new Sortable(inactiveList, {
            draggable: '.inactive-field-item',
            group: {
                name: 'shared',
                pull: true,
                put: true
            },
            animation: 150,
            onAdd: function(evt) {
                const fieldName = evt.item.getAttribute('data-field-name');
                const index = previewFields.findIndex(field => field.name === fieldName);
                if (index > -1) {
                    previewFields.splice(index, 1);
                }
                evt.item.parentNode.removeChild(evt.item);
                updateInactiveList();
                renderPreview();
            }
        });
    }

    function updateInactiveList() {
        const allFields = getAvailableFields();
        const activeNames = previewFields.map(f => f.name);
        const inactiveFields = allFields.filter(f => !activeNames.includes(f));
        const inactiveList = document.getElementById('inactiveFieldsList');
        if (!inactiveList) return;
        inactiveList.innerHTML = inactiveFields.map(field => `
            <div class="inactive-field-item" data-field-name="${field}" style="padding: 5px; border: 1px solid #ddd; margin-bottom: 5px; cursor: move;" title="${field}">
                ${field}
            </div>
        `).join('');
        setupInactiveSortable();
    }

    renderPreview();
    setupInactiveSortable();
}

function editLayout(layoutName) {
    const layout = window.afceConfig.layouts[layoutName];
    if (!layout) {
        showNotification("Layout not found.", "danger");
        return;
    }
    // Get all available fields from your system.
    const allFields = getAvailableFields();
    // Pre-populate active fields from the existing layout.
    let previewFields = layout.fields.map(f => ({ ...f }));
    // Inactive fields: all available fields not in active preview.
    let inactiveFields = allFields.filter(f => !previewFields.some(pf => pf.name === f));

    const contentHTML = `
        <div class="afce-form-group">
            <label for="afce-edit-layout-name">Layout Name:</label>
            <input type="text" id="afce-edit-layout-name" value="${layoutName}" disabled class="afce-layout-box" />
        </div>
        <div style="display: flex; gap: 20px; margin-top: 10px;">
            <div id="activePreviewContainer" style="flex: 2; border: 1px solid #ccc; padding: 10px;">
                <h4>Active Fields Preview</h4>
                <div id="layoutPreview">
                    <!-- Active fields preview goes here -->
                </div>
            </div>
            <div id="inactiveContainer" style="flex: 1; border: 1px solid #ccc; padding: 10px;">
                <h4>Inactive Fields</h4>
                <div id="inactiveFieldsList">
                    ${inactiveFields.map(field => `
                        <div class="inactive-field-item" data-field-name="${field}" style="padding: 5px; border: 1px solid #ddd; margin-bottom: 5px; cursor: move;" title="${field}">
                            ${field}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        <button id="afce-input-submit-btn" class="afce-button" style="margin-top: 15px;">
            <i class="fas fa-save"></i> Save Changes
        </button>
    `;

    showInputModal(`Edit Layout: ${layoutName}`, contentHTML, function() {
        const updatedFields = getActivePreviewFields();
        if (updatedFields.length === 0) {
            showNotification("Add at least one bloody field, you muppet!", "danger");
            return null;
        }
        window.afceConfig.layouts[layoutName].fields = updatedFields;
        renderLayoutsTable(document.getElementById('afce-section-layouts'));
        showNotification("Layout updated successfully, you legend!", "success");
        return {};
    });

    function getActivePreviewFields() {
        const preview = document.getElementById('layoutPreview');
        let fields = [];
        preview.querySelectorAll('.form-field').forEach(div => {
            const name = div.getAttribute('data-field-name');
            const span = parseInt(div.getAttribute('data-span'), 10) || 1;
            let fieldObj = { name, span };
            const toggle = div.querySelector('.field-toggle');
            if (toggle && toggle.checked) {
                fieldObj.type = name === 'ADDRESS_LINE' ? "OPTIONAL_ADDRESS_LINE_STREET_NUMBER" : "SEARCHABLE";
            }
            fields.push(fieldObj);
        });
        return fields;
    }

function renderPreview() {
    const preview = document.getElementById('layoutPreview');
    if (!preview) return;
    preview.innerHTML = '';
    preview.style.display = 'flex';
    preview.style.flexWrap = 'wrap';
    preview.style.gap = '0px';
    preview.style.minHeight = '40px';

    previewFields.forEach((field, index) => {
        // Force ADDRESS_LINE to always be 12 columns
        if (field.name === "ADDRESS_LINE") {
            field.span = 12;
        }

        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-field';
        fieldDiv.style.position = 'relative';
        fieldDiv.style.flex = `0 0 ${(field.span / 12) * 100}%`;
        fieldDiv.style.minWidth = '0';
        fieldDiv.style.overflow = 'hidden';
        fieldDiv.style.whiteSpace = 'nowrap';
        fieldDiv.style.lineHeight = '1.2';
        fieldDiv.style.border = '1px solid #aaa';
        fieldDiv.style.padding = '5px';
        fieldDiv.style.boxSizing = 'border-box';
        fieldDiv.setAttribute('data-index', index);
        fieldDiv.setAttribute('data-span', field.span);
        fieldDiv.setAttribute('data-field-name', field.name);
        fieldDiv.title = field.name;

        let innerHTML = `<span>${field.name}</span>`;
        if (field.name === "ADDRESS_LINE") {
            // Render the checkbox and fixed span in a flex container
            innerHTML += `<div style="display: flex; align-items: center; justify-content: space-between;">
                <div class="field-toggle-container" style="font-size: 10px; margin-top: 0;">
                    <label title="Optional Street">
                        <input type="checkbox" class="field-toggle" ${field.type ? 'checked' : ''}>
                        Optional Street
                    </label>
                </div>
                <span style="font-size: 10px; white-space: nowrap;">(fixed)</span>
            </div>`;
        } else {
            if (['REGION'].includes(field.name)) {
                innerHTML += `<div class="field-toggle-container" style="font-size: 10px; margin-top: 0;">
                    <label title="Search Dropdown">
                        <input type="checkbox" class="field-toggle" ${field.type ? 'checked' : ''}>
                        Search Dropdown
                    </label>
                </div>`;
            }
            innerHTML += `<div class="resize-handle" style="position: absolute; top: 0; right: 0; bottom: 0; width: 10px; cursor: ew-resize; background: #ddd;"></div>`;
        }
        fieldDiv.innerHTML = innerHTML;
        preview.appendChild(fieldDiv);

        // For ADDRESS_LINE, bind an event listener to persist the checkbox state
        if (field.name === "ADDRESS_LINE") {
            const checkbox = fieldDiv.querySelector('.field-toggle');
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    field.type = checkbox.checked ? "OPTIONAL_ADDRESS_LINE_STREET_NUMBER" : null;
                });
            }
        }
    });

    setupResizeHandlers();
    setupCombinedActiveSortable();
}

    function setupCombinedActiveSortable() {
        const preview = document.getElementById('layoutPreview');
        if (!preview) return;
        if (preview.sortableInstance) {
            preview.sortableInstance.destroy();
        }
preview.sortableInstance = new Sortable(preview, {
    draggable: '.form-field',
    group: {
        name: 'shared',
        pull: true,
        put: true
    },
    animation: 150,
    fallbackOnBody: true,
    ghostClass: 'dragging-field', // Added visual cue for dragged field
    onEnd: function(evt) {
        const items = preview.querySelectorAll('.form-field');
        const newOrder = Array.from(items).map(item => item.getAttribute('data-field-name'));
        previewFields.sort((a, b) => newOrder.indexOf(a.name) - newOrder.indexOf(b.name));
        renderPreview();
    },
    onAdd: function(evt) {
        const fieldName = evt.item.getAttribute('data-field-name');
        if (fieldName) {
            previewFields.splice(evt.newIndex, 0, { name: fieldName, span: 4 });
            evt.item.parentNode.removeChild(evt.item);
            setTimeout(() => {
                renderPreview();
                updateInactiveList();
            }, 0);
        }
    }
});
    }

    function setupResizeHandlers() {
        const handles = document.querySelectorAll('#layoutPreview .resize-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', initResize, false);
        });
    }

    let currentResizing = null, startX, startSpan, fieldDivResizing, rowWidth;
    function initResize(e) {
        e.preventDefault();
        fieldDivResizing = e.target.parentElement;
        currentResizing = fieldDivResizing;
        startX = e.clientX;
        startSpan = parseInt(fieldDivResizing.getAttribute('data-span'), 10);
        rowWidth = fieldDivResizing.parentElement.getBoundingClientRect().width;
        document.addEventListener('mousemove', performResize, false);
        document.addEventListener('mouseup', stopResize, false);
    }
    function performResize(e) {
        if (!currentResizing) return;
        const dx = e.clientX - startX;
        const colWidth = rowWidth / 12;
        let spanChange = Math.round(dx / colWidth);
        let newSpan = startSpan + spanChange;
        if (newSpan < 1) newSpan = 1;
        if (newSpan > 12) newSpan = 12;
        currentResizing.style.flex = `0 0 ${(newSpan / 12) * 100}%`;
        currentResizing.setAttribute('data-span', newSpan);
        const index = parseInt(currentResizing.getAttribute('data-index'), 10);
        previewFields[index].span = newSpan;
    }
    function stopResize(e) {
        document.removeEventListener('mousemove', performResize, false);
        document.removeEventListener('mouseup', stopResize, false);
        currentResizing = null;
        renderPreview();
    }

    function setupInactiveSortable() {
        const inactiveList = document.getElementById('inactiveFieldsList');
        if (!inactiveList) return;
        if (inactiveList.sortableInstance) {
            inactiveList.sortableInstance.destroy();
        }
        inactiveList.sortableInstance = new Sortable(inactiveList, {
            draggable: '.inactive-field-item',
            group: {
                name: 'shared',
                pull: true,
                put: true
            },
            animation: 150,
            onAdd: function(evt) {
                const fieldName = evt.item.getAttribute('data-field-name');
                const index = previewFields.findIndex(field => field.name === fieldName);
                if (index > -1) {
                    previewFields.splice(index, 1);
                }
                evt.item.parentNode.removeChild(evt.item);
                updateInactiveList();
                renderPreview();
            }
        });
    }

    function updateInactiveList() {
        const allFields = getAvailableFields();
        const activeNames = previewFields.map(f => f.name);
        const inactiveFields = allFields.filter(f => !activeNames.includes(f));
        const inactiveList = document.getElementById('inactiveFieldsList');
        if (!inactiveList) return;
        inactiveList.innerHTML = inactiveFields.map(field => `
            <div class="inactive-field-item" data-field-name="${field}" style="padding: 5px; border: 1px solid #ddd; margin-bottom: 5px; cursor: move;" title="${field}">
                ${field}
            </div>
        `).join('');
        setupInactiveSortable();
    }

    renderPreview();
    setupInactiveSortable();
}

        function copyCreateLayout(layoutName) {
            const existingLayout = window.afceConfig.layouts[layoutName];
            if (!existingLayout) {
                showNotification('Selected layout does not exist.', 'danger');
                return;
            }
            openAddLayoutModal(existingLayout);
        }

        /* ------------------- Validations Section ------------------- */

        function createValidationsSection() {
            const section = document.createElement('div');
            section.id = 'afce-section-validations';
            section.className = 'afce-section';

            const addBtn = document.createElement('button');
            addBtn.className = 'afce-button';
            addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Validation';
            addBtn.addEventListener('click', () => {
                openAddValidationModal();
            });

            section.appendChild(addBtn);
            section.appendChild(document.createElement('hr'));

            const table = createValidationsTable();
            section.appendChild(table);

            return section;
        }

        function createValidationsTable() {
            const table = document.createElement('table');
            table.className = 'afce-table';
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th style="width: 15%;"><i class="fas fa-shield-alt"></i> Validation Name</th>
                    <th style="width: 60%;"><i class="fas fa-check-circle"></i> Rules</th>
                    <th style="width: 25%;"><i class="fas fa-tools"></i> Actions</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');

            for (const [validationName, validation] of Object.entries(window.afceConfig.validations)) {
                const tr = document.createElement('tr');

                const tdName = document.createElement('td');
                tdName.textContent = validationName;
                tr.appendChild(tdName);

                const tdRules = document.createElement('td');
                const rules = [];

                if (validation.required) {
                    validation.required.forEach(req => {
                        rules.push(`Required Fields: ${req.fields.join(', ')}`);
                    });
                }

                if (validation.length) {
                    validation.length.forEach(len => {
                        const lenFields = len.fields.join(', ');
                        const min = len.min !== undefined ? `Min: ${len.min}` : '';
                        const max = len.max !== undefined ? `Max: ${len.max}` : '';
                        rules.push(`Length Validation on ${lenFields} ${min} ${max}`);
                    });
                }

                tdRules.innerHTML = rules.join('<br>');
                tr.appendChild(tdRules);

                const tdActions = document.createElement('td');
                const editBtn = document.createElement('button');
                editBtn.className = 'afce-button secondary';
                editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
                editBtn.addEventListener('click', () => {
                    editValidation(validationName);
                });

                const copyBtn = document.createElement('button');
                copyBtn.className = 'afce-button';
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Clone';
                copyBtn.style.backgroundColor = '#17a2b8';
                copyBtn.style.marginRight = '5px';
                copyBtn.addEventListener('click', () => {
                    copyCreateValidation(validationName);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'afce-button danger';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
                deleteBtn.addEventListener('click', () => {
                    showConfirmModal(`Are you sure you want to delete validation "${validationName}"?`, () => {
                        delete window.afceConfig.validations[validationName];
                        renderValidationsTable(document.getElementById('afce-section-validations'));
                        showNotification('Validation deleted successfully.');
                    });
                });

                tdActions.appendChild(editBtn);
                tdActions.appendChild(copyBtn);
                tdActions.appendChild(deleteBtn);
                tr.appendChild(tdActions);

                tbody.appendChild(tr);
            }

            table.appendChild(tbody);
            return table;
        }

        function renderValidationsTable(section) {
            const existingTable = section.querySelector('table.afce-table');
            if (existingTable) existingTable.remove();
            const table = createValidationsTable();
            section.appendChild(table);
        }

        function openAddValidationModal(existingValidation = null) {
            const fields = getAvailableFields();

            let requiredFields = [];
            let lengthValidations = [];

            if (existingValidation) {
                requiredFields = existingValidation.required ? existingValidation.required.reduce((acc, req) => acc.concat(req.fields), []) : [];
                lengthValidations = existingValidation.length || [];
            }

            let fieldRowsHTML = fields.map(field => {
                const isRequired = existingValidation && requiredFields.includes(field);
                const lengthRule = existingValidation && lengthValidations.find(len => len.fields.includes(field));
                const min = lengthRule && lengthRule.min !== undefined ? lengthRule.min : '';
                const max = lengthRule && lengthRule.max !== undefined ? lengthRule.max : '';
                return `
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                        <label>
                            <input type="checkbox" value="${field}" ${isRequired ? 'checked' : ''} />
                            ${field}
                        </label>
                        <input type="number" min="1" max="300" placeholder="Min" class="afce-validation-min" style="width: 60px;" value="${min}" />
                        <input type="number" min="1" max="300" placeholder="Max" class="afce-validation-max" style="width: 60px;" value="${max}" />
                    </div>
                `;
            }).join('');

            const contentHTML = `
                <div class="afce-form-group">
                    <label for="afce-new-validation-name">Validation Name:</label>
                    <input type="text" id="afce-new-validation-name" placeholder="Enter validation name (alphanumeric, _, -)" class="afce-validation-box" ${existingValidation ? 'value=""' : ''}/>
                </div>
                <div class="afce-form-group">
                    <label>Validation Rules:</label>
                    <div class="afce-two-column-container">
                        ${fieldRowsHTML}
                    </div>
                </div>
                <button id="afce-input-submit-btn" class="afce-button"><i class="fas fa-save"></i> ${existingValidation ? 'Save Validation Copy' : 'Save Validation'}</button>
            `;

            showInputModal(existingValidation ? 'Clone Validation' : 'Add New Validation', contentHTML, () => {
                const validationName = document.getElementById('afce-new-validation-name').value.trim();
                if (!validationName || !/^[a-zA-Z0-9_-]+$/.test(validationName)) {
                    showNotification('Invalid validation name. Use only alphanumeric characters, underscores, or hyphens.', 'danger');
                    return null;
                }
                if (window.afceConfig.validations[validationName]) {
                    showNotification('Validation name already exists.', 'danger');
                    return null;
                }

                const fieldContainers = Array.from(document.querySelectorAll('#afce-input-content .afce-two-column-container > div'));
                const requiredFields = [];
                const lengthValidations = [];

                let hasInvalidInput = false;

                fieldContainers.forEach(container => {
                    const checkbox = container.querySelector('input[type="checkbox"]');
                    const fieldName = checkbox.value;
                    const minInput = container.querySelector('.afce-validation-min');
                    const maxInput = container.querySelector('.afce-validation-max');

                    if (checkbox.checked) {
                        requiredFields.push(fieldName);
                    }

                    const minValue = minInput.value.trim();
                    const maxValue = maxInput.value.trim();
                    let min = undefined;
                    let maxV = undefined;

                    if (minValue !== '') {
                        min = parseInt(minValue, 10);
                        if (isNaN(min) || min < 1 || min > 300) {
                            hasInvalidInput = true;
                        }
                    }

                    if (maxValue !== '') {
                        maxV = parseInt(maxValue, 10);
                        if (isNaN(maxV) || maxV < 1 || maxV > 300) {
                            hasInvalidInput = true;
                        }
                    }

                    if (min !== undefined && maxV !== undefined && min > maxV) {
                        hasInvalidInput = true;
                    }

                    if (min !== undefined || maxV !== undefined) {
                        const lengthValidation = { fields: [fieldName] };
                        if (min !== undefined) lengthValidation.min = min;
                        if (maxV !== undefined) lengthValidation.max = maxV;
                        lengthValidations.push(lengthValidation);
                    }
                });

                if (hasInvalidInput) {
                    showNotification('Please ensure all min and max values are valid and min ≤ max.', 'danger');
                    return null;
                }

                const newValidation = {};
                if (requiredFields.length > 0) {
                    newValidation.required = [{ fields: requiredFields }];
                }
                if (lengthValidations.length > 0) {
                    newValidation.length = lengthValidations;
                }

                if (Object.keys(newValidation).length === 0) {
                    showNotification('Please add at least one validation rule.', 'danger');
                    return null;
                }

                window.afceConfig.validations[validationName] = newValidation;
                renderValidationsTable(document.getElementById('afce-section-validations'));
                showNotification(existingValidation ? 'Validation copied and added successfully.' : 'Validation added successfully.');
                return {};
            });
        }

        function editValidation(validationName) {
            const validation = window.afceConfig.validations[validationName];
            const fields = getAvailableFields();

            const requiredFields = validation.required ? validation.required.reduce((acc, req) => acc.concat(req.fields), []) : [];
            const lengthValidations = validation.length || [];

            const contentHTML = `
                <div class="afce-form-group">
                    <label for="afce-edit-validation-name">Validation Name:</label>
                    <input type="text" id="afce-edit-validation-name" value="${validationName}" disabled class="afce-validation-box" />
                </div>
                <div class="afce-form-group">
                    <label>Validation Rules:</label>
                    <div class="afce-two-column-container">
                        ${fields.map(field => {
                            const isRequired = requiredFields.includes(field);
                            const lengthRule = lengthValidations.find(lenVal => lenVal.fields.includes(field));
                            const min = lengthRule && lengthRule.min !== undefined ? lengthRule.min : '';
                            const max = lengthRule && lengthRule.max !== undefined ? lengthRule.max : '';
                            return `
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                                    <label>
                                        <input type="checkbox" value="${field}" ${isRequired ? 'checked' : ''} />
                                        ${field}
                                    </label>
                                    <input type="number" min="1" max="300" placeholder="Min" class="afce-validation-min" style="width: 60px;" value="${min}" />
                                    <input type="number" min="1" max="300" placeholder="Max" class="afce-validation-max" style="width: 60px;" value="${max}" />
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <button id="afce-input-submit-btn" class="afce-button"><i class="fas fa-save"></i> Save Changes</button>
            `;

            showInputModal(`Edit Validation: ${validationName}`, contentHTML, () => {
                const fieldContainers = Array.from(document.querySelectorAll('#afce-input-content .afce-two-column-container > div'));
                const requiredFields = [];
                const lengthValidations = [];

                let hasInvalidInput = false;

                fieldContainers.forEach(container => {
                    const checkbox = container.querySelector('input[type="checkbox"]');
                    const fieldName = checkbox.value;
                    const minInput = container.querySelector('.afce-validation-min');
                    const maxInput = container.querySelector('.afce-validation-max');

                    if (checkbox.checked) {
                        requiredFields.push(fieldName);
                    }

                    const minValue = minInput.value.trim();
                    const maxValue = maxInput.value.trim();
                    let min = undefined;
                    let maxV = undefined;

                    if (minValue !== '') {
                        min = parseInt(minValue, 10);
                        if (isNaN(min) || min < 1 || min > 300) {
                            hasInvalidInput = true;
                        }
                    }

                    if (maxValue !== '') {
                        maxV = parseInt(maxValue, 10);
                        if (isNaN(maxV) || maxV < 1 || maxV > 300) {
                            hasInvalidInput = true;
                        }
                    }

                    if (min !== undefined && maxV !== undefined && min > maxV) {
                        hasInvalidInput = true;
                    }

                    if (min !== undefined || maxV !== undefined) {
                        const lengthValidation = { fields: [fieldName] };
                        if (min !== undefined) lengthValidation.min = min;
                        if (maxV !== undefined) lengthValidation.max = maxV;
                        lengthValidations.push(lengthValidation);
                    }
                });

                if (hasInvalidInput) {
                    showNotification('Please ensure all min and max values are valid and min ≤ max.', 'danger');
                    return null;
                }

                const updatedValidation = {};
                if (requiredFields.length > 0) {
                    updatedValidation.required = [{ fields: requiredFields }];
                }
                if (lengthValidations.length > 0) {
                    updatedValidation.length = lengthValidations;
                }

                if (Object.keys(updatedValidation).length === 0) {
                    showNotification('Please add at least one validation rule.', 'danger');
                    return null;
                }

                window.afceConfig.validations[validationName] = updatedValidation;
                renderValidationsTable(document.getElementById('afce-section-validations'));
                showNotification('Validation updated successfully.');
                return {};
            });

            setTimeout(() => {
                const checkboxes = document.querySelectorAll('#afce-input-content .afce-two-column-container input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.addEventListener('change', () => {
                        const spanInputs = cb.parentElement.parentElement.querySelectorAll('.afce-validation-min, .afce-validation-max');
                    });
                });
            }, 100);
        }

        function copyCreateValidation(validationName) {
            const existingValidation = window.afceConfig.validations[validationName];
            if (!existingValidation) {
                showNotification('Selected validation does not exist.', 'danger');
                return;
            }
            openAddValidationModal(existingValidation);
        }

        /* ------------------- Features Section ------------------- */

        function createFeaturesSection() {
            const section = document.createElement('div');
            section.id = 'afce-section-features';
            section.className = 'afce-section';

            const addBtn = document.createElement('button');
            addBtn.className = 'afce-button';
            addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Feature';
            addBtn.addEventListener('click', () => {
                openAddFeatureModal();
            });

            section.appendChild(addBtn);
            section.appendChild(document.createElement('hr'));

            const table = createFeaturesTable();
            section.appendChild(table);

            return section;
        }

        function createFeaturesTable() {
            const table = document.createElement('table');
            table.className = 'afce-table';
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th><i class="fas fa-cogs"></i> Feature Name</th>
                    <th><i class="fas fa-sliders-h"></i> Settings</th>
                    <th style="width: 25%;"><i class="fas fa-tools"></i> Actions</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');

            for(const [featureName, settings] of Object.entries(window.afceConfig.features)) {
                const tr = document.createElement('tr');

                const tdName = document.createElement('td');
                tdName.textContent = featureName;
                tr.appendChild(tdName);

                const tdSettings = document.createElement('td');
                tdSettings.textContent = JSON.stringify(settings);
                tr.appendChild(tdSettings);

                const tdActions = document.createElement('td');
                const editBtn = document.createElement('button');
                editBtn.className = 'afce-button secondary';
                editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
                editBtn.addEventListener('click', () => {
                    editFeature(featureName);
                });

                const copyBtn = document.createElement('button');
                copyBtn.className = 'afce-button';
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Clone';
                copyBtn.style.backgroundColor = '#17a2b8';
                copyBtn.style.marginRight = '5px';
                copyBtn.addEventListener('click', () => {
                    copyCreateFeature(featureName);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'afce-button danger';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
                deleteBtn.addEventListener('click', () => {
                    showConfirmModal(`Are you sure you want to delete feature "${featureName}"?`, () => {
                        delete window.afceConfig.features[featureName];
                        renderFeaturesTable(document.getElementById('afce-section-features'));
                        showNotification('Feature deleted successfully.');
                    });
                });

                tdActions.appendChild(editBtn);
                tdActions.appendChild(copyBtn);
                tdActions.appendChild(deleteBtn);
                tr.appendChild(tdActions);

                tbody.appendChild(tr);
            }

            table.appendChild(tbody);
            return table;
        }

        function renderFeaturesTable(section) {
            const existingTable = section.querySelector('table.afce-table');
            if(existingTable) existingTable.remove();
            const table = createFeaturesTable();
            section.appendChild(table);
        }

        function openAddFeatureModal(existingFeature = null) {
            const contentHTML = `
                <div class="afce-form-group">
                    <label for="afce-new-feature-name">Feature Name:</label>
                    <input type="text" id="afce-new-feature-name" placeholder="Enter feature name (alphanumeric, _, -)" class="afce-feature-box" ${existingFeature ? 'value=""' : ''}/>
                </div>
                <div class="afce-form-group">
                    <label>Settings:</label>
                    <div class="afce-checkbox-group">
                        <label><input type="checkbox" value="show_billing_address" ${existingFeature && existingFeature.show_billing_address ? 'checked' : ''} /> Show Billing Address</label>
                        <label><input type="checkbox" value="hide_address_book" ${existingFeature && existingFeature.hide_address_book ? 'checked' : ''} /> Hide Address Book</label>
                    </div>
                </div>
                <div class="afce-form-group">
                    <label for="afce-autocomplete-provider">Autocomplete Provider:</label>
                    <select id="afce-autocomplete-provider">
                        <option value="">Default</option>
                        <option value="GOOGLE" ${existingFeature && existingFeature.autocomplete_provider === 'GOOGLE' ? 'selected' : ''}>GOOGLE</option>
                        <option value="GEPOSIT" ${existingFeature && existingFeature.autocomplete_provider === 'GEPOSIT' ? 'selected' : ''}>GEPOSIT</option>
                        <option value="LOQATE" ${existingFeature && existingFeature.autocomplete_provider === 'LOQATE' ? 'selected' : ''}>LOQATE</option>
                    </select>
                </div>
                <div class="afce-form-group">
                    <label for="afce-suggestion-provider">Suggestion Provider:</label>
                    <select id="afce-suggestion-provider">
                        <option value="">Default</option>
                        <option value="GOOGLE" ${existingFeature && existingFeature.suggestion_provider === 'GOOGLE' ? 'selected' : ''}>GOOGLE</option>
                        <option value="NO_PROVIDER" ${existingFeature && existingFeature.suggestion_provider === 'NO_PROVIDER' ? 'selected' : ''}>NO_PROVIDER</option>
                    </select>
                </div>
                <div class="afce-form-group">
                    <label for="afce-address-book-provider">Address Book Provider:</label>
                    <select id="afce-address-book-provider">
                        <option value="">Default</option>
                        <option value="INGRID" ${existingFeature && existingFeature.address_book_provider === 'INGRID' ? 'selected' : ''}>INGRID</option>
                        <option value="HM" ${existingFeature && existingFeature.address_book_provider === 'HM' ? 'selected' : ''}>HM</option>
                        <option value="HM_V2" ${existingFeature && existingFeature.address_book_provider === 'HM_V2' ? 'selected' : ''}>HM_V2</option>
                    </select>
                </div>
                <div class="afce-form-group">
                    <label>Frozen Fields After Prefill:</label>
                    <div class="afce-checkbox-group">
                        ${getAvailableFields().map(field => `
                            <label><input type="checkbox" value="${field}" ${existingFeature && existingFeature.frozen_fields_after_prefill && existingFeature.frozen_fields_after_prefill.fields.includes(field) ? 'checked' : ''} /> ${field}</label>
                        `).join('')}
                    </div>
                </div>
                <button id="afce-input-submit-btn" class="afce-button"><i class="fas fa-save"></i> ${existingFeature ? 'Save Feature Copy' : 'Save Feature'}</button>
            `;

            showInputModal(existingFeature ? 'Clone Feature' : 'Add New Feature', contentHTML, () => {
                const featureName = document.getElementById('afce-new-feature-name').value.trim();
                if(!featureName || !/^[a-zA-Z0-9_-]+$/.test(featureName)) {
                    showNotification('Invalid feature name. Use only alphanumeric characters, underscores, or hyphens.', 'danger');
                    return null;
                }
                if(window.afceConfig.features[featureName]) {
                    showNotification('Feature name already exists.', 'danger');
                    return null;
                }

                const selectedSettings = Array.from(document.querySelectorAll('#afce-input-content .afce-checkbox-group input[type="checkbox"]:checked'))
                                        .filter(cb => ['show_billing_address', 'hide_address_book'].includes(cb.value))
                                        .map(cb => cb.value);
                const autocompleteProvider = document.getElementById('afce-autocomplete-provider').value || undefined;
                const suggestionProvider = document.getElementById('afce-suggestion-provider').value || undefined;
                const addressBookProvider = document.getElementById('afce-address-book-provider').value || undefined;
                const frozenFields = Array.from(document.querySelectorAll('#afce-input-content .afce-checkbox-group input[type="checkbox"]:checked'))
                                      .filter(cb => cb.closest('.afce-form-group').querySelector('label').textContent.includes('Frozen Fields'))
                                      .map(cb => cb.value);

                const newFeature = {};
                selectedSettings.forEach(setting => {
                    if(setting === 'show_billing_address') {
                        newFeature.show_billing_address = true;
                    }
                    if(setting === 'hide_address_book') {
                        newFeature.hide_address_book = true;
                    }
                });
                if(autocompleteProvider) newFeature.autocomplete_provider = autocompleteProvider;
                if(suggestionProvider) newFeature.suggestion_provider = suggestionProvider;
                if(addressBookProvider) newFeature.address_book_provider = addressBookProvider;
                if(frozenFields.length > 0) newFeature.frozen_fields_after_prefill = { "fields": frozenFields };

                window.afceConfig.features[featureName] = newFeature;
                renderFeaturesTable(document.getElementById('afce-section-features'));
                showNotification(existingFeature ? 'Feature copied and added successfully.' : 'Feature added successfully.');
                return {};
            });
        }

        function editFeature(featureName) {
            const settings = window.afceConfig.features[featureName];
            const availableFields = getAvailableFields();

            const frozenFields = settings.frozen_fields_after_prefill ? settings.frozen_fields_after_prefill.fields : [];

            const contentHTML = `
                <div class="afce-form-group">
                    <label for="afce-edit-feature-name">Feature Name:</label>
                    <input type="text" id="afce-edit-feature-name" value="${featureName}" disabled class="afce-feature-box" />
                </div>
                <div class="afce-form-group">
                    <label>Settings:</label>
                    <div class="afce-checkbox-group">
                        <label><input type="checkbox" value="show_billing_address" ${settings.show_billing_address ? 'checked' : ''} /> Show Billing Address</label>
                        <label><input type="checkbox" value="hide_address_book" ${settings.hide_address_book ? 'checked' : ''} /> Hide Address Book</label>
                    </div>
                </div>
                <div class="afce-form-group">
                    <label for="afce-edit-autocomplete-provider">Autocomplete Provider:</label>
                    <select id="afce-edit-autocomplete-provider">
                        <option value="">Default</option>
                        <option value="GOOGLE" ${settings.autocomplete_provider === 'GOOGLE' ? 'selected' : ''}>GOOGLE</option>
                        <option value="GEPOSIT" ${settings.autocomplete_provider === 'GEPOSIT' ? 'selected' : ''}>GEPOSIT</option>
                        <option value="LOQATE" ${settings.autocomplete_provider === 'LOQATE' ? 'selected' : ''}>LOQATE</option>
                    </select>
                </div>
                <div class="afce-form-group">
                    <label for="afce-edit-suggestion-provider">Suggestion Provider:</label>
                    <select id="afce-edit-suggestion-provider">
                        <option value="">Default</option>
                        <option value="GOOGLE" ${settings.suggestion_provider === 'GOOGLE' ? 'selected' : ''}>GOOGLE</option>
                        <option value="NO_PROVIDER" ${settings.suggestion_provider === 'NO_PROVIDER' ? 'selected' : ''}>NO_PROVIDER</option>
                    </select>
                </div>
                <div class="afce-form-group">
                    <label for="afce-edit-address-book-provider">Address Book Provider:</label>
                    <select id="afce-edit-address-book-provider">
                        <option value="">Default</option>
                        <option value="INGRID" ${settings.address_book_provider === 'INGRID' ? 'selected' : ''}>INGRID</option>
                        <option value="HM" ${settings.address_book_provider === 'HM' ? 'selected' : ''}>HM</option>
                        <option value="HM_V2" ${settings.address_book_provider === 'HM_V2' ? 'selected' : ''}>HM_V2</option>
                    </select>
                </div>
                <div class="afce-form-group">
                    <label>Frozen Fields After Prefill:</label>
                    <div class="afce-checkbox-group">
                        ${availableFields.map(field => `
                            <label><input type="checkbox" value="${field}" ${frozenFields.includes(field) ? 'checked' : ''} /> ${field}</label>
                        `).join('')}
                    </div>
                </div>
                <button id="afce-input-submit-btn" class="afce-button"><i class="fas fa-save"></i> Save Changes</button>
            `;

            showInputModal(`Edit Feature: ${featureName}`, contentHTML, () => {
                const selectedSettings = Array.from(document.querySelectorAll('#afce-input-content .afce-checkbox-group input[type="checkbox"]:checked'))
                                          .filter(cb => ['show_billing_address', 'hide_address_book'].includes(cb.value))
                                          .map(cb => cb.value);
                const autocompleteProvider = document.getElementById('afce-edit-autocomplete-provider').value || undefined;
                const suggestionProvider = document.getElementById('afce-edit-suggestion-provider').value || undefined;
                const addressBookProvider = document.getElementById('afce-edit-address-book-provider').value || undefined;
                const frozenFields = Array.from(document.querySelectorAll('#afce-input-content .afce-checkbox-group input[type="checkbox"]:checked'))
                                      .filter(cb => cb.closest('.afce-form-group').querySelector('label').textContent.includes('Frozen Fields'))
                                      .map(cb => cb.value);

                const updatedSettings = {};
                selectedSettings.forEach(setting => {
                    if(setting === 'show_billing_address') {
                        updatedSettings.show_billing_address = true;
                    }
                    if(setting === 'hide_address_book') {
                        updatedSettings.hide_address_book = true;
                    }
                });
                if(autocompleteProvider) updatedSettings.autocomplete_provider = autocompleteProvider;
                if(suggestionProvider) updatedSettings.suggestion_provider = suggestionProvider;
                if(addressBookProvider) updatedSettings.address_book_provider = addressBookProvider;
                if(frozenFields.length > 0) updatedSettings.frozen_fields_after_prefill = { "fields": frozenFields };

                window.afceConfig.features[featureName] = updatedSettings;
                renderFeaturesTable(document.getElementById('afce-section-features'));
                showNotification('Feature updated successfully.');
                return {};
            });
        }

        function copyCreateFeature(featureName) {
            const existingFeature = window.afceConfig.features[featureName];
            if (!existingFeature) {
                showNotification('Selected feature does not exist.', 'danger');
                return;
            }
            openAddFeatureModal(existingFeature);
        }

        /* ------------------- By Country Section ------------------- */

        function createByCountrySection() {
            const section = document.createElement('div');
            section.id = 'afce-section-by-country';
            section.className = 'afce-section afce-section-by-country';

            const toggleContainer = document.createElement('div');
            toggleContainer.className = 'afce-toggle-container';
            toggleContainer.innerHTML = `
                <label for="afce-billing-toggle"><i class="fas fa-toggle-on"></i> Show Billing Columns:</label>
                <label class="afce-toggle-switch">
                    <input type="checkbox" id="afce-billing-toggle">
                    <span class="afce-toggle-slider"></span>
                </label>
            `;
            section.appendChild(toggleContainer);

            toggleContainer.querySelector('#afce-billing-toggle').addEventListener('change', (event) => {
                if(event.target.checked) {
                    section.classList.add('billing-columns-visible');
                } else {
                    section.classList.remove('billing-columns-visible');
                }
            });

            const addBtn = document.createElement('button');
            addBtn.className = 'afce-button';
            addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Country Configuration';
            addBtn.addEventListener('click', () => {
                addCountryRow();
            });

            section.appendChild(addBtn);
            section.appendChild(document.createElement('hr'));

            const tableWrapper = document.createElement('div');
            tableWrapper.style.overflowX = 'auto';
            tableWrapper.style.maxWidth = '100%';
            const table = createByCountryTable();
            tableWrapper.appendChild(table);
            section.appendChild(tableWrapper);

            return section;
        }

        function createByCountryTable() {
            const table = document.createElement('table');
            table.className = 'afce-table';
            const thead = document.createElement('thead');
            thead.innerHTML = `
        <tr>
            <th style="width: 10%;"><i class="fas fa-flag"></i> Country Code</th>
            <th style="width: 10%;"><i class="fas fa-toggle-on"></i> Enabled</th>
            <th style="width: 13%;"><i class="fas fa-layer-group"></i> Layout</th>
            <th style="width: 13%;"><i class="fas fa-check-circle"></i> Validation</th>
            <th style="width: 13%;"><i class="fas fa-cogs"></i> Features</th>
            <th class="billing-layout-column" style="width: 10%;"><i class="fas fa-layer-group"></i> Billing Layout</th>
            <th class="billing-validation-column" style="width: 10%;"><i class="fas fa-check-circle"></i> Billing Validation</th>
            <th class="billing-features-column" style="width: 10%;"><i class="fas fa-cogs"></i> Billing Features</th>
            <th style="width: 21%;"><i class="fas fa-tools"></i> Actions</th>
        </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');

            for(const [countryCode, settings] of Object.entries(window.afceConfig.by_country)) {
                const tr = document.createElement('tr');

                tr.dataset.countryCode = countryCode;

                const tdCode = document.createElement('td');
                tdCode.textContent = countryCode;
                tr.appendChild(tdCode);

                const tdEnabled = document.createElement('td');
                tdEnabled.textContent = settings.enabled ? 'Yes' : 'No';
                tr.appendChild(tdEnabled);

                const tdLayout = document.createElement('td');
                tdLayout.textContent = settings.layout || 'Default';
                tr.appendChild(tdLayout);

                const tdValidation = document.createElement('td');
                tdValidation.textContent = settings.validation || 'Default';
                tr.appendChild(tdValidation);

                const tdFeatures = document.createElement('td');
                tdFeatures.textContent = settings.features || 'Default';
                tr.appendChild(tdFeatures);

                const tdBillingLayout = document.createElement('td');
                tdBillingLayout.className = 'billing-layout-column';
                tdBillingLayout.textContent = settings.billing_layout || 'Default';
                tr.appendChild(tdBillingLayout);

                const tdBillingValidation = document.createElement('td');
                tdBillingValidation.className = 'billing-validation-column';
                tdBillingValidation.textContent = settings.billing_validation || 'Default';
                tr.appendChild(tdBillingValidation);

                const tdBillingFeatures = document.createElement('td');
                tdBillingFeatures.className = 'billing-features-column';
                tdBillingFeatures.textContent = settings.billing_features || 'Default';
                tr.appendChild(tdBillingFeatures);

                const tdActions = document.createElement('td');
                const editBtn = document.createElement('button');
                editBtn.className = 'afce-button secondary';
                editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
                editBtn.addEventListener('click', () => {
                    editCountryRow(tr);
                });

                const copyBtn = document.createElement('button');
                copyBtn.className = 'afce-button';
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Clone';
                copyBtn.style.backgroundColor = '#17a2b8';
                copyBtn.style.marginRight = '5px';
                copyBtn.addEventListener('click', () => {
                    copyCreateCountryRow(tr);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'afce-button danger';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
                deleteBtn.addEventListener('click', () => {
                    showConfirmModal(`Are you sure you want to delete configuration for "${countryCode}"?`, () => {
                        delete window.afceConfig.by_country[countryCode];
                        tr.remove();
                        showNotification('Country configuration deleted successfully.');
                    });
                });

                tdActions.appendChild(editBtn);
                tdActions.appendChild(copyBtn);
                tdActions.appendChild(deleteBtn);
                tr.appendChild(tdActions);

                tbody.appendChild(tr);
            }

            table.appendChild(tbody);
            return table;
        }

        function renderByCountryTable(section) {
            const existingTable = section.querySelector('table.afce-table');
            if(existingTable) existingTable.remove();
            const table = createByCountryTable();
            section.appendChild(table);
        }

        function addCountryRow(existingCountry = null, prefillData = {}) {
            const section = document.getElementById('afce-section-by-country');
            const tableBody = section.querySelector('table.afce-table tbody');

            if(tableBody.querySelector('.afce-add-row')) return;

            const tr = document.createElement('tr');
            tr.className = 'afce-add-row';

            tr.innerHTML = `
                <td>
                    <input type="text" id="afce-add-country-code" placeholder="e.g., PL" maxlength="2" style="text-transform: uppercase;" ${existingCountry ? 'value=""' : ''}/>
                </td>
                <td>
                    <select id="afce-add-country-enabled">
                        <option value="true" ${prefillData.enabled ? 'selected' : ''}>Yes</option>
                        <option value="false" ${!prefillData.enabled ? 'selected' : ''}>No</option>
                    </select>
                </td>
                <td>
                    <select id="afce-add-country-layout">
                        <option value="">Default</option>
                        ${Object.keys(window.afceConfig.layouts).map(layout => `<option value="${layout}" ${prefillData.layout === layout ? 'selected' : ''}>${layout}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <select id="afce-add-country-validation">
                        <option value="">Default</option>
                        ${Object.keys(window.afceConfig.validations).map(validation => `<option value="${validation}" ${prefillData.validation === validation ? 'selected' : ''}>${validation}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <select id="afce-add-country-features">
                        <option value="">Default</option>
                        ${Object.keys(window.afceConfig.features).map(feature => `<option value="${feature}" ${prefillData.features === feature ? 'selected' : ''}>${feature}</option>`).join('')}
                    </select>
                </td>
                <td class="billing-layout-column">
                    <select id="afce-add-country-billing-layout">
                        <option value="">Default</option>
                        ${Object.keys(window.afceConfig.layouts).map(layout => `<option value="${layout}">${layout}</option>`).join('')}
                    </select>
                </td>
                <td class="billing-validation-column">
                    <select id="afce-add-country-billing-validation">
                        <option value="">Default</option>
                        ${Object.keys(window.afceConfig.validations).map(validation => `<option value="${validation}">${validation}</option>`).join('')}
                    </select>
                </td>
                <td class="billing-features-column">
                    <select id="afce-add-country-billing-features">
                        <option value="">Default</option>
                        ${Object.keys(window.afceConfig.features).map(feature => `<option value="${feature}">${feature}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <button class="afce-button" id="afce-save-add-country"><i class="fas fa-save"></i> Save</button>
                    <button class="afce-button danger" id="afce-cancel-add-country"><i class="fas fa-times"></i> Cancel</button>
                </td>
            `;

            tableBody.prepend(tr);

            tr.querySelector('#afce-save-add-country').addEventListener('click', () => {
                const countryCode = tr.querySelector('#afce-add-country-code').value.trim().toUpperCase();
                if(!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
                    showNotification('Invalid country code. Use two uppercase letters (e.g., PL).', 'danger');
                    return;
                }
                if(window.afceConfig.by_country[countryCode]) {
                    showNotification('Country code already exists.', 'danger');
                    return;
                }

                const enabled = tr.querySelector('#afce-add-country-enabled').value === 'true';
                const layout = tr.querySelector('#afce-add-country-layout').value || undefined;
                const validation = tr.querySelector('#afce-add-country-validation').value || undefined;
                const features = tr.querySelector('#afce-add-country-features').value || undefined;
                const billing_layout = tr.querySelector('#afce-add-country-billing-layout').value || undefined;
                const billing_validation = tr.querySelector('#afce-add-country-billing-validation').value || undefined;
                const billing_features = tr.querySelector('#afce-add-country-billing-features').value || undefined;

                window.afceConfig.by_country[countryCode] = {
                    "enabled": enabled,
                    ...(layout && { "layout": layout }),
                    ...(validation && { "validation": validation }),
                    ...(features && { "features": features }),
                    ...(billing_layout && { "billing_layout": billing_layout }),
                    ...(billing_validation && { "billing_validation": billing_validation }),
                    ...(billing_features && { "billing_features": billing_features })
                };

                renderByCountryTable(document.getElementById('afce-section-by-country'));
                showNotification('Country configuration added successfully.');
            });

            tr.querySelector('#afce-cancel-add-country').addEventListener('click', () => {
                tr.remove();
            });
        }

        function editCountryRow(tr) {
            const countryCode = tr.dataset.countryCode;
            const settings = window.afceConfig.by_country[countryCode];
            const availableLayouts = Object.keys(window.afceConfig.layouts);
            const availableValidations = Object.keys(window.afceConfig.validations);
            const availableFeatures = Object.keys(window.afceConfig.features);

            if(document.querySelector('.afce-edit-row')) return;

            tr.innerHTML = `
                <td>
                    <input type="text" value="${countryCode}" disabled style="text-transform: uppercase;"/>
                </td>
                <td>
                    <select id="afce-edit-country-enabled">
                        <option value="true" ${settings.enabled ? 'selected' : ''}>Yes</option>
                        <option value="false" ${!settings.enabled ? 'selected' : ''}>No</option>
                    </select>
                </td>
                <td>
                    <select id="afce-edit-country-layout">
                        <option value="">Default</option>
                        ${availableLayouts.map(layout => `
                            <option value="${layout}" ${settings.layout === layout ? 'selected' : ''}>${layout}</option>
                        `).join('')}
                    </select>
                </td>
                <td>
                    <select id="afce-edit-country-validation">
                        <option value="">Default</option>
                        ${availableValidations.map(validation => `
                            <option value="${validation}" ${settings.validation === validation ? 'selected' : ''}>${validation}</option>
                        `).join('')}
                    </select>
                </td>
                <td>
                    <select id="afce-edit-country-features">
                        <option value="">Default</option>
                        ${availableFeatures.map(feature => `
                            <option value="${feature}" ${settings.features === feature ? 'selected' : ''}>${feature}</option>
                        `).join('')}
                    </select>
                </td>
                <td class="billing-layout-column">
                    <select id="afce-edit-country-billing-layout">
                        <option value="">Default</option>
                        ${availableLayouts.map(layout => `
                            <option value="${layout}" ${settings.billing_layout === layout ? 'selected' : ''}>${layout}</option>
                        `).join('')}
                    </select>
                </td>
                <td class="billing-validation-column">
                    <select id="afce-edit-country-billing-validation">
                        <option value="">Default</option>
                        ${availableValidations.map(validation => `
                            <option value="${validation}" ${settings.billing_validation === validation ? 'selected' : ''}>${validation}</option>
                        `).join('')}
                    </select>
                </td>
                <td class="billing-features-column">
                    <select id="afce-edit-country-billing-features">
                        <option value="">Default</option>
                        ${availableFeatures.map(feature => `
                            <option value="${feature}" ${settings.billing_features === feature ? 'selected' : ''}>${feature}</option>
                        `).join('')}
                    </select>
                </td>
                <td>
                    <button class="afce-button secondary" id="afce-save-edit-country"><i class="fas fa-save"></i> Save</button>
                    <button class="afce-button danger" id="afce-cancel-edit-country"><i class="fas fa-times"></i> Cancel</button>
                </td>
            `;

            tr.classList.add('afce-edit-row');

            tr.querySelector('#afce-save-edit-country').addEventListener('click', () => {
                const enabled = tr.querySelector('#afce-edit-country-enabled').value === 'true';
                const layout = tr.querySelector('#afce-edit-country-layout').value || undefined;
                const validation = tr.querySelector('#afce-edit-country-validation').value || undefined;
                const features = tr.querySelector('#afce-edit-country-features').value || undefined;
                const billing_layout = tr.querySelector('#afce-edit-country-billing-layout').value || undefined;
                const billing_validation = tr.querySelector('#afce-edit-country-billing-validation').value || undefined;
                const billing_features = tr.querySelector('#afce-edit-country-billing-features').value || undefined;

                window.afceConfig.by_country[countryCode] = {
                    "enabled": enabled,
                    ...(layout && { "layout": layout }),
                    ...(validation && { "validation": validation }),
                    ...(features && { "features": features }),
                    ...(billing_layout && { "billing_layout": billing_layout }),
                    ...(billing_validation && { "billing_validation": billing_validation }),
                    ...(billing_features && { "billing_features": billing_features })
                };

                renderByCountryTable(document.getElementById('afce-section-by-country'));
                showNotification('Country configuration updated successfully.');
            });

            tr.querySelector('#afce-cancel-edit-country').addEventListener('click', () => {
                renderByCountryTable(document.getElementById('afce-section-by-country'));
                showNotification('Edit canceled.');
            });
        }

        function copyCreateCountryRow(tr) {
            const countryCode = tr.dataset.countryCode;
            const settings = window.afceConfig.by_country[countryCode];
            if (!settings) {
                showNotification('Selected country configuration does not exist.', 'danger');
                return;
            }
            addCountryRow(null, settings);
        }

        /* ------------------- JSON Section ------------------- */

        function createJsonSection(fullData) {
            const section = document.createElement('div');
            section.id = 'afce-section-json';
            section.className = 'afce-section';

            const jsonContainer = document.createElement('div');
            jsonContainer.id = 'afce-json-content';

            // Add search bar above the JSON display
            const searchHTML = `
                <div style="margin-bottom: 10px;">
                    <input type="text" id="afce-json-search" placeholder="Search JSON..." style="width: 80%; padding: 5px;"/>
                    <button id="afce-json-search-btn" class="afce-button secondary">Search</button>
                    <button id="afce-json-clear-btn" class="afce-button">Clear</button>
                </div>
            `;
            jsonContainer.innerHTML = searchHTML;

            const jsonDisplay = document.createElement('pre');
            jsonDisplay.id = 'afce-json-display';
            const jsonText = JSON.stringify({
                ...fullData,
                site: {
                    ...(fullData.site || {}),
                    address_form_configuration: window.afceConfig
                }
            }, null, 4);
            jsonDisplay.textContent = jsonText;
            // Store the original JSON text for search functionality
            jsonDisplay.dataset.originalText = jsonText;

            jsonContainer.appendChild(jsonDisplay);

            // Event listener for Search button
            setTimeout(() => {
                const searchBtn = document.getElementById('afce-json-search-btn');
                const clearBtn = document.getElementById('afce-json-clear-btn');
                const searchInput = document.getElementById('afce-json-search');
                searchBtn.addEventListener('click', () => {
                    const query = searchInput.value.trim();
                    if (!query) return;
                    const originalText = jsonDisplay.dataset.originalText;
                    const regex = new RegExp(query, 'gi');
                    const highlighted = originalText.replace(regex, match => `<span class="highlight">${match}</span>`);
                    jsonDisplay.innerHTML = highlighted;
                });
                clearBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    jsonDisplay.textContent = jsonDisplay.dataset.originalText;
                });
            }, 100);

            section.appendChild(jsonContainer);

            return section;
        }

        function updateJsonSection(section, fullData) {
            const jsonDisplay = section.querySelector('#afce-json-display');
            const newText = JSON.stringify({
                "site": {
                    "version": window.afceVersion
                },
                "address_form_configuration": window.afceConfig
            }, null, 4);
            jsonDisplay.textContent = newText;
            jsonDisplay.dataset.originalText = newText;
        }

        function copyJsonToClipboard() {
            const jsonDisplay = modalOverlay.querySelector('#afce-json-display');
            const jsonText = jsonDisplay.textContent;
            navigator.clipboard.writeText(jsonText)
                .then(() => {
                    showNotification('JSON copied to clipboard.');
                })
                .catch(err => {
                    console.error('Failed to copy JSON:', err);
                    showNotification('Failed to copy JSON.', 'danger');
                });
        }

        /* ------------------- Publish Configuration Function ------------------- */

        function publishConfig(fullData) {
            const siteId = unsafeWindow.siteId;
            const authToken = unsafeWindow.authToken;
            if (!siteId || !authToken) {
                console.error('Site ID or Auth Token not found.');
                showNotification('Site ID or Auth Token not found.', 'danger');
                return;
            }

            let apiEndpoint = 'https://api-stage.ingrid.com/v1/config/site.update';
            const pageUrl = window.location.href;

            if (pageUrl.startsWith('https://mad.ingrid.com/')) {
                apiEndpoint = 'https://api.ingrid.com/v1/config/site.update';
            }

            const { address_form_configuration, ...restData } = fullData;

            console.log('restData:', restData);
            console.log('window.afceConfig:', window.afceConfig);

            const payload = {
                ...restData,
                site: {
                    ...(restData.site || {}),
                    address_form_configuration: window.afceConfig,
                    version: window.afceVersion || '1'
                }
            };

            if ('version' in payload.site.address_form_configuration) {
                delete payload.site.address_form_configuration.version;
            }

            console.log('Publishing payload:', payload);

            fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + authToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        const errorMessage = errData.error || 'Unknown error';
                        console.error('API request failed with status:', response.status, 'Error:', errorMessage);
                        showNotification('API request failed. ' + errorMessage, 'danger');
                        return Promise.reject('API request failed');
                    }).catch(() => {
                        console.error('API request failed with status:', response.status);
                        showNotification('API request failed. Status: ' + response.status, 'danger');
                        return Promise.reject('API request failed');
                    });
                }
                return response.json();
            })
            .then(data => {
                showNotification('Configuration published successfully.');
                console.log('Publish response:', data);
                if (data.site && data.site.version) {
                    window.afceVersion = data.site.version;
                }
            })
            .catch(error => {
                console.error('Failed to publish configuration:', error);
                showNotification('Failed to publish configuration.', 'danger');
            });
        }
    }
})();
