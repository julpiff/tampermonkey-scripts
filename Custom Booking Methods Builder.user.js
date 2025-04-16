// ==UserScript==
// @name         Custom Booking Methods Builder
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Build and manage custom_booking_methods via a user-friendly interface with API integration
// @author       julpif
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @grant        unsafeWindow
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Custom%20Booking%20Methods%20Builder.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Custom%20Booking%20Methods%20Builder.user.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js
// ==/UserScript==

(function() {
    'use strict';

    /* ------------------- Utility Functions ------------------- */

    // Function to create and append a stylesheet
    const injectStyles = (styles) => {
        const styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    };

    // Function to create an element with attributes and children
    const createElement = (tag, attrs = {}, ...children) => {
        const element = document.createElement(tag);

        for (const key in attrs) {
            if (key === 'className') {
                element.className = attrs[key];
            } else if (key === 'innerHTML') {
                element.innerHTML = attrs[key];
            } else if (key === 'disabled') {
                element.disabled = attrs[key];
            } else if (key === 'selected') {
                element.selected = attrs[key];
            } else if (key === 'checked') {
                element.checked = attrs[key];
            } else if (key === 'value') {
                element.value = attrs[key];
            } else if (key === 'style') {
                element.style.cssText = attrs[key];
            } else {
                element.setAttribute(key, attrs[key]);
            }
        }
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        return element;
    };

// Function to add move arrows using GSAP animation (assumed to be defined elsewhere)
function addMoveArrows(element) {
    // Create up arrow button
    const upBtn = document.createElement('button');
    upBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    upBtn.className = 'move-arrow up-arrow';

    // Create down arrow button
    const downBtn = document.createElement('button');
    downBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
    downBtn.className = 'move-arrow down-arrow';

    // Try to attach them to a header, otherwise stick 'em at the top
    let header = element.querySelector('.cbm-step-header') ||
                 element.querySelector('.cbm-filter-header') ||
                 element.querySelector('.cbm-action-header');
    if (header) {
        header.appendChild(upBtn);
        header.appendChild(downBtn);
    } else {
        element.insertBefore(upBtn, element.firstChild);
        element.insertBefore(downBtn, element.firstChild);
    }

    // Hook up the bloody move actions using GSAP
    upBtn.addEventListener('click', () => moveElementGSAP(element, 'up'));
    downBtn.addEventListener('click', () => moveElementGSAP(element, 'down'));
}

// Example GSAP move function – shrinks to 100px, reorders, then expands back.
function moveElementGSAP(element, direction) {
    const distance = element.offsetHeight;
    let targetElement;
    if (direction === 'up' && element.previousElementSibling) {
        targetElement = element.previousElementSibling;
    } else if (direction === 'down' && element.nextElementSibling) {
        targetElement = element.nextElementSibling;
    } else {
        return;
    }

    // Collapse any expanded address fields on the current element and its neighbour
    collapseAddressContainers(element);
    collapseAddressContainers(targetElement);

    let tl = gsap.timeline({
        onComplete: function() {
            if (direction === 'up') {
                element.parentNode.insertBefore(element, targetElement);
            } else if (direction === 'down') {
                element.parentNode.insertBefore(targetElement, element);
            }
            gsap.set(element, { y: 0 });
            gsap.set(targetElement, { y: 0 });
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    if (direction === 'up') {
        tl.to(element, { duration: 0.3, y: -distance, ease: "power1.inOut" }, 0)
          .to(targetElement, { duration: 0.3, y: distance, ease: "power1.inOut" }, 0);
    } else if (direction === 'down') {
        tl.to(element, { duration: 0.3, y: distance, ease: "power1.inOut" }, 0)
          .to(targetElement, { duration: 0.3, y: -distance, ease: "power1.inOut" }, 0);
    }
}

     /* ------------------- API Call ------------------- */
    function fetchShippingMethods(callback) {
        const siteId = unsafeWindow.siteId;
        const authToken = unsafeWindow.authToken;

        if (!siteId || !authToken) {
            callback('Missing siteId or authToken.', null);
            return;
        }

        const baseUrl = window.location.href.startsWith('https://mad-stage.ingrid.com/')
            ? 'https://api-stage.ingrid.com'
            : 'https://api.ingrid.com';

        const endpoint = `${baseUrl}/v1/frontend/selfcare/shipping_methods.list?site_id=${siteId}&with_custom_booking_methods=false`;

        fetch(endpoint, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                return response.text().then(text => {
                    callback(`Failed to fetch shipping methods list: ${response.status} - ${text}`, null);
                });
            }
        })
        .then(data => {
            if (data && data.methods && Array.isArray(data.methods)) {
                callback(null, data.methods);
            } else {
                callback('Methods array is missing in the response.', null);
            }
        })
        .catch(error => {
            callback('Network error while fetching shipping methods list.', null);
        });
    }

    /* ------------------- Helper Functions ------------------- */

    /**
 * Extract parameters from a function call string like:
 * actionSelect('param1', "param2", 'param3', ...)
 *
 * This function:
 * 1. Finds the parentheses.
 * 2. Extracts the parameters inside.
 * 3. Splits by commas that are not inside quotes.
 * 4. Preserves quotes and escapes within parameters.
 *
 * @param {string} actionValue - The full action string, e.g. "add_meta('my_first_param', \"{\\\"name...}\")"
 * @returns {string[]} - An array of raw parameter strings (with quotes still attached).
 */
function extractParameters(actionValue) {
    actionValue = actionValue.trim();
    // Find the first '(' and last ')' to isolate the parameters
    const startIndex = actionValue.indexOf('(');
    const endIndex = actionValue.lastIndexOf(')');

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        console.warn('[CBM Builder] Invalid action string: missing parentheses.');
        return [];
    }

    const inner = actionValue.slice(startIndex + 1, endIndex).trim();

    const params = [];
    let currentParam = '';
    let insideSingleQuotes = false;
    let insideDoubleQuotes = false;
    let escapeNext = false;

    for (let i = 0; i < inner.length; i++) {
        const char = inner[i];

        if (escapeNext) {
            // Previous char was a backslash, take this char literally
            currentParam += char;
            escapeNext = false;
        } else if (char === '\\') {
            // Next character is escaped
            currentParam += char;
            escapeNext = true;
        } else if (char === "'" && !insideDoubleQuotes) {
            // Toggle insideSingleQuotes if not inside double quotes
            insideSingleQuotes = !insideSingleQuotes;
            currentParam += char;
        } else if (char === '"' && !insideSingleQuotes) {
            // Toggle insideDoubleQuotes if not inside single quotes
            insideDoubleQuotes = !insideDoubleQuotes;
            currentParam += char;
        } else if (char === ',' && !insideSingleQuotes && !insideDoubleQuotes) {
            // Top-level comma, end of a parameter
            const trimmed = currentParam.trim();
            if (trimmed) params.push(trimmed);
            currentParam = '';
        } else {
            currentParam += char;
        }
    }

    const lastTrimmed = currentParam.trim();
    if (lastTrimmed) params.push(lastTrimmed);

    return params;
}

/**
 * Remove outer quotes from a parameter if present.
 * - If a parameter starts and ends with single quotes, remove them.
 * - If it starts and ends with double quotes, remove them.
 * Escaped inner quotes remain untouched since we only remove the outermost layer.
 *
 * @param {string} param - The raw parameter string with possible outer quotes.
 * @returns {string} - The parameter string without the outermost quotes.
 */
function removeOuterQuotes(param) {
    if (param.length >= 2) {
        if ((param.startsWith("'") && param.endsWith("'")) ||
            (param.startsWith('"') && param.endsWith('"'))) {
            // Remove the outer quotes
            const inner = param.slice(1, -1);
            return inner;
        }
    }
    return param;
}

    function collapseAddressContainers(element) {
    const wrappers = element.querySelectorAll('.cbm-custom-address-wrapper');
    wrappers.forEach(wrapper => {
        const addressContainer = wrapper.querySelector('.cbm-custom-address-parameters');
        const toggleBtn = wrapper.querySelector('.cbm-address-toggle-btn');
        if (addressContainer && addressContainer.style.display === 'block') {
            addressContainer.style.display = 'none';
            if (toggleBtn) toggleBtn.textContent = 'Expand Address Fields';
        }
    });
}

/**
 * Process an actionValue string and return parameters without outer quotes.
 * This handles complex nested JSON and ensures no truncation.
 *
 * @param {string} actionValue - The raw action string.
 * @returns {string[]} - Array of parameter strings without outer quotes.
 */
function processParameters(actionValue) {
    const params = extractParameters(actionValue);
    return params.map(removeOuterQuotes);
}

    function processActionValue(actionValueRaw) {
    // This function receives the raw parameters (everything inside the parentheses),
    // and should return them wrapped in parentheses again.
    // If you need additional processing (like re-quoting or ensuring proper escapes),
    // you can do so here. For now, let's just wrap the raw value in parentheses.

    return `(${actionValueRaw})`;
}
    // Function to inject Font Awesome
    const injectFontAwesome = () => {
        const fontAwesomeLink = document.createElement('link');
        fontAwesomeLink.rel = 'stylesheet';
        fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        fontAwesomeLink.crossOrigin = 'anonymous';
        fontAwesomeLink.referrerPolicy = 'no-referrer';
        document.head.appendChild(fontAwesomeLink);
    };

/* Helper function to populate both shipping methods dropdowns with one API call */
function populateBothShippingMethodsDropdowns(bookingSelectElement, returnSelectElement, bookingSelectedValue = '', returnSelectedValue = '') {
    fetchShippingMethods((err, methods) => {
        if (err) {
            console.error("Bloody hell, failed to fetch shipping methods:", err);
            return;
        }
        // Populate Booking Method dropdown
        bookingSelectElement.innerHTML = '';
        bookingSelectElement.appendChild(createElement('option', { value: '' }, 'Select Shipping Method'));
        methods.forEach(method => {
            const option = createElement('option', { value: method.id }, method.id);
            if (method.id === bookingSelectedValue) {
                option.selected = true;
            }
            bookingSelectElement.appendChild(option);
        });
        // Populate Return Method dropdown
        returnSelectElement.innerHTML = '';
        returnSelectElement.appendChild(createElement('option', { value: '' }, 'Select Shipping Method'));
        methods.forEach(method => {
            const option = createElement('option', { value: method.id }, method.id);
            if (method.id === returnSelectedValue) {
                option.selected = true;
            }
            returnSelectElement.appendChild(option);
        });
    });
}

         /**
     * Creates a UI row for selecting an ID type and entering its value.
     * @param {string} [initialType=''] - The initial type to select in the dropdown.
     * @param {string} [initialValue=''] - The initial value to put in the input field.
     * @returns {HTMLElement} - The created div element for the row.
     */
    function createIdPairRow(initialType = '', initialValue = '') {
        const rowDiv = createElement('div', { className: 'cbm-id-pair-row', style: 'display: flex; gap: 10px; align-items: center; margin-bottom: 8px; border-left: 3px solid #eee; padding-left: 8px;' }); // Changed border color

        // Type Dropdown
        const typeLabel = createElement('label', { style: 'margin-bottom: 0; flex-shrink: 0;' }, 'Type:');
        const idTypes = ['ein', 'eori', 'hmrc', 'ioss', 'pan', 'pccc', 'ssn', 'tin', 'ukims', 'vat', 'voec'];
        const typeSelect = createElement('select', { className: 'cbm-id-type-select', style: 'flex-grow: 1; min-width: 80px;' },
            createElement('option', { value: '', selected: !initialType, disabled: true }, 'Select Type'),
            ...idTypes.map(type => createElement('option', { value: type, selected: type === initialType }, type.toUpperCase()))
        );
        typeSelect.addEventListener('change', () => typeSelect.classList.remove('error')); // Clear error on change

        // Value Input
        const valueLabel = createElement('label', { style: 'margin-bottom: 0; flex-shrink: 0;' }, 'Value:');
        const valueInput = createElement('input', {
            type: 'text',
            className: 'cbm-id-value-input',
            placeholder: 'Enter ID Value',
            value: initialValue,
            style: 'flex-grow: 2;'
        });
        valueInput.addEventListener('input', () => valueInput.classList.remove('error')); // Clear error on input

        // Remove Button
        const removeBtn = createElement('button', {
            className: 'cbm-button danger cbm-remove-id-pair-btn',
            innerHTML: '<i class="fas fa-times"></i>', // Just the icon for space
            title: 'Remove ID', // Tooltip
            style: 'padding: 4px 8px; flex-shrink: 0; line-height: 1;' // Smaller padding & adjust line-height
        });
        removeBtn.addEventListener('click', () => {
            rowDiv.remove(); // Remove this specific row
        });

        rowDiv.appendChild(typeLabel);
        rowDiv.appendChild(typeSelect);
        rowDiv.appendChild(valueLabel);
        rowDiv.appendChild(valueInput);
        rowDiv.appendChild(removeBtn);

        return rowDiv;
    }

    /* ------------------- Inject CSS Styles ------------------- */
    const injectCSS = () => {
        const styles = `
            /* Modal Overlay */
            #cbm-builder-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(3px);
                animation: fadeIn 0.3s;
            }

            /* Fixed Width and Text Wrapping for Address Table */
            #addresses-table {
                table-layout: fixed;
                width: 800px;
                max-width: 100%;
                word-wrap: break-word;
            }

            #addresses-table th,
            #addresses-table td {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: normal;
                word-wrap: break-word;
                padding: 10px 12px;
            }

            /* Steps Table */
            #steps-table {
                table-layout: fixed;
                width: 100%;
                max-width: 100%;
                word-wrap: break-word;
            }

            #steps-table th,
            #steps-table td {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: normal;
                word-wrap: break-word;
                padding: 10px 12px;
                text-align: left;
                vertical-align: top;
            }

            .cbm-action {
    background-color: #dceddc;
    border-left: 8px solid #28a745;
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 4px;
    position: relative;
}

.cbm-filter {
    background-color: #FFFFE0;
    border-left: 8px solid #ffc107;
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 4px;
    position: relative;
}

            #cbm-builder-modal {
                background: #fff;
                width: 90%;
                max-width: 1200px;
                height: 85%;
                border-radius: 8px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                box-shadow: 0 6px 12px rgba(0,0,0,0.2);
                position: relative;
                animation: slideIn 0.3s;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            #cbm-header {
                padding: 8px 16px;
                background: #000000;
                color: #ffffff;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            #cbm-header h2 {
                margin: 0;
                font-size: 20px;
                display: flex;
                align-items: center;
                gap: 6px;
                color: #ffffff;
            }

            #cbm-close-btn {
                background: transparent;
                border: none;
                color: #ffffff;
                cursor: pointer;
                font-size: 24px;
            }

            #cbm-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                box-sizing: border-box;
            }

            .cbm-section {
                margin-bottom: 32px;
            }

            .cbm-section h3 {
                margin-bottom: 12px;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 6px;
                color: #007bff;
            }

            .cbm-button {
                padding: 6px 12px;
                background: #000000;
                color: #ffffff;
                border: none;
                cursor: pointer;
                border-radius: 4px;
                margin: 4px 4px;
                font-size: 13px;
                transition: background-color 0.3s, transform 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }

            .cbm-button:hover {
                background: #333333;
            }

            .cbm-button:active {
                background: #004085;
                transform: scale(0.98);
            }

            .cbm-button.secondary.edit-method-btn,
            .cbm-button.secondary.edit-step-btn {
                background: #007BFF;
                color: #ffffff;
            }

            .cbm-button.secondary.edit-method-btn:hover,
            .cbm-button.secondary.edit-step-btn:hover {
                background: #0056b3;
            }

            .cbm-button.danger {
                background: #dc3545;
            }

            .cbm-button.danger:hover {
                background: #c82333;
            }

            .cbm-button.clone-method-btn {
                background: rgb(23, 162, 184);
                color: #ffffff;
            }

            .cbm-button.clone-method-btn:hover {
                background: rgb(17, 132, 160);
            }

            .cbm-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 16px;
                font-size: 13px;
            }

            .cbm-table th, .cbm-table td {
                border: 1px solid #dddddd;
                padding: 10px 12px;
                text-align: left;
                word-wrap: break-word;
                white-space: normal;
                vertical-align: top;
            }

            .cbm-table th {
                background-color: #f2f2f2;
            }

            .cbm-table tbody tr:hover {
                background-color: #f9f9f9;
            }

            .cbm-form-group {
                margin-bottom: 12px;
            }

            .cbm-form-group label {
                display: block;
                margin-bottom: 4px;
                font-size: 13px;
            }

            .cbm-form-group input[type="text"],
            .cbm-form-group select,
            .cbm-form-group textarea,
            .cbm-form-group input[type="time"],
            .cbm-form-group input[type="datetime-local"],
            .cbm-form-group input[type="number"] {
                width: 100%;
                padding: 6px 10px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 13px;
                transition: border-color 0.3s, box-shadow 0.3s;
            }

            .cbm-form-group input[type="text"]:focus,
            .cbm-form-group select:focus,
            .cbm-form-group textarea:focus,
            .cbm-form-group input[type="time"]:focus,
            .cbm-form-group input[type="datetime-local"]:focus,
            .cbm-form-group input[type="number"]:focus {
                border-color: #80bdff;
                box-shadow: 0 0 4px rgba(0,123,255,0.5);
                outline: none;
            }

            #cbm-notification {
                position: fixed;
                top: 16px;
                right: 16px;
                background: #28a745;
                color: #ffffff;
                padding: 10px 14px;
                border-radius: 4px;
                display: none;
                z-index: 10001;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                font-size: 13px;
                animation: fadeIn 0.5s;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideIn {
                from { transform: translateY(-30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            @media (max-width: 1024px) {
                #cbm-builder-modal {
                    width: 95%;
                    height: 90%;
                }
            }

            @media (max-width: 768px) {
                #cbm-header h2 {
                    font-size: 16px;
                }

                .cbm-button {
                    padding: 5px 10px;
                    font-size: 12px;
                }

                .cbm-table th, .cbm-table td {
                    padding: 6px 8px;
                }

                .cbm-form-group label {
                    font-size: 12px;
                }

                .cbm-form-group input[type="text"],
                .cbm-form-group select,
                .cbm-form-group textarea,
                .cbm-form-group input[type="time"],
                .cbm-form-group input[type="datetime-local"],
                .cbm-form-group input[type="number"] {
                    font-size: 12px;
                }
            }

            .cbm-toggle-switch {
                display: flex;
                align-items: center;
            }

            .cbm-toggle-switch input[type="checkbox"] {
                appearance: none;
                width: 40px;
                height: 20px;
                background: #ccc;
                border-radius: 20px;
                position: relative;
                outline: none;
                cursor: pointer;
                transition: background-color 0.2s;
                margin-left: 10px;
            }

            .cbm-toggle-switch input[type="checkbox"]::before {
                content: "";
                position: absolute;
                top: 2px;
                left: 2px;
                width: 16px;
                height: 16px;
                background: white;
                border-radius: 50%;
                transition: transform 0.2s;
            }

            .cbm-toggle-switch input[type="checkbox"]:checked {
                background: #007BFF;
            }

            .cbm-toggle-switch input[type="checkbox"]:checked::before {
                transform: translateX(20px);
            }

            .cbm-step-field {
                background-color: #f3f6ff;
                border-left: 10px solid #007BFF;
                padding: 10px;
                margin-bottom: 15px;
                border-radius: 4px;
                position: relative;
            }

            .cbm-filter {
                border-left-color: #ffc107;
            }

            .cbm-step-header,
            .cbm-action-header,
            .cbm-filter-header {
                font-weight: bold;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .cbm-step-header i {
                color: #007BFF;
            }

            .cbm-action-header i {
                color: #28a745;
            }

            .cbm-filter-header i {
                color: #ffc107;
            }

            .cbm-action-parameters {
                gap: 10px;
                margin-bottom: 6px;
            }

            .cbm-action-parameters input,
            .cbm-action-parameters select,
            .cbm-action-parameters textarea {
                flex: 1;
            }

            .cbm-custom-address-parameters {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 10px;
            }

            .cbm-custom-address-parameters input[type="text"] {
                width: 100%;
            }

            .cbm-custom-address-parameters textarea {
                width: 100%;
                height: 60px;
                resize: vertical;
            }
              /* Highlight mandatory fields when they’re missing - red as hell */
  .cbm-form-group input.error,
  .cbm-form-group select.error,
  .cbm-form-group textarea.error {
      border: 2px solid red;
      box-shadow: 0 0 5px rgba(255, 0, 0, 0.8);
  }

  .scale-animation {
    animation: scaleInOut 1s ease;
  }
  @keyframes scaleInOut {
    0% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
        `;
        injectStyles(styles);
    };

    /* ------------------- Notification Function ------------------- */
    const createNotification = () => {
        const notification = createElement('div', { id: 'cbm-notification' });
        document.body.appendChild(notification);
        return notification;
    };

    const showNotification = (message, type = 'success') => {
        const notification = document.getElementById('cbm-notification');
        if (notification) {
            notification.textContent = message;
            notification.style.background = type === 'success' ? '#28a745' : '#dc3545';
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
    };

    /* ------------------- Modal Management ------------------- */
    let escKeyListener;

    const createModalOverlay = (id) => {
        const existingOverlay = document.getElementById(id);
        if (existingOverlay) {
            existingOverlay.parentNode.removeChild(existingOverlay);
        }
        const overlay = createElement('div', { id, style: `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
        ` });

        document.body.appendChild(overlay);

        let isInsideClick = false;

        overlay.addEventListener('mousedown', (e) => {
            if (e.target !== overlay) {
                isInsideClick = true;
            } else {
                isInsideClick = false;
            }
        });

        overlay.addEventListener('click', (e) => {
            if (!isInsideClick && e.target === overlay) {
                closeModalHandler();
            }
        });

        const closeModalHandler = () => {
            overlay.style.display = 'none';
            document.removeEventListener('keydown', escKeyListener);
        };

        escKeyListener = (e) => {
            if (e.key === 'Escape') {
                closeModalHandler();
            }
        };
        document.addEventListener('keydown', escKeyListener);

        return overlay;
    };

    const addCloseButton = (modalContent, overlayId) => {
        if (!modalContent.querySelector('.cbm-modal-close-btn')) {
            const closeButton = createElement('button', {
                className: 'cbm-modal-close-btn',
                innerHTML: `<i class="fas fa-times"></i>`,
                style: `
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: transparent;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                `
            });
            modalContent.appendChild(closeButton);

            closeButton.addEventListener('click', () => {
                const overlay = document.getElementById(overlayId);
                if (overlay) {
                    overlay.style.display = 'none';
                    document.removeEventListener('keydown', escKeyListener);
                }
            });
        }
    };

    const openModal = (overlay) => {
        overlay.style.display = 'flex';
    };

    const closeModal = (overlay) => {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    };

    /* ------------------- Actions ------------------- */

    // Updated to include new actions as requested
    const getAvailableActions = () => ([
        { value: 'add_addon', label: 'Add Addon' },
        { value: 'add_addon_for_carrier', label: 'Add Addon for Carrier' },
        { value: 'remove_addon', label: 'Remove Addon' },
        { value: 'set_custom_address', label: 'Set Custom Address' },
        { value: 'add_meta', label: 'Add Meta' },
        { value: 'add_default_meta', label: 'Add Default Meta Value' }, // New action same as add_meta
        { value: 'set_custom_address_company_name', label: 'Set Custom Address Company Name' }, // New
        { value: 'remove_location_ref', label: 'Remove Location Reference' }, // New no parameters
        { value: 'set_shipping_method', label: 'Set Shipping Method' }, // New string param
        { value: 'set_gcd_currency', label: 'Set GCD Currency' }, // New string param
        { value: 'set_gcd_seller_address', label: 'Set GCD Seller Address' }, // same format as set_custom_address
        { value: 'set_gcd_sold_to', label: 'Set GCD Sold To' }, // same format as set_custom_address
        { value: 'set_gcd_incoterms', label: 'Set GCD Incoterms' }, // single string param
        { value: 'set_gcd_place_of_incoterms', label: 'Set GCD Place of Incoterms' }, // single string param
        { value: 'set_gcd_seller_id_numbers', label: 'Set GCD Seller ID Numbers' },
        { value: 'set_gcd_buyer_id_numbers', label: 'Set GCD Buyer ID Numbers' },
        { value: 'use_gcd_unit_alternative_value', label: 'Use GCD Unit Alternative Value' }, // no parameters now
        { value: 'use_line_items_currency_as_gcd_currency', label: 'Use Line Items Currency As GCD Currency' }, // no params
        { value: 'use_addr_as_gcd_sold_to', label: 'Use Addr as GCD Sold To' }, // dropdown param
        { value: 'set_gcd_buyer_contact', label: 'Set GCD Buyer Contact' }, // fields: email/phone
        { value: 'use_customer_info_as_gcd_buyer_contact', label: 'Use Customer Info as GCD Buyer Contact' } // no params
    ]);

function createFilterForm(filterData = {}) {
    const filterDiv = createElement('div', { className: 'cbm-filter' },
        createElement('div', { className: 'cbm-filter-header' },
            createElement('i', { className: 'fas fa-filter' }),
            'Filter'
        ),
        createElement('input', {
            type: 'text',
            className: 'cbm-filter-input',
            placeholder: 'Enter filter expression (e.g., shipment.weight > 10)',
            value: filterData.expression ? filterData.expression : ''
        }),
        createElement('button', {
            className: 'cbm-remove-filter-btn',
            innerHTML: `<i class="fas fa-times"></i> Remove`,
            style: 'margin-top: 5px; padding: 4px 8px; font-size: 12px;'
        })
    );

    // Attach move arrows to the filter element
    addMoveArrows(filterDiv);

    // Event listener to remove the filter
    filterDiv.querySelector('.cbm-remove-filter-btn').addEventListener('click', () => {
        filterDiv.remove();
    });

    return filterDiv;
}

function createActionForm(availableActions, actionData = {}) {
    const actionDiv = createElement('div', { className: 'cbm-action' },
        createElement('div', { className: 'cbm-action-header' },
            createElement('i', { className: 'fas fa-cogs' }),
            'Action'
        ),
        createElement('select', { className: 'cbm-action-select' },
            createElement('option', { value: '', disabled: true, selected: true }, 'Select Action'),
            ...availableActions.map(a => createElement('option', { value: a.value }, a.label))
        ),
        createElement('div', { className: 'cbm-action-parameters' }),
        createElement('button', {
            className: 'cbm-remove-action-btn',
            innerHTML: `<i class="fas fa-times"></i> Remove`,
            style: 'margin-top: 5px; padding: 4px 8px; font-size: 12px;'
        })
    );

    // Attach move arrows to the action element
    addMoveArrows(actionDiv);

    // Remove action on click
    actionDiv.querySelector('.cbm-remove-action-btn').addEventListener('click', () => {
        actionDiv.remove();
    });

    // If there's existing action data, prefill the form
    if (actionData.expression) {
        const regex = /^(\w+)\((.*)\)$/;
        const match = actionData.expression.match(regex);
        if (match) {
            const actionSelect = match[1];
            const actionValueRaw = match[2];
            const actionSelectElement = actionDiv.querySelector('.cbm-action-select');
            const actionParametersDiv = actionDiv.querySelector('.cbm-action-parameters');
            if (actionSelectElement && actionParametersDiv) {
                actionSelectElement.value = actionSelect;
                // Populate the parameters using your bloody populateActionParameters function
                populateActionParameters(actionSelect, actionValueRaw, actionParametersDiv);
            }
        }
    }

    // Event listener for changes to the action select
    const actionSelectElement = actionDiv.querySelector('.cbm-action-select');
    actionSelectElement.addEventListener('change', (e) => {
        const selectedAction = e.target.value;
        const actionParametersDiv = actionDiv.querySelector('.cbm-action-parameters');
        actionParametersDiv.innerHTML = '';
        addActionParametersUI(selectedAction, actionParametersDiv);
    });

    return actionDiv;
}

function addActionParametersUI(selectedAction, container) {
        // This function sets up the UI fields when an action is selected

        // --- Clear container first ---
        container.innerHTML = '';

        if (selectedAction === 'add_addon_for_carrier') {
            const paramInput1 = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-1',
                placeholder: 'Enter first parameter'
            });
            const paramInput2 = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-2',
                placeholder: 'Enter second parameter'
            });
            container.appendChild(paramInput1);
            container.appendChild(paramInput2);

        } else if (selectedAction === 'set_custom_address') {
            addCustomAddressParameters(container, true); // Dropdown visible

        } else if (selectedAction === 'add_meta' || selectedAction === 'add_default_meta') {
            // Add extra dropdown for "Regular Parameter" and "Address"
            const extraDropdown = createElement('select', { className: 'cbm-extra-dropdown' },
                createElement('option', { value: 'regular', selected: true }, 'Regular Parameter'),
                createElement('option', { value: 'address' }, 'Address')
            );
            container.appendChild(extraDropdown);

            const paramContainer = createElement('div', { className: 'cbm-meta-parameters' });

            // Initial state: Regular Parameter (two fields)
            const paramInput1 = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-1',
                placeholder: 'Enter field name'
            });
            const paramInput2 = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-2',
                placeholder: 'Enter field value'
            });
            paramContainer.appendChild(paramInput1);
            paramContainer.appendChild(paramInput2);
            container.appendChild(paramContainer);

            // Event listener for dropdown change
            extraDropdown.addEventListener('change', (e) => {
                const selection = e.target.value;
                paramContainer.innerHTML = '';
                if (selection === 'regular') {
                    // Show two parameter fields
                    const regParamInput1 = createElement('input', {
                        type: 'text',
                        className: 'cbm-action-value-1',
                        placeholder: 'Enter field name'
                    });
                    const regParamInput2 = createElement('input', {
                        type: 'text',
                        className: 'cbm-action-value-2',
                        placeholder: 'Enter field value'
                    });
                    paramContainer.appendChild(regParamInput1);
                    paramContainer.appendChild(regParamInput2);
                } else if (selection === 'address') {
                    // Show first param + address block
                    // First param field:
                    const addressFirstParam = createElement('input', {
                        type: 'text',
                        className: 'cbm-action-value-1',
                        placeholder: 'Enter first parameter'
                    });
                    paramContainer.appendChild(addressFirstParam);
                    // Add address parameters
                    addCustomAddressParameters(paramContainer, false);
                }
            });

        } else if (selectedAction === 'set_custom_address_company_name') {
            // First parameter: dropdown for address key
            const paramSelect = createElement('select', { className: 'cbm-custom-address-select' },
                createElement('option', { value: 'ADDRESS_FROM' }, 'ADDRESS_FROM'),
                createElement('option', { value: 'ADDRESS_TO' }, 'ADDRESS_TO'),
                createElement('option', { value: 'ADDRESS_RETURN' }, 'ADDRESS_RETURN'),
                createElement('option', { value: 'ADDRESS_CUSTOMER' }, 'ADDRESS_CUSTOMER')
            );
            container.appendChild(paramSelect);
            const paramInput = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-2',
                placeholder: 'Company Name'
            });
            container.appendChild(paramInput);

        } else if (selectedAction === 'remove_location_ref') {
            // No parameters

        } else if (selectedAction === 'set_shipping_method') {
            // single string param
            const paramInput = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-1',
                placeholder: 'Enter shipping method'
            });
            container.appendChild(paramInput);

        } else if (selectedAction === 'set_gcd_currency') {
            // single string param
            const paramInput = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-1',
                placeholder: 'Enter currency (e.g. GBP)'
            });
            container.appendChild(paramInput);

        } else if (selectedAction === 'set_gcd_seller_address' || selectedAction === 'set_gcd_sold_to') {
            // same as set_custom_address except no dropdown
            addCustomAddressParameters(container, false);

        } else if (selectedAction === 'set_gcd_incoterms') {
            const paramInput = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-1',
                placeholder: 'Enter incoterms (e.g. DAP)'
            });
            container.appendChild(paramInput);

        } else if (selectedAction === 'set_gcd_place_of_incoterms') {
            const paramInput = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-1',
                placeholder: 'Enter place of incoterms (City name)'
            });
            container.appendChild(paramInput);

        // --- REPLACED BLOCK for ID Numbers ---
        } else if (selectedAction === 'set_gcd_seller_id_numbers' || selectedAction === 'set_gcd_buyer_id_numbers') {
            // UI for adding multiple ID Type/Value pairs
            // container is already cleared at the top

            container.appendChild(createElement('label', {}, 'ID Numbers:')); // Add a label for the section

            // Container for the list of ID pairs
            const listContainer = createElement('div', { className: 'cbm-id-list-container', style: 'margin-top: 5px; margin-bottom: 10px; max-height: 200px; overflow-y: auto; padding: 5px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;' }); // Added styling
            container.appendChild(listContainer);

            // "Add ID" button
            const addBtn = createElement('button', {
                className: 'cbm-button secondary cbm-add-id-pair-btn',
                innerHTML: '<i class="fas fa-plus"></i> Add ID Number'
            });
            addBtn.addEventListener('click', () => {
                const newRow = createIdPairRow(); // Create an empty row using the helper
                listContainer.appendChild(newRow);
                newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); // Scroll the new row into view
            });
            container.appendChild(addBtn);

            // Optionally, add one empty row initially if you prefer
            // listContainer.appendChild(createIdPairRow());

        // --- END REPLACED BLOCK for ID Numbers ---

        } else if (selectedAction === 'use_gcd_unit_alternative_value' ||
                   selectedAction === 'use_line_items_currency_as_gcd_currency' ||
                   selectedAction === 'use_customer_info_as_gcd_buyer_contact') {
            // no parameters

        } else if (selectedAction === 'use_addr_as_gcd_sold_to') {
            // Dropdown with ADDRESS types
            const paramSelect = createElement('select', { className: 'cbm-custom-address-select' },
                createElement('option', { value: 'ADDRESS_FROM' }, 'ADDRESS_FROM'),
                createElement('option', { value: 'ADDRESS_TO' }, 'ADDRESS_TO'),
                createElement('option', { value: 'ADDRESS_RETURN' }, 'ADDRESS_RETURN'),
                createElement('option', { value: 'ADDRESS_CUSTOMER' }, 'ADDRESS_CUSTOMER')
            );
            container.appendChild(paramSelect);

        } else if (selectedAction === 'set_gcd_buyer_contact') {
            // Two fields: email, phone
            container.appendChild(createElement('label', {}, 'Email')); // Changed label for clarity
            const emailInput = createElement('input', {
                type: 'text', // Consider type="email" for basic validation
                className: 'cbm-action-value-1',
                placeholder: 'Enter email address'
            });
            container.appendChild(emailInput);
            container.appendChild(createElement('label', { style: 'margin-top: 5px;' }, 'Phone')); // Changed label for clarity
            const phoneInput = createElement('input', {
                type: 'text', // Consider type="tel"
                className: 'cbm-action-value-2',
                placeholder: 'Enter phone number'
            });
            container.appendChild(phoneInput);

        } else {
            // default single param for actions like add_addon, remove_addon etc.
            const paramInput = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-1',
                placeholder: 'Enter parameter'
            });
            container.appendChild(paramInput);
        }
    }


function addCustomAddressParameters(container, showDropdown = true, paramContainer = null) {
    if (showDropdown) {
        const paramSelect = createElement('select', { className: 'cbm-custom-address-select' },
            createElement('option', { value: 'ADDRESS_FROM' }, 'ADDRESS_FROM'),
            createElement('option', { value: 'ADDRESS_TO' }, 'ADDRESS_TO'),
            createElement('option', { value: 'ADDRESS_RETURN' }, 'ADDRESS_RETURN'),
            createElement('option', { value: 'ADDRESS_CUSTOMER' }, 'ADDRESS_CUSTOMER')
        );
        container.appendChild(paramSelect);
    }

    // Create a wrapper for collapsible address fields
    const wrapper = createElement('div', { className: 'cbm-custom-address-wrapper', style: 'margin-top: 5px;' });

    // Create the bloody toggle button
    const toggleBtn = createElement('button', { className: 'cbm-address-toggle-btn', style: 'margin-bottom: 5px; font-size: 12px;' }, 'Expand Address Fields');
    wrapper.appendChild(toggleBtn);

    // Create the address container, hidden by default
    const addressContainer = createElement('div', { className: 'cbm-custom-address-parameters', style: 'display: none;' },
        // Name
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Name'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-name', placeholder: 'Enter name' })
        ),
        // Address Lines
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Address Lines'),
            createElement('textarea', { className: 'cbm-custom-address-lines', placeholder: 'Enter address lines, separated by commas' })
        ),
        // Apartment Number
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Apartment Number'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-apartment-number', placeholder: 'Enter apartment number' })
        ),
        // Attn
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Attention (Attn)'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-attn', placeholder: 'Enter attn' })
        ),
        // Care Of
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Care Of'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-care-of', placeholder: 'Enter care_of' })
        ),
        // City
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'City'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-city', placeholder: 'Enter city' })
        ),
        // Region
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Region'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-region', placeholder: 'Enter region' })
        ),
        // Subregion
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Subregion'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-subregion', placeholder: 'Enter subregion' })
        ),
        // Street
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Street'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-street', placeholder: 'Enter street' })
        ),
        // Street Number
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Street Number'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-street-number', placeholder: 'Enter street number' })
        ),
        // Door Code
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Door Code'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-door-code', placeholder: 'Enter door code' })
        ),
        // Floor Number
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Floor Number'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-floor-number', placeholder: 'Enter floor number' })
        ),
        // Postal Code
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Postal Code'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-postal-code', placeholder: 'Enter postal code' })
        ),
        // Country
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Country'),
            createElement('input', { type: 'text', className: 'cbm-custom-address-country', placeholder: 'Enter country code' })
        ),
        // Coordinates
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Coordinates (Latitude, Longitude)'),
            createElement('input', { type: 'number', className: 'cbm-custom-address-lat', placeholder: 'Enter latitude' }),
            createElement('input', { type: 'number', className: 'cbm-custom-address-lng', placeholder: 'Enter longitude' })
        )
    );
    wrapper.appendChild(addressContainer);

    // Toggle the address container when the button is clicked
    toggleBtn.addEventListener('click', () => {
        if (addressContainer.style.display === 'none') {
            addressContainer.style.display = 'block';
            toggleBtn.textContent = 'Collapse Address Fields';
        } else {
            addressContainer.style.display = 'none';
            toggleBtn.textContent = 'Expand Address Fields';
        }
    });

    if (paramContainer) {
        paramContainer.appendChild(wrapper);
    } else {
        container.appendChild(wrapper);
    }
}

function populateActionParameters(actionSelect, actionValueRaw, actionParametersDiv) {

        // --- Helper Function: safeParseJSON (Ensure this is accessible) ---
        function safeParseJSON(str) {
            try {
                let jsonString = str.trim();
                // Remove outer quotes if they exist (handle single or double)
                if ((jsonString.startsWith('"') && jsonString.endsWith('"')) ||
                    (jsonString.startsWith("'") && jsonString.endsWith("'"))) {
                    jsonString = jsonString.slice(1, -1);
                }
                // Unescape commonly escaped characters within the stringified JSON
                jsonString = jsonString.replace(/\\"/g, '"')
                                     .replace(/\\'/g, "'")
                                     .replace(/\\\\/g, '\\'); // Handle double escapes
                return JSON.parse(jsonString);
            } catch (e) {
                console.error('Failed to parse JSON:', str, e);
                return null; // Return null on failure
            }
        }
        // --- End Helper ---

        // Use the reliable parameter extractor first
        const fullExpression = `${actionSelect}(${actionValueRaw})`;
        const params = processParameters(fullExpression); // Returns parameters without outer quotes

        // --- Clear div before populating ---
        actionParametersDiv.innerHTML = '';

        // Address-based actions (Copied from previous answer - ensure addCustomAddressParameters exists)
        if (actionSelect === 'set_custom_address' ||
            actionSelect === 'set_gcd_seller_address' ||
            actionSelect === 'set_gcd_sold_to') {

            let addressJSON;
            let addressType = '';

            if (actionSelect === 'set_custom_address') {
                // Two params: addressType, jsonString
                if (params.length < 2) {
                    console.error(`[CBM Builder] Error parsing ${actionSelect}: Expected 2 parameters, got ${params.length}. Raw: ${actionValueRaw}`);
                    return; // Stop processing this action
                }
                addressType = params[0]; // First param is the type (e.g., ADDRESS_FROM)
                let jsonString = params[1]; // Second param is the JSON string
                addressJSON = safeParseJSON(jsonString); // Use safeParseJSON which handles internal quotes
            } else {
                // One param: jsonString
                if (params.length < 1) {
                    console.error(`[CBM Builder] Error parsing ${actionSelect}: Expected 1 parameter, got ${params.length}. Raw: ${actionValueRaw}`);
                    return; // Stop processing this action
                }
                let jsonString = params[0]; // Single parameter is the JSON string
                addressJSON = safeParseJSON(jsonString);
            }

            if (!addressJSON) {
                showNotification(`Failed to parse address JSON for ${actionSelect}. Check console.`, 'danger');
                console.error(`[CBM Builder] Could not parse Address JSON from:`, params);
                // Maybe add a raw text area for manual correction?
                actionParametersDiv.appendChild(createElement('textarea', { style: 'width: 100%; height: 100px; border: 1px solid red;', value: params.join(', '), title:"Invalid Address JSON" }));
                return; // Stop processing this action if JSON is invalid
            }

            // Rebuild the UI elements for address
            const showDropdown = (actionSelect === 'set_custom_address');
            addCustomAddressParameters(actionParametersDiv, showDropdown); // This clears and rebuilds the address UI inside actionParametersDiv

            // Populate the rebuilt UI
            if (showDropdown) {
                const paramSelect = actionParametersDiv.querySelector('.cbm-custom-address-select');
                if (paramSelect) paramSelect.value = addressType;
            }

            // Find the container *within* the rebuilt structure
            const addressContainer = actionParametersDiv.querySelector('.cbm-custom-address-parameters');
            if (!addressContainer) {
                console.error("[CBM Builder] Address parameter container not found after rebuild.");
                return;
            }

            // Populate fields, checking for existence before setting value
            const trySet = (selector, value) => {
                const el = addressContainer.querySelector(selector);
                if (el) el.value = value || ''; // Set to empty string if value is null/undefined
            };

            trySet('.cbm-custom-address-name', addressJSON.name);
            trySet('.cbm-custom-address-lines', Array.isArray(addressJSON.address_lines) ? addressJSON.address_lines.join(', ') : '');
            trySet('.cbm-custom-address-apartment-number', addressJSON.apartment_number);
            trySet('.cbm-custom-address-attn', addressJSON.attn);
            trySet('.cbm-custom-address-care-of', addressJSON.care_of);
            trySet('.cbm-custom-address-city', addressJSON.city);
            trySet('.cbm-custom-address-region', addressJSON.region);
            trySet('.cbm-custom-address-subregion', addressJSON.subregion);
            trySet('.cbm-custom-address-street', addressJSON.street);
            trySet('.cbm-custom-address-street-number', addressJSON.street_number);
            trySet('.cbm-custom-address-door-code', addressJSON.door_code);
            trySet('.cbm-custom-address-floor-number', addressJSON.floor_number);
            trySet('.cbm-custom-address-postal-code', addressJSON.postal_code);
            trySet('.cbm-custom-address-country', addressJSON.country);

            const latInput = addressContainer.querySelector('.cbm-custom-address-lat');
            const lngInput = addressContainer.querySelector('.cbm-custom-address-lng');
            if (addressJSON.coordinates && typeof addressJSON.coordinates.lat === 'number' && typeof addressJSON.coordinates.lng === 'number') {
                if (latInput) latInput.value = addressJSON.coordinates.lat;
                if (lngInput) lngInput.value = addressJSON.coordinates.lng;
            } else {
                if (latInput) latInput.value = '';
                if (lngInput) lngInput.value = '';
            }

            // Make address fields visible if they contain data
            const toggleBtn = actionParametersDiv.querySelector('.cbm-address-toggle-btn');
            if (Object.keys(addressJSON).length > 0 && addressContainer && toggleBtn && addressContainer.style.display === 'none') {
                addressContainer.style.display = 'block';
                toggleBtn.textContent = 'Collapse Address Fields';
            }

        } else if (actionSelect === 'set_custom_address_company_name') {
            if (params.length < 2) {
                console.error(`[CBM Builder] Error parsing ${actionSelect}: Expected 2 parameters, got ${params.length}. Raw: ${actionValueRaw}`);
                return;
            }
            const addressType = params[0];
            const companyName = params[1];

            // Rebuild UI
            addActionParametersUI(actionSelect, actionParametersDiv);

            // Populate
            const selectEl = actionParametersDiv.querySelector('.cbm-custom-address-select');
            const inputEl = actionParametersDiv.querySelector('.cbm-action-value-2');
            if (selectEl) selectEl.value = addressType;
            if (inputEl) inputEl.value = companyName;

        } else if (actionSelect === 'remove_location_ref' ||
                   actionSelect === 'use_gcd_unit_alternative_value' ||
                   actionSelect === 'use_line_items_currency_as_gcd_currency' ||
                   actionSelect === 'use_customer_info_as_gcd_buyer_contact') {
            // No parameters, UI is already empty or handled by addActionParametersUI

        } else if (actionSelect === 'use_addr_as_gcd_sold_to') {
            if (params.length < 1) {
                console.error(`[CBM Builder] Error parsing ${actionSelect}: Expected 1 parameter, got ${params.length}. Raw: ${actionValueRaw}`);
                return;
            }
            const addressType = params[0];
            // Rebuild UI
            addActionParametersUI(actionSelect, actionParametersDiv);
            // Populate
            const selectEl = actionParametersDiv.querySelector('.cbm-custom-address-select');
            if (selectEl) selectEl.value = addressType;

        } else if (actionSelect === 'set_gcd_buyer_contact') {
            if (params.length < 1) {
                console.error(`[CBM Builder] Error parsing ${actionSelect}: Expected 1 parameter (JSON string), got ${params.length}. Raw: ${actionValueRaw}`);
                return;
            }
            let jsonString = params[0];
            const contactData = safeParseJSON(jsonString);

            // Rebuild UI
            addActionParametersUI(actionSelect, actionParametersDiv);

            // Populate
            if (contactData) {
                const emailInput = actionParametersDiv.querySelector('.cbm-action-value-1');
                const phoneInput = actionParametersDiv.querySelector('.cbm-action-value-2');
                if (emailInput) emailInput.value = contactData.email || '';
                if (phoneInput) phoneInput.value = contactData.phone || '';
            } else {
                showNotification(`Failed to parse contact JSON for ${actionSelect}. Check console.`, 'danger');
                console.error(`[CBM Builder] Could not parse Contact JSON from:`, jsonString);
                // Optionally add raw text area
                actionParametersDiv.appendChild(createElement('textarea', { style: 'width: 100%; height: 60px; border: 1px solid red;', value: jsonString, title:"Invalid Contact JSON" }));
            }

        // --- REPLACED BLOCK for ID Numbers ---
        } else if (actionSelect === 'set_gcd_seller_id_numbers' || actionSelect === 'set_gcd_buyer_id_numbers') {
            // Prefill UI for multiple ID pairs from a single JSON string parameter

            // 1. Rebuild the basic UI structure (container + Add button) first
            // This ensures the list container exists before we try to append to it.
            addActionParametersUI(actionSelect, actionParametersDiv);
            const listContainer = actionParametersDiv.querySelector('.cbm-id-list-container');

            if (!listContainer) {
                console.error(`[CBM Builder] ID List Container not found for ${actionSelect} after UI rebuild.`);
                 showNotification(`UI Error: Could not find list container for ${actionSelect}.`, 'danger');
                return; // Cannot proceed
            }

            // 2. Check if we have the expected single parameter from extraction
            if (params.length !== 1) {
                console.error(`[CBM Builder] Error parsing ${actionSelect}: Expected 1 JSON string parameter, got ${params.length}. Raw: ${actionValueRaw}`);
                showNotification(`Error loading parameters for ${actionSelect}. Expected 1 JSON string. Check console.`, 'danger');
                // Display raw parameter(s) for debugging/correction
                actionParametersDiv.appendChild(createElement('textarea', { style: 'width: 100%; height: 60px; border: 1px solid red; margin-top: 10px;', value: actionValueRaw, title:"Raw parameter data - Should be a single JSON string like '{\"vat\":\"123\"}'" }));
                return;
            }

            // 3. Parse the JSON string parameter
            const jsonStringParam = params[0]; // The single parameter should be the JSON string
            const idData = safeParseJSON(jsonStringParam); // Use the robust parser

            if (!idData || typeof idData !== 'object' || Array.isArray(idData)) {
                console.error(`[CBM Builder] Failed to parse parameter for ${actionSelect} as a valid JSON object. Parameter:`, jsonStringParam);
                showNotification(`Failed to parse ID data for ${actionSelect}. Check JSON format.`, 'danger');
                // Display raw parameter for debugging/correction
                actionParametersDiv.appendChild(createElement('textarea', { style: 'width: 100%; height: 60px; border: 1px solid red; margin-top: 10px;', value: jsonStringParam, title:"Invalid JSON object - Should be like '{\"vat\":\"123\", \"eori\":\"456\"}'" }));
                return;
            }

            // 4. Populate the list container with rows based on the parsed data
            listContainer.innerHTML = ''; // Clear any potential default rows added by addActionParametersUI
            let count = 0;
            for (const idType in idData) {
                if (Object.prototype.hasOwnProperty.call(idData, idType)) {
                    const idValue = idData[idType];
                    // Ensure the value is treated as a string for the input field
                    const valueStr = (typeof idValue === 'string' || typeof idValue === 'number') ? String(idValue) : '';

                    if (valueStr) { // Only add if value is not empty after conversion
                        // Use the helper function to create and append the row
                        const newRow = createIdPairRow(idType, valueStr);
                        listContainer.appendChild(newRow);
                        count++;
                    } else {
                        console.warn(`[CBM Builder] Skipping empty or non-string/number value for ID type '${idType}' in ${actionSelect}. Value:`, idValue);
                    }
                }
            }
            console.log(`[CBM Builder] Populated ${count} ID pairs for ${actionSelect}.`);
            // If no valid pairs were found in the JSON, the list container will remain empty.
            // The user can then use the "Add ID" button.

        // --- END REPLACED BLOCK for ID Numbers ---

        } else if (actionSelect === 'add_addon_for_carrier') {
            if (params.length < 2) {
                console.error(`[CBM Builder] Error parsing ${actionSelect}: Expected 2 parameters, got ${params.length}. Raw: ${actionValueRaw}`);
                return;
            }
            const param1 = params[0];
            const param2 = params[1];
            // Rebuild UI
            addActionParametersUI(actionSelect, actionParametersDiv);
            // Populate
            const input1 = actionParametersDiv.querySelector('.cbm-action-value-1');
            const input2 = actionParametersDiv.querySelector('.cbm-action-value-2');
            if (input1) input1.value = param1;
            if (input2) input2.value = param2;

        } else if (actionSelect === 'set_shipping_method' ||
                   actionSelect === 'set_gcd_currency' ||
                   actionSelect === 'set_gcd_incoterms' ||
                   actionSelect === 'set_gcd_place_of_incoterms' ||
                   actionSelect === 'add_addon' || // Assuming these take one param
                   actionSelect === 'remove_addon'
                  ) {
            if (params.length < 1) {
                 // Allow empty param for some actions? For now, log error if expected 1.
                 if (actionSelect !== 'remove_addon') { // remove_addon might have optional param sometimes? Check API. Assuming required for others.
                    console.error(`[CBM Builder] Error parsing ${actionSelect}: Expected 1 parameter, got ${params.length}. Raw: ${actionValueRaw}`);
                     // Rebuild UI anyway so user can enter value
                     addActionParametersUI(actionSelect, actionParametersDiv);
                    return;
                 }
                 // If it's remove_addon with 0 params, proceed to build UI.
            }
             const param1 = params[0] || ''; // Use empty string if param is missing (e.g., remove_addon())
            // Rebuild UI
            addActionParametersUI(actionSelect, actionParametersDiv);
            // Populate
            const input1 = actionParametersDiv.querySelector('.cbm-action-value-1');
            if (input1) input1.value = param1;

        } else if (actionSelect === 'add_meta' || actionSelect === 'add_default_meta') {
            // Handles both regular ('key', 'value') and address ('key', '{address_json}')
             if (params.length < 1) { // Allow for just a key with empty value? Let's require at least the key.
                console.error(`[CBM Builder] Error parsing ${actionSelect}: Expected at least 1 parameter (key), got ${params.length}. Raw: ${actionValueRaw}`);
                addActionParametersUI(actionSelect, actionParametersDiv); // Build UI anyway
                return;
            }
            const firstParam = params[0]; // The 'key'
            const secondParam = params[1] || ''; // The 'value' or '{address_json}' string, default to empty if missing

            // Determine if secondParam is likely an address JSON
            let isAddressMode = false;
            let addressJSON = null;
            try {
                // A simple check: does it look like JSON object and contain address_lines?
                if (secondParam.trim().startsWith('{') && secondParam.includes('address_lines')) {
                    addressJSON = safeParseJSON(secondParam); // Use robust parser
                    if (addressJSON && typeof addressJSON === 'object' && !Array.isArray(addressJSON)) {
                        isAddressMode = true;
                    } else {
                         addressJSON = null; // Invalid JSON object, treat as regular string
                    }
                }
            } catch (e) { /* Ignore parsing errors here, treat as regular string */ }

            // Rebuild UI - this sets up the dropdown and initial state (regular or address)
            addActionParametersUI(actionSelect, actionParametersDiv);

            // Find elements in the rebuilt UI
            const extraDropdown = actionParametersDiv.querySelector('.cbm-extra-dropdown');
            const paramContainer = actionParametersDiv.querySelector('.cbm-meta-parameters'); // Container for params/address

            if (!extraDropdown || !paramContainer) {
                console.error("[CBM Builder] Meta/Default Meta UI elements not found after rebuild.");
                return;
            }

            // Set dropdown state and populate fields
            if (isAddressMode) {
                extraDropdown.value = 'address';
                // Trigger the change event handler manually to rebuild the address UI inside paramContainer
                extraDropdown.dispatchEvent(new Event('change'));

                // Populate the newly created address fields
                const addressFirstParamInput = paramContainer.querySelector('.cbm-action-value-1');
                if (addressFirstParamInput) addressFirstParamInput.value = firstParam;

                const addressContainer = paramContainer.querySelector('.cbm-custom-address-parameters');
                if (addressContainer && addressJSON) {
                    const trySetAddr = (selector, value) => {
                        const el = addressContainer.querySelector(selector);
                        if (el) el.value = value || '';
                    };
                    // Populate all address fields... (Same as in set_custom_address block)
                    trySetAddr('.cbm-custom-address-name', addressJSON.name);
                    trySetAddr('.cbm-custom-address-lines', Array.isArray(addressJSON.address_lines) ? addressJSON.address_lines.join(', ') : '');
                    trySetAddr('.cbm-custom-address-apartment-number', addressJSON.apartment_number);
                    trySetAddr('.cbm-custom-address-attn', addressJSON.attn);
                    trySetAddr('.cbm-custom-address-care-of', addressJSON.care_of);
                    trySetAddr('.cbm-custom-address-city', addressJSON.city);
                    trySetAddr('.cbm-custom-address-region', addressJSON.region);
                    trySetAddr('.cbm-custom-address-subregion', addressJSON.subregion);
                    trySetAddr('.cbm-custom-address-street', addressJSON.street);
                    trySetAddr('.cbm-custom-address-street-number', addressJSON.street_number);
                    trySetAddr('.cbm-custom-address-door-code', addressJSON.door_code);
                    trySetAddr('.cbm-custom-address-floor-number', addressJSON.floor_number);
                    trySetAddr('.cbm-custom-address-postal-code', addressJSON.postal_code);
                    trySetAddr('.cbm-custom-address-country', addressJSON.country);
                    const latInput = addressContainer.querySelector('.cbm-custom-address-lat');
                    const lngInput = addressContainer.querySelector('.cbm-custom-address-lng');
                    if (addressJSON.coordinates && typeof addressJSON.coordinates.lat === 'number' && typeof addressJSON.coordinates.lng === 'number') {
                        if (latInput) latInput.value = addressJSON.coordinates.lat;
                        if (lngInput) lngInput.value = addressJSON.coordinates.lng;
                    } else {
                        if (latInput) latInput.value = '';
                        if (lngInput) lngInput.value = '';
                    }

                    // Expand address if populated
                    const toggleBtnAddr = paramContainer.querySelector('.cbm-address-toggle-btn');
                    if (Object.keys(addressJSON).length > 0 && addressContainer.style.display === 'none' && toggleBtnAddr) {
                        addressContainer.style.display = 'block';
                        toggleBtnAddr.textContent = 'Collapse Address Fields';
                    }
                }

            } else {
                // Regular mode (second param was not valid address JSON or missing)
                extraDropdown.value = 'regular';
                // UI is already in regular mode by default from addActionParametersUI
                const regParamInput1 = paramContainer.querySelector('.cbm-action-value-1');
                const regParamInput2 = paramContainer.querySelector('.cbm-action-value-2');
                if (regParamInput1) regParamInput1.value = firstParam;
                if (regParamInput2) regParamInput2.value = secondParam; // Populate the second field with the non-JSON string or empty string
            }

        } else {
            // Fallback for any other action - assume single parameter if params exist
            console.warn(`[CBM Builder] Using default parameter handling for action: ${actionSelect}`);
            addActionParametersUI(actionSelect, actionParametersDiv); // Rebuild basic UI if needed
            if (params.length > 0) {
                const paramInput = actionParametersDiv.querySelector('.cbm-action-value-1');
                if (paramInput) {
                    // Join params back together if multiple were unexpectedly parsed for a single-param action
                    paramInput.value = params.join(', ');
                } else {
                    // If no input field, maybe display raw params?
                    actionParametersDiv.appendChild(createElement('p', { style:'color: grey; font-style: italic;'}, `Params: ${params.join(', ')}`));
                }
            }
        }
    }


    /* ------------------- Initialization and other functions ------------------- */

    const injectFontAwesomeAndCSS = () => {
        injectFontAwesome();
        injectCSS();
    };

    const initializeBuilder = () => {
        window.cbmConfig = {
            custom_booking_methods: []
        };

        createNotification();

        const modalOverlay = createModalOverlay('cbm-builder-modal-overlay');

        const mainModal = createElement('div', { id: 'cbm-builder-modal', style: `
            position: relative;
            background: #fff;
            width: 90%;
            max-width: 1200px;
            height: 85%;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 6px 12px rgba(0,0,0,0.2);
            position: relative;
            animation: slideIn 0.3s;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        ` },
            createElement('div', { id: 'cbm-header' },
                createElement('h2', { innerHTML: `<i class="fas fa-bookmark"></i> Custom Booking Methods Builder` }),
            ),
            createElement('div', { id: 'cbm-content' },
                createElement('div', { className: 'cbm-section', id: 'cbm-section-methods' },
                    createElement('div', {
                        style: 'display: flex; justify-content: flex-end; align-items: center; margin-bottom: 8px;'
                    },
                        createElement('div', {},
                            createElement('button', { className: 'cbm-button', id: 'export-json-btn', innerHTML: `<i class="fas fa-file-export"></i> Export JSON` }),
                            createElement('button', { className: 'cbm-button', id: 'publish-config-btn', innerHTML: `<i class="fas fa-upload"></i> Publish Configuration` })
                        )
                    ),
                    createElement('button', { className: 'cbm-button', id: 'add-method-btn', innerHTML: `<i class="fas fa-plus"></i> Add Booking Method` }),
                    createElement('table', { className: 'cbm-table', id: 'methods-table' },
                        createElement('thead', {},
                            createElement('tr', {},
                                createElement('th', {}, 'Method'),
                                createElement('th', {}, 'Carrier'),
                                createElement('th', {}, 'Booking Method'),
                                createElement('th', {}, 'Name'),
                                createElement('th', {}, 'Return Booking'),
                                createElement('th', {}, 'Steps'),
                                createElement('th', {}, 'Actions')
                            )
                        ),
                        createElement('tbody', {})
                    )
                )
            )
        );

        modalOverlay.appendChild(mainModal);
        addCloseButton(mainModal, 'cbm-builder-modal-overlay');

        mainModal.querySelector('#add-method-btn').addEventListener('click', () => {
            openAddMethodModal(modalOverlay);
        });

        mainModal.querySelector('#export-json-btn').addEventListener('click', () => {
            exportJSON();
        });

        mainModal.querySelector('#publish-config-btn').addEventListener('click', () => {
            publishConfig();
        });

        const addBookingMethodRow = (methodData) => {
            const tbody = mainModal.querySelector('#methods-table tbody');
            const tr = createElement('tr', {},
                createElement('td', { className: 'cbm-method' }, methodData.method || ''),
                createElement('td', { className: 'cbm-carrier' }, methodData.carrier || ''),
                createElement('td', { className: 'cbm-booking-method' }, methodData.booking_method || ''),
                createElement('td', { className: 'cbm-name' }, methodData.name || ''),
                createElement('td', { className: 'cbm-return-booking' },
                    methodData.return_booking
                        ? createElement('ul', {},
                            createElement('li', {}, `Label Consolidation: ${methodData.return_booking.label_consolidation}`),
                            createElement('li', {}, `Method: ${methodData.return_booking.method || ''}`),
                            createElement('li', {}, `Use Address From as Return: ${methodData.return_booking.use_address_from_as_return}`)
                        )
                        : ''
                ),
                createElement('td', { className: 'cbm-steps' },
                    methodData.steps && methodData.steps.length > 0
                        ? createElement('ul', {},
                            ...methodData.steps.map(step => createElement('li', {}, step.name))
                        )
                        : ''
                ),
                createElement('td', { className: 'cbm-actions' },
                    createElement('button', { className: 'cbm-button secondary edit-method-btn', innerHTML: `<i class="fas fa-edit"></i> Edit` }),
                    createElement('button', { className: 'cbm-button danger delete-method-btn', innerHTML: `<i class="fas fa-trash-alt"></i> Delete` }),
                    createElement('button', {
                        className: 'cbm-button clone-method-btn',
                        innerHTML: `<i class="fas fa-copy"></i> Clone`,
                        style: 'background: rgb(23, 162, 184); color: #ffffff;'
                    })
                )
            );

            tr.querySelector('.edit-method-btn').addEventListener('click', () => {
                openEditMethodModal(tr, methodData.method);
            });

            tr.querySelector('.delete-method-btn').addEventListener('click', () => {
                if(confirm(`Are you sure you want to delete the booking method "${methodData.method}"?`)) {
                    tbody.removeChild(tr);
                    window.cbmConfig.custom_booking_methods = window.cbmConfig.custom_booking_methods.filter(m => m.method !== methodData.method);
                    showNotification('Booking method deleted successfully.');
                }
            });

            tr.querySelector('.clone-method-btn').addEventListener('click', () => {
                const latestMethodData = window.cbmConfig.custom_booking_methods.find(m => m.method === methodData.method);
                if (!latestMethodData) {
                    showNotification('Booking method data not found.', 'danger');
                    console.error(`[CBM Builder] Booking method data not found for cloning: ${methodData.method}`);
                    return;
                }
                const methodDataCopy = JSON.parse(JSON.stringify(latestMethodData));
                methodDataCopy.method = '';
                if (methodDataCopy.steps && methodDataCopy.steps.length > 0) {
                    methodDataCopy.steps.forEach(step => {
                        if (step.actions && step.actions.length > 0) {
                            step.actions.forEach(action => {
                                const regex = /^(\w+)\((.*)\)$/;
                                const match = action.expression.match(regex);
                                if (match) {
                                    const actionSelect = match[1];
                                    const actionValueRaw = match[2];
                                    const actionValue = processActionValue(actionValueRaw);
                                    action.expression = `${actionSelect}${actionValue}`;
                                }
                            });
                        }
                    });
                }
                openAddMethodModal(modalOverlay, methodDataCopy);
            });

            tbody.appendChild(tr);
            window.cbmConfig.custom_booking_methods.push(methodData);
        };

        const initializeBuilderWithData = (data) => {
            const methods = Array.isArray(data.custom_booking_methods) ? data.custom_booking_methods : [];
            window.cbmConfig = { custom_booking_methods: [] };
            const tbody = mainModal.querySelector('#methods-table tbody');
            tbody.innerHTML = '';

            methods.forEach(method => {
                const validatedSteps = Array.isArray(method.steps) ? method.steps.map(step => ({
                    ...step,
                    filters: Array.isArray(step.filters) ? step.filters : [],
                    actions: Array.isArray(step.actions) ? step.actions : []
                })) : [];

                const validatedMethod = {
                    method: method.method || '',
                    carrier: method.carrier || '',
                    booking_method: method.booking_method || '',
                    name: method.name || '',
                    return_booking: method.return_booking ? {
                        label_consolidation: method.return_booking.label_consolidation || false,
                        method: method.return_booking.method || '',
                        use_address_from_as_return: method.return_booking.use_address_from_as_return || false
                    } : null,
                    steps: validatedSteps
                };
                addBookingMethodRow(validatedMethod);
            });
        };

        const fetchConfiguration = () => {
            const siteId = unsafeWindow.siteId;
            const authToken = unsafeWindow.authToken;

            if (!siteId || !authToken) {
                console.error('Site ID or Auth Token not found.');
                showNotification('Site ID or Auth Token not found.', 'danger');
                return;
            }

            let apiEndpoint = `https://api-stage.ingrid.com/v1/config/site.get?siteId=${siteId}`;
            const pageUrl = window.location.href;

            if (pageUrl.startsWith('https://mad.ingrid.com/')) {
                apiEndpoint = `https://api.ingrid.com/v1/config/site.get?siteId=${siteId}`;
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
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const cbmData = { custom_booking_methods: data.site?.custom_booking_methods || [] };
                window.fullData = data;
                window.cbmVersion = data.site?.version || '1';
                initializeBuilderWithData(cbmData);
                openModal(modalOverlay);
            })
            .catch(error => {
                console.error('Failed to fetch custom booking methods:', error);
                showNotification('Failed to fetch custom booking methods.', 'danger');
            });
        };

        fetchConfiguration();

const openAddMethodModal = (parentOverlay, methodData = null) => {
    const addModalOverlay = createModalOverlay('cbm-add-method-modal-overlay');
    const addModal = createElement('div', { id: 'cbm-add-method-modal', style: `
        background: #fff;
        width: 90%;
        max-width: 800px;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        position: relative;
        max-height: 90%;
        overflow-y: auto;
        animation: slideIn 0.3s ease-out;
    ` },
        createElement('h3', { innerHTML: `<i class="fas fa-plus"></i> Add Booking Method` }),
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', { for: 'cbm-method' }, 'Method Identifier'),
            createElement('input', { type: 'text', id: 'cbm-method', placeholder: 'Enter method identifier' })
        ),
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', { for: 'cbm-carrier' }, 'Carrier Name'),
            createElement('input', { type: 'text', id: 'cbm-carrier', placeholder: 'Enter carrier name' })
        ),
        // Booking Method dropdown
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', { for: 'cbm-booking-method' }, 'Booking Method'),
            createElement('select', { id: 'cbm-booking-method' })
        ),
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', { for: 'cbm-name' }, 'Name'),
            createElement('input', { type: 'text', id: 'cbm-name', placeholder: 'Enter name' })
        ),
        // Return booking toggle
        createElement('div', { className: 'cbm-form-group cbm-toggle-switch' },
            createElement('label', { for: 'cbm-return-booking-toggle' }, 'Add Return Booking?'),
            createElement('input', { type: 'checkbox', id: 'cbm-return-booking-toggle' })
        ),
        // Return booking container (initially hidden)
        createElement('div', { className: 'cbm-return-booking-container', style: 'display: none;' },
            createElement('div', { className: 'cbm-form-group' },
                createElement('label', { for: 'cbm-return-label-consolidation' }, 'Label Consolidation'),
                createElement('select', { id: 'cbm-return-label-consolidation' },
                    createElement('option', { value: 'true' }, 'True'),
                    createElement('option', { value: 'false' }, 'False')
                )
            ),
            // Return Method dropdown
            createElement('div', { className: 'cbm-form-group' },
                createElement('label', { for: 'cbm-return-method' }, 'Return Method'),
                createElement('select', { id: 'cbm-return-method' })
            ),
            createElement('div', { className: 'cbm-form-group' },
                createElement('label', { for: 'cbm-use-address-from-as-return' }, 'Use Address From as Return'),
                createElement('select', { id: 'cbm-use-address-from-as-return' },
                    createElement('option', { value: 'true' }, 'True'),
                    createElement('option', { value: 'false' }, 'False')
                )
            )
        ),
        // Steps toggle and container
        createElement('div', { className: 'cbm-form-group cbm-toggle-switch' },
            createElement('label', { for: 'cbm-steps-toggle' }, 'Add Steps?'),
            createElement('input', { type: 'checkbox', id: 'cbm-steps-toggle' })
        ),
        createElement('div', { className: 'cbm-steps-container', style: 'display: none;' },
            createElement('button', { className: 'cbm-button', id: 'cbm-add-step-btn' }, 'Add Step'),
            createElement('div', { className: 'cbm-steps-fields' })
        ),
        // Final buttons
        createElement('div', { style: 'margin-top: 10px; display: flex; gap: 10px;' },
            createElement('button', { className: 'cbm-button', id: 'cbm-save-method-btn', innerHTML: `<i class="fas fa-save"></i> Save` }),
            createElement('button', { className: 'cbm-button secondary', id: 'cbm-cancel-method-btn', innerHTML: `<i class="fas fa-times"></i> Cancel` })
        )
    );

    addModalOverlay.appendChild(addModal);
    openModal(addModalOverlay);
    addCloseButton(addModal, 'cbm-add-method-modal-overlay');

    // Populate both dropdowns with shipping methods
    const bookingMethodSelect = addModal.querySelector('#cbm-booking-method');
    const returnMethodSelect = addModal.querySelector('#cbm-return-method');
    populateBothShippingMethodsDropdowns(bookingMethodSelect, returnMethodSelect);

    // Toggle the Return Booking container
    const returnBookingToggle = addModal.querySelector('#cbm-return-booking-toggle');
    const returnBookingContainer = addModal.querySelector('.cbm-return-booking-container');
    returnBookingToggle.addEventListener('change', function() {
        returnBookingContainer.style.display = this.checked ? 'block' : 'none';
    });

    // Toggle the Steps container
    const stepsToggle = addModal.querySelector('#cbm-steps-toggle');
    const stepsContainer = addModal.querySelector('.cbm-steps-container');
    stepsToggle.addEventListener('change', function() {
        stepsContainer.style.display = this.checked ? 'block' : 'none';
    });

    // Add a bloody step when the button is clicked – ensure your addStepField function calls addMoveArrows on the new step
    addModal.querySelector('#cbm-add-step-btn').addEventListener('click', () => {
        const stepsFields = addModal.querySelector('.cbm-steps-fields');
        addStepField(stepsFields);
    });

    // Cancel and Save buttons
    addModal.querySelector('#cbm-cancel-method-btn').addEventListener('click', () => {
        closeModal(addModalOverlay);
    });
    addModal.querySelector('#cbm-save-method-btn').addEventListener('click', () => {
        saveMethod(addModal, addBookingMethodRow, addModalOverlay);
    });

    if (methodData) {
        preFillAddMethodModal(addModal, methodData);
    }
};



        const preFillAddMethodModal = (addModal, methodData) => {
            addModal.querySelector('#cbm-method').value = methodData.method || '';
            addModal.querySelector('#cbm-carrier').value = methodData.carrier || '';
            addModal.querySelector('#cbm-booking-method').value = methodData.booking_method || '';
            addModal.querySelector('#cbm-name').value = methodData.name || '';

            if (methodData.return_booking) {
                addModal.querySelector('#cbm-return-booking-toggle').checked = true;
                addModal.querySelector('.cbm-return-booking-container').style.display = 'block';
                addModal.querySelector('#cbm-return-label-consolidation').value = methodData.return_booking.label_consolidation.toString();
                addModal.querySelector('#cbm-return-method').value = methodData.return_booking.method || '';
                addModal.querySelector('#cbm-use-address-from-as-return').value = methodData.return_booking.use_address_from_as_return.toString();
            }

            if (methodData.steps && methodData.steps.length > 0) {
                addModal.querySelector('#cbm-steps-toggle').checked = true;
                addModal.querySelector('.cbm-steps-container').style.display = 'block';
                const stepsFields = addModal.querySelector('.cbm-steps-fields');
                methodData.steps.forEach(step => {
                    addStepField(stepsFields, step);
                });
            }
        };

function addStepField(container, stepData = null) {
    const availableActions = getAvailableActions();
    const stepDiv = createElement('div', { className: 'cbm-step-field' },
        createElement('div', { className: 'cbm-step-header' },
            createElement('i', { className: 'fas fa-tasks' }),
            'Step'
        ),
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', { for: 'cbm-step-name' }, 'Step Name'),
            createElement('input', { type: 'text', className: 'cbm-step-name', placeholder: 'Enter step name', value: stepData ? stepData.name : '' })
        ),
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Filters'),
            createElement('button', { className: 'cbm-button secondary cbm-add-filter-btn', innerHTML: `<i class="fas fa-plus"></i> Add Filter` }),
            createElement('div', { className: 'cbm-filters-fields' })
        ),
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', {}, 'Actions'),
            createElement('button', { className: 'cbm-button secondary cbm-add-action-btn', innerHTML: `<i class="fas fa-plus"></i> Add Action` }),
            createElement('div', { className: 'cbm-actions-fields' })
        ),
        createElement('button', {
            className: 'cbm-button danger cbm-remove-step-btn',
            innerHTML: `<i class="fas fa-times"></i> Remove Step`,
            style: 'margin-top: 10px;'
        })
    );

    // Add bloody move arrows to the step element
    addMoveArrows(stepDiv);

    // Event listener for adding a filter
    stepDiv.querySelector('.cbm-add-filter-btn').addEventListener('click', () => {
        const filtersFields = stepDiv.querySelector('.cbm-filters-fields');
        const newFilter = createFilterForm();
        filtersFields.appendChild(newFilter);
        newFilter.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Event listener for adding an action
    stepDiv.querySelector('.cbm-add-action-btn').addEventListener('click', () => {
        const actionsFields = stepDiv.querySelector('.cbm-actions-fields');
        const newAction = createActionForm(availableActions);
        actionsFields.appendChild(newAction);
        newAction.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Remove step event
    stepDiv.querySelector('.cbm-remove-step-btn').addEventListener('click', () => {
        stepDiv.remove();
    });

    // If there's existing step data, prefill filters and actions
    if (stepData) {
        const filtersFields = stepDiv.querySelector('.cbm-filters-fields');
        if (stepData.filters && stepData.filters.length > 0) {
            stepData.filters.forEach(filter => {
                filtersFields.appendChild(createFilterForm(filter));
            });
        }
        const actionsFields = stepDiv.querySelector('.cbm-actions-fields');
        if (stepData.actions && stepData.actions.length > 0) {
            stepData.actions.forEach(action => {
                actionsFields.appendChild(createActionForm(availableActions, action));
            });
        }
    }

    container.appendChild(stepDiv);
    // Only scroll if we're adding a new step (i.e. no pre-existing data)
    if (!stepData) {
        stepDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}


        const saveMethod = (addModal, addBookingMethodRow, addModalOverlay) => {
            const method = addModal.querySelector('#cbm-method').value.trim();
            const carrier = addModal.querySelector('#cbm-carrier').value.trim();
            const booking_method = addModal.querySelector('#cbm-booking-method').value.trim();
            const name = addModal.querySelector('#cbm-name').value.trim();

            let return_booking = null;
            const returnBookingToggle = addModal.querySelector('#cbm-return-booking-toggle');
            if (returnBookingToggle.checked) {
                const label_consolidation = addModal.querySelector('#cbm-return-label-consolidation').value === 'true';
                const return_method = addModal.querySelector('#cbm-return-method').value.trim();
                const use_address_from_as_return = addModal.querySelector('#cbm-use-address-from-as-return').value === 'true';
                return_booking = {
                    label_consolidation,
                    method: return_method || undefined,
                    use_address_from_as_return
                };
            }

            let steps = [];
            const stepsToggle = addModal.querySelector('#cbm-steps-toggle');
            if (stepsToggle.checked) {
                const stepsFields = addModal.querySelectorAll('.cbm-step-field');
                let allStepsValid = true;
                stepsFields.forEach(stepField => {
                    const stepName = stepField.querySelector('.cbm-step-name').value.trim();
                    if (!stepName) {
                        showNotification('Please enter all step names.', 'danger');
                        console.warn('[CBM Builder] Step name is missing.');
                        allStepsValid = false;
                        return;
                    }

                    const filters = [];
                    const filterFields = stepField.querySelectorAll('.cbm-filter');
                    filterFields.forEach(filterField => {
                        const filterInput = filterField.querySelector('.cbm-filter-input').value.trim();
                        if (filterInput) {
                            filters.push({
                                expression: filterInput
                            });
                        }
                    });

                    const actions = [];
                    const actionFields = stepField.querySelectorAll('.cbm-action');
                    actionFields.forEach(actionField => {
                        const actionSelect = actionField.querySelector('.cbm-action-select').value;
                        if (!actionSelect) return;

                        // Build expression from inputs
                        const actionParams = buildActionExpression(actionField, actionSelect);
                        if (actionParams) {
                            actions.push({ expression: actionParams });
                        }
                    });

                    steps.push({
                        name: stepName,
                        filters: filters,
                        actions: actions
                    });
                });

                if (!allStepsValid) {
                    return;
                }
            }

const methodInput = addModal.querySelector('#cbm-method');
const nameInput = addModal.querySelector('#cbm-name');

// Clear any previous bloody error highlights
methodInput.classList.remove('error');
nameInput.classList.remove('error');

if (!method || !name) {
    if (!method) {
        methodInput.classList.add('error');
        // Remove the error when clicking into it
        methodInput.addEventListener('focus', () => {
            methodInput.classList.remove('error');
        }, { once: true });
    }
    if (!name) {
        nameInput.classList.add('error');
        nameInput.addEventListener('focus', () => {
            nameInput.classList.remove('error');
        }, { once: true });
    }
    // Scroll the first error element into view if it isn't visible
    const firstError = addModal.querySelector('.cbm-form-group input.error, .cbm-form-group select.error, .cbm-form-group textarea.error');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showNotification('Please fill in all required fields.', 'danger');
    console.warn('[CBM Builder] Missing required fields.');
    return;
}

            if(window.cbmConfig.custom_booking_methods.some(m => m.method === method)) {
                showNotification('Booking method already exists.', 'danger');
                console.warn(`[CBM Builder] Duplicate booking method detected: ${method}`);
                return;
            }

            const methodData = {
                method,
                name,
                ...(carrier && { carrier }),
                ...(booking_method && { booking_method }),
                ...(return_booking && { return_booking }),
                steps: steps
            };

            addBookingMethodRow(methodData);
            showNotification('Booking method added successfully.');
            closeModal(addModalOverlay);
        };

function buildActionExpression(actionField, actionSelect) {
        // This function constructs the action expression string based on the UI inputs and action type

        // Helper to safely quote strings for the expression parameter list (use for simple string params)
        const quote = (str) => `'${(str || '').replace(/'/g, "\\'")}'`; // Basic single quote escaping

        // Helper to build address JSON string, returns null if no fields filled
        // (Ensure addCustomAddressParameters and this helper are defined correctly elsewhere)
        const buildAddressJSON = (addressContainer) => {
            if (!addressContainer) return null;

            const getValue = (selector) => addressContainer.querySelector(selector)?.value.trim() || '';
            const getFloat = (selector) => {
                const val = addressContainer.querySelector(selector)?.value.trim();
                // Only parse if not empty, return NaN otherwise
                return val !== '' ? parseFloat(val) : NaN;
            };

            const addressObj = {};
            const nameInput = getValue('.cbm-custom-address-name');
            const addressLinesInput = getValue('.cbm-custom-address-lines');
            const apartmentNumber = getValue('.cbm-custom-address-apartment-number');
            const attn = getValue('.cbm-custom-address-attn');
            const careOf = getValue('.cbm-custom-address-care-of');
            const cityInput = getValue('.cbm-custom-address-city');
            const region = getValue('.cbm-custom-address-region');
            const subregion = getValue('.cbm-custom-address-subregion');
            const street = getValue('.cbm-custom-address-street');
            const streetNumber = getValue('.cbm-custom-address-street-number');
            const doorCode = getValue('.cbm-custom-address-door-code');
            const floorNumber = getValue('.cbm-custom-address-floor-number');
            const postalCode = getValue('.cbm-custom-address-postal-code');
            const countryInput = getValue('.cbm-custom-address-country');
            const lat = getFloat('.cbm-custom-address-lat');
            const lng = getFloat('.cbm-custom-address-lng');

            if (nameInput) addressObj.name = nameInput;
            if (addressLinesInput) {
                const lines = addressLinesInput.split(',').map(line => line.trim()).filter(line => line !== '');
                if (lines.length > 0) addressObj.address_lines = lines;
            }
            if (apartmentNumber) addressObj.apartment_number = apartmentNumber;
            if (attn) addressObj.attn = attn;
            if (careOf) addressObj.care_of = careOf;
            if (cityInput) addressObj.city = cityInput;
            if (region) addressObj.region = region;
            if (subregion) addressObj.subregion = subregion;
            if (street) addressObj.street = street;
            if (streetNumber) addressObj.street_number = streetNumber;
            if (doorCode) addressObj.door_code = doorCode;
            if (floorNumber) addressObj.floor_number = floorNumber;
            if (postalCode) addressObj.postal_code = postalCode;
            if (countryInput) addressObj.country = countryInput;
            // Check BOTH lat and lng are valid numbers before adding coordinates
            if (!isNaN(lat) && !isNaN(lng)) {
                addressObj.coordinates = { lat, lng };
            }

            // Only return JSON if at least one property was added
            if (Object.keys(addressObj).length > 0) {
                // Stringify and escape double quotes for embedding in the action string
                return JSON.stringify(addressObj).replace(/"/g, '\\"');
            }
            return null; // Return null if address is empty
        };


        if (actionSelect === 'set_custom_address') {
            const paramSelectEl = actionField.querySelector('.cbm-custom-address-select');
            const addressContainer = actionField.querySelector('.cbm-custom-address-wrapper .cbm-custom-address-parameters'); // Target nested container
            const addressType = paramSelectEl ? paramSelectEl.value : '';
            const addressJSON = buildAddressJSON(addressContainer);

            if (addressType && addressJSON) {
                // Use double quotes for the JSON part as it contains escaped double quotes itself
                return `${actionSelect}(${quote(addressType)}, "${addressJSON}")`;
            } else {
                console.warn(`[CBM Builder] Incomplete data for ${actionSelect}. Type: ${addressType}, Address JSON: ${addressJSON}`);
                showNotification(`Address type and some address details required for ${actionSelect}.`, 'danger');
                // Highlight missing parts?
                if (!addressType && paramSelectEl) paramSelectEl.classList.add('error'); else if(paramSelectEl) paramSelectEl.classList.remove('error');
                // Maybe add error class to address wrapper if addressJSON is null?
                 const wrapper = actionField.querySelector('.cbm-custom-address-wrapper');
                 if (!addressJSON && wrapper) wrapper.style.border = '1px solid red'; else if (wrapper) wrapper.style.border = 'none';
                return null;
            }

        } else if (actionSelect === 'set_gcd_seller_address' || actionSelect === 'set_gcd_sold_to') {
            const addressContainer = actionField.querySelector('.cbm-custom-address-wrapper .cbm-custom-address-parameters'); // Target nested container
            const addressJSON = buildAddressJSON(addressContainer);
            if (addressJSON) {
                // Use double quotes for the JSON part
                return `${actionSelect}("${addressJSON}")`;
            } else {
                console.warn(`[CBM Builder] Incomplete address data for ${actionSelect}.`);
                showNotification(`Some address details required for ${actionSelect}.`, 'danger');
                 const wrapper = actionField.querySelector('.cbm-custom-address-wrapper');
                 if (wrapper) wrapper.style.border = '1px solid red';
                return null;
            }

        } else if (actionSelect === 'set_custom_address_company_name') {
            const paramSelectEl = actionField.querySelector('.cbm-custom-address-select');
            const companyNameInputEl = actionField.querySelector('.cbm-action-value-2');
            const addressType = paramSelectEl ? paramSelectEl.value : '';
            const companyName = companyNameInputEl ? companyNameInputEl.value.trim() : '';

            if (addressType && companyName) {
                return `${actionSelect}(${quote(addressType)}, ${quote(companyName)})`;
            } else {
                console.warn(`[CBM Builder] Incomplete data for ${actionSelect}. Type: ${addressType}, Name: ${companyName}`);
                showNotification(`Address type and Company Name required for ${actionSelect}.`, 'danger');
                 if (!addressType && paramSelectEl) paramSelectEl.classList.add('error'); else if (paramSelectEl) paramSelectEl.classList.remove('error');
                 if (!companyName && companyNameInputEl) companyNameInputEl.classList.add('error'); else if (companyNameInputEl) companyNameInputEl.classList.remove('error');
                return null;
            }

        } else if (actionSelect === 'remove_location_ref' ||
                   actionSelect === 'use_gcd_unit_alternative_value' ||
                   actionSelect === 'use_line_items_currency_as_gcd_currency' ||
                   actionSelect === 'use_customer_info_as_gcd_buyer_contact') {
            // Actions with no parameters
            return `${actionSelect}()`;

        } else if (actionSelect === 'use_addr_as_gcd_sold_to') {
            const paramSelectEl = actionField.querySelector('.cbm-custom-address-select');
            const addressType = paramSelectEl ? paramSelectEl.value : '';
            if (addressType) {
                return `${actionSelect}(${quote(addressType)})`;
            } else {
                console.warn(`[CBM Builder] Address type not selected for ${actionSelect}.`);
                showNotification(`Address type required for ${actionSelect}.`, 'danger');
                 if (paramSelectEl) paramSelectEl.classList.add('error');
                return null;
            }

        } else if (actionSelect === 'set_gcd_buyer_contact') {
            const emailInput = actionField.querySelector('.cbm-action-value-1');
            const phoneInput = actionField.querySelector('.cbm-action-value-2');
            const email = emailInput ? emailInput.value.trim() : '';
            const phone = phoneInput ? phoneInput.value.trim() : '';

            const contactData = {};
            if (email) contactData.email = email;
            if (phone) contactData.phone = phone;

            // Only proceed if at least one field is filled
            if (Object.keys(contactData).length > 0) {
                const contactJSON = JSON.stringify(contactData).replace(/"/g, '\\"');
                return `${actionSelect}("${contactJSON}")`;
            } else {
                console.warn(`[CBM Builder] No contact info entered for ${actionSelect}.`);
                showNotification(`Email or Phone required for ${actionSelect}.`, 'danger');
                 if (emailInput) emailInput.classList.add('error');
                 if (phoneInput) phoneInput.classList.add('error');
                return null;
            }

        // --- REPLACED BLOCK for ID Numbers ---
        } else if (actionSelect === 'set_gcd_seller_id_numbers' || actionSelect === 'set_gcd_buyer_id_numbers') {
            // Build the single JSON string parameter from multiple UI rows

            const listContainer = actionField.querySelector('.cbm-id-list-container');
            if (!listContainer) {
                console.error(`[CBM Builder] ID List Container not found when building expression for ${actionSelect}`);
                return null; // Cannot build expression
            }

            const idRows = listContainer.querySelectorAll('.cbm-id-pair-row');
            const idObject = {};
            let isOverallValid = true;
            let hasDuplicateTypes = false;
            const typeCounts = {}; // To track duplicates

            idRows.forEach(row => {
                const typeSelect = row.querySelector('.cbm-id-type-select');
                const valueInput = row.querySelector('.cbm-id-value-input');

                const idType = typeSelect ? typeSelect.value : '';
                const idValue = valueInput ? valueInput.value.trim() : '';

                let rowIsValid = true;
                // Validate: Both type and value are required for a row to be included
                if (!idType) {
                    if (typeSelect) typeSelect.classList.add('error');
                    rowIsValid = false;
                    isOverallValid = false;
                } else {
                    if (typeSelect) typeSelect.classList.remove('error'); // Clear previous error
                }
                if (!idValue) {
                    if (valueInput) valueInput.classList.add('error');
                    rowIsValid = false;
                    isOverallValid = false;
                } else {
                    if (valueInput) valueInput.classList.remove('error'); // Clear previous error
                }

                if (rowIsValid) {
                    // Check for duplicate types
                    if (idObject.hasOwnProperty(idType)) {
                        console.warn(`[CBM Builder] Duplicate ID Type '${idType}' detected for ${actionSelect}. The last value will be used.`);
                        hasDuplicateTypes = true;
                        // Optionally highlight the duplicate row's type selector
                         if (typeSelect) {
                             typeSelect.style.border = '1px solid orange'; // Highlight duplicate type
                             typeSelect.title = 'Duplicate type - last value wins';
                         }

                    } else {
                        // Clear previous duplicate warning style if any
                         if (typeSelect) {
                            typeSelect.style.border = ''; // Reset border
                            typeSelect.title = ''; // Clear title
                         }
                    }
                    idObject[idType] = idValue; // Add or overwrite the value
                }
            });

            if (!isOverallValid) {
                showNotification(`Incomplete ID information for ${actionSelect}. Please complete or remove invalid rows.`, 'danger');
                return null; // Don't save if any row is invalid
            }

            if (hasDuplicateTypes) {
                showNotification(`Duplicate ID types found for ${actionSelect}. The last value for each type was used.`, 'warning');
            }

            // Proceed only if we have at least one valid ID pair
            if (Object.keys(idObject).length === 0) {
                console.warn(`[CBM Builder] No valid ID pairs entered for ${actionSelect}. Action will not be saved.`);
                showNotification(`No valid ID numbers entered for ${actionSelect}. Add at least one.`, 'danger');
                return null; // Don't save an empty object action
            }

            // Stringify the object and escape it for the action parameter
            const jsonString = JSON.stringify(idObject);
            // Escape necessary characters to embed the JSON string within the action string parameter
            // Primarily need to escape double quotes and backslashes
            const escapedJsonString = jsonString.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

            // Format the final expression: actionSelect("escaped JSON string")
            return `${actionSelect}("${escapedJsonString}")`; // Use double quotes around the JSON string parameter

        // --- END REPLACED BLOCK for ID Numbers ---

        } else if (actionSelect === 'add_meta' || actionSelect === 'add_default_meta') {
            const extraDropdown = actionField.querySelector('.cbm-extra-dropdown');
            const selection = extraDropdown ? extraDropdown.value : 'regular'; // Default to regular if dropdown not found

            if (selection === 'regular') {
                const fieldNameInput = actionField.querySelector('.cbm-meta-parameters .cbm-action-value-1');
                const fieldValueInput = actionField.querySelector('.cbm-meta-parameters .cbm-action-value-2');
                const fieldName = fieldNameInput ? fieldNameInput.value.trim() : '';
                const fieldValue = fieldValueInput ? fieldValueInput.value.trim() : '';

                if (fieldName) { // Require at least a field name
                    return `${actionSelect}(${quote(fieldName)}, ${quote(fieldValue)})`;
                } else {
                    console.warn(`[CBM Builder] Field name missing for ${actionSelect} in regular mode.`);
                    showNotification(`Field name required for ${actionSelect}.`, 'danger');
                    if (fieldNameInput) fieldNameInput.classList.add('error'); else if (fieldNameInput) fieldNameInput.classList.remove('error');
                    return null;
                }
            } else if (selection === 'address') {
                const addressFirstParamInput = actionField.querySelector('.cbm-meta-parameters .cbm-action-value-1');
                const addressContainer = actionField.querySelector('.cbm-meta-parameters .cbm-custom-address-wrapper .cbm-custom-address-parameters'); // Nested container
                const addressFirstParam = addressFirstParamInput ? addressFirstParamInput.value.trim() : '';
                const addressJSON = buildAddressJSON(addressContainer);

                if (addressFirstParam && addressJSON) {
                    return `${actionSelect}(${quote(addressFirstParam)}, "${addressJSON}")`;
                } else {
                    console.warn(`[CBM Builder] Incomplete data for ${actionSelect} in address mode. Param1: ${addressFirstParam}, Address JSON: ${addressJSON}`);
                    showNotification(`First parameter and some address data required for ${actionSelect} in address mode.`, 'danger');
                     if (!addressFirstParam && addressFirstParamInput) addressFirstParamInput.classList.add('error'); else if (addressFirstParamInput) addressFirstParamInput.classList.remove('error');
                     const wrapper = actionField.querySelector('.cbm-meta-parameters .cbm-custom-address-wrapper');
                     if (!addressJSON && wrapper) wrapper.style.border = '1px solid red'; else if (wrapper) wrapper.style.border = 'none';
                    return null;
                }
            } else {
                console.error(`[CBM Builder] Unknown selection type '${selection}' for ${actionSelect}.`);
                return null; // Should not happen
            }

        } else {
            // Fallback for other actions, typically expecting one parameter or specific handling already done.
            // Attempt to find a single input parameter
            const paramInput = actionField.querySelector('.cbm-action-parameters .cbm-action-value-1');
            const paramValue = paramInput ? paramInput.value.trim() : null;

            if (paramValue !== null) { // If an input exists and has a value (or is empty string)
                // Check if action is known to take zero params (already handled above, but as a safeguard)
                const zeroParamActions = ['remove_location_ref', 'use_gcd_unit_alternative_value', 'use_line_items_currency_as_gcd_currency', 'use_customer_info_as_gcd_buyer_contact'];
                if (zeroParamActions.includes(actionSelect)) {
                     // If a value was entered for a zero-param action, maybe warn?
                     if(paramValue !== '') console.warn(`[CBM Builder] Parameter value found for zero-parameter action ${actionSelect}. Value will be ignored.`);
                    return `${actionSelect}()`;
                } else {
                    // Assume single parameter needed
                    return `${actionSelect}(${quote(paramValue)})`;
                }
            } else {
                // No input found or value is null
                 // Check if it's known zero param action without an input field anyway
                const zeroParamActions = ['remove_location_ref', 'use_gcd_unit_alternative_value', 'use_line_items_currency_as_gcd_currency', 'use_customer_info_as_gcd_buyer_contact'];
                if (zeroParamActions.includes(actionSelect)) {
                    return `${actionSelect}()`;
                } else {
                     // Action might require parameters but UI is missing or complex (e.g., multiple inputs not handled here)
                     // Check if it's an action we know requires a parameter that wasn't found
                     const knownSingleParamActions = ['set_shipping_method', 'set_gcd_currency', 'set_gcd_incoterms', 'set_gcd_place_of_incoterms', 'add_addon', 'remove_addon']; // Example list
                     if(knownSingleParamActions.includes(actionSelect)){
                        console.error(`[CBM Builder] Parameter input missing or empty for required parameter action ${actionSelect}.`);
                        showNotification(`Parameter required for ${actionSelect}.`, 'danger');
                         // If paramInput exists but is empty, add error class
                         if(paramInput) paramInput.classList.add('error');
                         return null; // Prevent saving invalid action
                     } else {
                         // If it's an unknown action or one genuinely taking zero params not listed above
                         console.warn(`[CBM Builder] Could not determine parameters for action ${actionSelect} using default logic. Assuming no parameters.`);
                         return `${actionSelect}()`;
                     }
                }
            }
        }
    }
const openEditMethodModal = (tr, method) => {
    const methodData = window.cbmConfig.custom_booking_methods.find(m => m.method === method);
    if (!methodData) {
        showNotification('Booking method not found.', 'danger');
        console.error(`[CBM Builder] Booking method not found: ${method}`);
        return;
    }

    const editModalOverlay = createModalOverlay('cbm-edit-method-modal-overlay');
    const editModal = createElement('div', { id: 'cbm-edit-method-modal', style: `
        background: #fff;
        width: 90%;
        max-width: 800px;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        position: relative;
        max-height: 90%;
        overflow-y: auto;
        animation: slideIn 0.3s ease-out;
    ` },
        createElement('h3', { innerHTML: `<i class="fas fa-edit"></i> Edit Booking Method` }),
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', { for: 'cbm-method' }, 'Method Identifier'),
            createElement('input', { type: 'text', id: 'cbm-method', placeholder: 'Enter method identifier', value: methodData.method || '', disabled: true })
        ),
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', { for: 'cbm-carrier' }, 'Carrier Name'),
            createElement('input', { type: 'text', id: 'cbm-carrier', placeholder: 'Enter carrier name', value: methodData.carrier || '' })
        ),
        // Booking Method dropdown
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', { for: 'cbm-booking-method' }, 'Booking Method'),
            createElement('select', { id: 'cbm-booking-method' })
        ),
        createElement('div', { className: 'cbm-form-group' },
            createElement('label', { for: 'cbm-name' }, 'Name'),
            createElement('input', { type: 'text', id: 'cbm-name', placeholder: 'Enter name', value: methodData.name || '' })
        ),
        // Return booking toggle
        createElement('div', { className: 'cbm-form-group cbm-toggle-switch' },
            createElement('label', { for: 'cbm-return-booking-toggle' }, 'Add Return Booking?'),
            createElement('input', { type: 'checkbox', id: 'cbm-return-booking-toggle', checked: !!methodData.return_booking })
        ),
        // Return booking container
        createElement('div', { className: 'cbm-return-booking-container', style: methodData.return_booking ? 'display: block;' : 'display: none;' },
            createElement('div', { className: 'cbm-form-group' },
                createElement('label', { for: 'cbm-return-label-consolidation' }, 'Label Consolidation'),
                createElement('select', { id: 'cbm-return-label-consolidation' },
                    createElement('option', { value: 'true', selected: methodData.return_booking?.label_consolidation === true }, 'True'),
                    createElement('option', { value: 'false', selected: methodData.return_booking?.label_consolidation === false }, 'False')
                )
            ),
            // Return Method dropdown
            createElement('div', { className: 'cbm-form-group' },
                createElement('label', { for: 'cbm-return-method' }, 'Return Method'),
                createElement('select', { id: 'cbm-return-method' })
            ),
            createElement('div', { className: 'cbm-form-group' },
                createElement('label', { for: 'cbm-use-address-from-as-return' }, 'Use Address From as Return'),
                createElement('select', { id: 'cbm-use-address-from-as-return' },
                    createElement('option', { value: 'true', selected: methodData.return_booking?.use_address_from_as_return === true }, 'True'),
                    createElement('option', { value: 'false', selected: methodData.return_booking?.use_address_from_as_return === false }, 'False')
                )
            )
        ),
        // Steps toggle and container
        createElement('div', { className: 'cbm-form-group cbm-toggle-switch' },
            createElement('label', { for: 'cbm-steps-toggle' }, 'Add Steps?'),
            createElement('input', { type: 'checkbox', id: 'cbm-steps-toggle', checked: !!(methodData.steps && methodData.steps.length) })
        ),
        createElement('div', { className: 'cbm-steps-container', style: (methodData.steps && methodData.steps.length) ? 'display: block;' : 'display: none;' },
            createElement('button', { className: 'cbm-button', id: 'cbm-add-step-btn' }, 'Add Step'),
            createElement('div', { className: 'cbm-steps-fields' })
        ),
        // Final buttons
        createElement('div', { style: 'margin-top: 10px; display: flex; gap: 10px;' },
            createElement('button', { className: 'cbm-button', id: 'cbm-update-method-btn', innerHTML: `<i class="fas fa-save"></i> Update` }),
            createElement('button', { className: 'cbm-button secondary', id: 'cbm-cancel-method-btn', innerHTML: `<i class="fas fa-times"></i> Cancel` })
        )
    );

    editModalOverlay.appendChild(editModal);
    openModal(editModalOverlay);
    addCloseButton(editModal, 'cbm-edit-method-modal-overlay');

    // Populate dropdowns with current selections
    const bookingMethodSelect = editModal.querySelector('#cbm-booking-method');
    const returnMethodSelect = editModal.querySelector('#cbm-return-method');
    populateBothShippingMethodsDropdowns(bookingMethodSelect, returnMethodSelect, methodData.booking_method || '', methodData.return_booking?.method || '');

    // Toggle the Return Booking container
    const returnBookingToggle = editModal.querySelector('#cbm-return-booking-toggle');
    const returnBookingContainer = editModal.querySelector('.cbm-return-booking-container');
    returnBookingToggle.addEventListener('change', function() {
        returnBookingContainer.style.display = this.checked ? 'block' : 'none';
    });

    // Toggle the Steps container
    const stepsToggle = editModal.querySelector('#cbm-steps-toggle');
    const stepsContainer = editModal.querySelector('.cbm-steps-container');
    stepsToggle.addEventListener('change', function() {
        stepsContainer.style.display = this.checked ? 'block' : 'none';
    });
    editModal.querySelector('#cbm-add-step-btn').addEventListener('click', () => {
        const stepsFields = editModal.querySelector('.cbm-steps-fields');
        addStepField(stepsFields);
    });

    if (methodData.steps && methodData.steps.length) {
        const stepsFields = editModal.querySelector('.cbm-steps-fields');
        methodData.steps.forEach(step => {
            addStepField(stepsFields, step);
        });
    }

    editModal.querySelector('#cbm-cancel-method-btn').addEventListener('click', () => {
        closeModal(editModalOverlay);
    });
    editModal.querySelector('#cbm-update-method-btn').addEventListener('click', () => {
        updateMethod(editModal, tr, methodData, editModalOverlay);
    });
};

        const updateMethod = (editModal, tr, methodData, editModalOverlay) => {
            const carrier = editModal.querySelector('#cbm-carrier').value.trim();
            const booking_method = editModal.querySelector('#cbm-booking-method').value.trim();
            const name = editModal.querySelector('#cbm-name').value.trim();

            let return_booking = null;
            const returnBookingToggle = editModal.querySelector('#cbm-return-booking-toggle');
            if (returnBookingToggle.checked) {
                const label_consolidation = editModal.querySelector('#cbm-return-label-consolidation').value === 'true';
                const return_method = editModal.querySelector('#cbm-return-method').value.trim();
                const use_address_from_as_return = editModal.querySelector('#cbm-use-address-from-as-return').value === 'true';
                return_booking = {
                    label_consolidation,
                    method: return_method || undefined,
                    use_address_from_as_return
                };
            }

            let steps = [];
            const stepsToggle = editModal.querySelector('#cbm-steps-toggle');
            if (stepsToggle.checked) {
                const stepsFields = editModal.querySelectorAll('.cbm-step-field');
                let allStepsValid = true;
                stepsFields.forEach(stepField => {
                    const stepName = stepField.querySelector('.cbm-step-name').value.trim();
                    if (!stepName) {
                        showNotification('Please enter all step names.', 'danger');
                        console.warn('[CBM Builder] Step name is missing.');
                        allStepsValid = false;
                        return;
                    }

                    const filters = [];
                    const filterFields = stepField.querySelectorAll('.cbm-filter');
                    filterFields.forEach(filterField => {
                        const filterInput = filterField.querySelector('.cbm-filter-input').value.trim();
                        if (filterInput) {
                            filters.push({ expression: filterInput });
                        }
                    });

                    const actions = [];
                    const actionFields = stepField.querySelectorAll('.cbm-action');
                    actionFields.forEach(actionField => {
                        const actionSelect = actionField.querySelector('.cbm-action-select').value;
                        if (!actionSelect) return;
                        const actionParams = buildActionExpression(actionField, actionSelect);
                        if (actionParams) {
                            actions.push({ expression: actionParams });
                        }
                    });

                    steps.push({
                        name: stepName,
                        filters: filters,
                        actions: actions
                    });
                });

                if (!allStepsValid) {
                    return;
                }
            }

const nameInput = editModal.querySelector('#cbm-name');
nameInput.classList.remove('error');

if (!methodData.method || !name) {
    if (!name) {
        nameInput.classList.add('error');
        nameInput.addEventListener('focus', () => {
            nameInput.classList.remove('error');
        }, { once: true });
    }
    // Scroll the error element into view if needed
    const firstError = editModal.querySelector('.cbm-form-group input.error, .cbm-form-group select.error, .cbm-form-group textarea.error');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showNotification('Please fill in all required fields.', 'danger');
    console.warn('[CBM Builder] Missing required fields.');
    return;
}
            const updatedMethodData = {
                method: methodData.method,
                name,
                ...(carrier && { carrier }),
                ...(booking_method && { booking_method }),
                ...(return_booking && { return_booking }),
                steps: steps
            };

            const carrierCell = tr.querySelector('.cbm-carrier');
            const bookingMethodCell = tr.querySelector('.cbm-booking-method');
            const nameCell = tr.querySelector('.cbm-name');
            const returnBookingCell = tr.querySelector('.cbm-return-booking');
            const stepsCell = tr.querySelector('.cbm-steps');

            if (carrierCell) carrierCell.textContent = updatedMethodData.carrier || '';
            if (bookingMethodCell) bookingMethodCell.textContent = updatedMethodData.booking_method || '';
            if (nameCell) nameCell.textContent = updatedMethodData.name || '';

            if(returnBookingCell) {
                returnBookingCell.innerHTML = updatedMethodData.return_booking
                    ? `<ul>
                        <li>Label Consolidation: ${updatedMethodData.return_booking.label_consolidation}</li>
                        <li>Method: ${updatedMethodData.return_booking.method || ''}</li>
                        <li>Use Address From as Return: ${updatedMethodData.return_booking.use_address_from_as_return}</li>
                      </ul>`
                    : '';
            }

            if(stepsCell) {
                stepsCell.innerHTML = updatedMethodData.steps.length > 0
                    ? `<ul>${updatedMethodData.steps.map(step => `<li>${step.name}</li>`).join('')}</ul>`
                    : '';
            }

            const methodIndex = window.cbmConfig.custom_booking_methods.findIndex(m => m.method === methodData.method);
            if(methodIndex !== -1) {
                window.cbmConfig.custom_booking_methods[methodIndex] = updatedMethodData;
            }

            showNotification('Booking method updated successfully.');
            closeModal(editModalOverlay);
        };

        const exportJSON = () => {
            const finalJSON = removeEmpty(window.cbmConfig.custom_booking_methods);
            const jsonString = JSON.stringify(finalJSON, null, 4);

            const jsonModalOverlay = createModalOverlay('cbm-json-modal-overlay');
            const jsonModal = createJSONExportModal(jsonString);
            jsonModalOverlay.appendChild(jsonModal);
            openModal(jsonModalOverlay);
            addCloseButton(jsonModal, 'cbm-json-modal-overlay');

            jsonModal.querySelector('#cbm-json-close-btn').addEventListener('click', () => {
                closeModal(jsonModalOverlay);
            });

            jsonModal.querySelector('#cbm-copy-json-btn').addEventListener('click', () => {
                const textarea = jsonModal.querySelector('#cbm-json-textarea');
                textarea.select();
                document.execCommand('copy');
                showNotification('JSON copied to clipboard!');
            });

            jsonModal.querySelector('#cbm-download-json-btn').addEventListener('click', () => {
                const blob = new Blob([jsonString], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'custom_booking_methods.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showNotification('JSON downloaded successfully!');
            });
        };

        const createJSONExportModal = (jsonString) => {
            const modalContent = createElement('div', { style: `
                background: #fff;
                width: 90%;
                max-width: 1000px;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                position: relative;
                max-height: 90%;
                overflow-y: auto;
                animation: slideIn 0.3s ease-out;
            ` },
                createElement('span', { id: 'cbm-json-close-btn', style: `
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    font-size: 24px;
                    font-weight: bold;
                    color: #aaa;
                    cursor: pointer;
                ` }, '×'),
                createElement('h3', { innerHTML: `<i class="fas fa-file-export"></i> Exported JSON` }),
                createElement('textarea', {
                    id: 'cbm-json-textarea',
                    style: `
                        width: 100%;
                        height: 600px;
                        padding: 10px;
                        border: 1px solid #ced4da;
                        border-radius: 4px;
                        resize: vertical;
                        font-family: monospace;
                        font-size: 14px;
                    `,
                    readOnly: true,
                    value: jsonString
                }),
                createElement('div', { style: 'margin-top: 10px; display: flex; gap: 10px;' },
                    createElement('button', { className: 'cbm-button secondary', id: 'cbm-copy-json-btn', innerHTML: `<i class="fas fa-copy"></i> Copy to Clipboard` }),
                    createElement('button', { className: 'cbm-button', id: 'cbm-download-json-btn', innerHTML: `<i class="fas fa-download"></i> Download JSON` })
                )
            );
            return modalContent;
        };

        const removeEmpty = (obj) => {
            if (Array.isArray(obj)) {
                return obj
                    .map(v => removeEmpty(v))
                    .filter(v => v != null && (typeof v !== 'object' || Object.keys(v).length > 0));
            } else if (obj !== null && typeof obj === 'object') {
                const newObj = {};
                Object.keys(obj).forEach(key => {
                    const value = removeEmpty(obj[key]);
                    if (value !== null && (typeof value !== 'object' || Object.keys(value).length > 0)) {
                        newObj[key] = value;
                    }
                });
                return Object.keys(newObj).length > 0 ? newObj : null;
            }
            return obj;
        };

        const publishConfig = () => {
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

            const { custom_booking_methods, ...restData } = window.fullData || {};
            const payload = {
                ...restData,
                site: {
                    ...(restData.site || {}),
                    custom_booking_methods: removeEmpty(window.cbmConfig.custom_booking_methods),
                    version: window.cbmVersion || '1'
                }
            };

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
                if (data.site && data.site.version) {
                    window.cbmVersion = data.site.version;
                }
            })
            .catch(error => {
                console.error('Failed to publish configuration:', error);
                showNotification('Failed to publish configuration.', 'danger');
            });
        };

        injectFontAwesomeAndCSS();

        window.openCBMBuilder = () => {
            const builderModalOverlay = document.getElementById('cbm-builder-modal-overlay');
            if(builderModalOverlay) {
                builderModalOverlay.style.display = 'flex';
            } else {
                initializeBuilder();
            }
        };
    };

    window.addEventListener('openCBMBuilder', function() {
        initializeBuilder();
    }, false);

    window.openCBMBuilder = initializeBuilder;

})();
