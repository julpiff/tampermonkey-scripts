// ==UserScript==
// @name         Custom Booking Methods Builder
// @namespace    http://tampermonkey.net/
// @version      1.2
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
        { value: 'set_gcd_seller_id_numbers', label: 'Set GCD Seller ID Numbers' }, // Two fields: VAT/EORI
        { value: 'set_gcd_buyer_id_numbers', label: 'Set GCD Buyer ID Numbers' }, // Dropdown then fields
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
    // Adjusted to incorporate the "address" vs "regular parameter" logic for add_meta and add_default_meta

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

    } else if (selectedAction === 'set_gcd_seller_id_numbers') {
        // Two fields: VAT/EORI
        container.appendChild(createElement('label', {}, 'VAT Number'));
        const vatInput = createElement('input', {
            type: 'text',
            className: 'cbm-action-value-1',
            placeholder: 'VAT Number'
        });
        container.appendChild(vatInput);
        container.appendChild(createElement('label', {}, 'EORI Number'));
        const eoriInput = createElement('input', {
            type: 'text',
            className: 'cbm-action-value-2',
            placeholder: 'EORI Number'
        });
        container.appendChild(eoriInput);

    } else if (selectedAction === 'set_gcd_buyer_id_numbers') {
        // Dropdown with "VAT+EORI" or "EIN"
        const dropdown = createElement('select', { className: 'cbm-buyer-id-type' },
            createElement('option', { value: '' }, 'Select ID Type'),
            createElement('option', { value: 'VAT+EORI' }, 'VAT + EORI'),
            createElement('option', { value: 'EIN' }, 'EIN')
        );
        container.appendChild(dropdown);
        const fieldsContainer = createElement('div', { className: 'cbm-buyer-id-fields' });
        container.appendChild(fieldsContainer);

        // On change populate fields
        dropdown.addEventListener('change', () => {
            fieldsContainer.innerHTML = '';
            if (dropdown.value === 'VAT+EORI') {
                fieldsContainer.appendChild(createElement('label', {}, 'VAT Number'));
                const vatInput = createElement('input', {
                    type: 'text',
                    className: 'cbm-action-value-1',
                    placeholder: 'VAT Number'
                });
                fieldsContainer.appendChild(vatInput);
                fieldsContainer.appendChild(createElement('label', {}, 'EORI Number'));
                const eoriInput = createElement('input', {
                    type: 'text',
                    className: 'cbm-action-value-2',
                    placeholder: 'EORI Number'
                });
                fieldsContainer.appendChild(eoriInput);
            } else if (dropdown.value === 'EIN') {
                fieldsContainer.appendChild(createElement('label', {}, 'EIN'));
                const einInput = createElement('input', {
                    type: 'text',
                    className: 'cbm-action-value-1',
                    placeholder: 'EIN Number'
                });
                fieldsContainer.appendChild(einInput);
            }
        });

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
        container.appendChild(createElement('label', {}, 'email'));
        const emailInput = createElement('input', {
            type: 'text',
            className: 'cbm-action-value-1',
            placeholder: 'email'
        });
        container.appendChild(emailInput);
        container.appendChild(createElement('label', {}, 'phone'));
        const phoneInput = createElement('input', {
            type: 'text',
            className: 'cbm-action-value-2',
            placeholder: 'phone'
        });
        container.appendChild(phoneInput);

    } else {
        // default single param
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
    function safeParseJSON(str) {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.error('Failed to parse JSON:', str, e);
            return null;
        }
    }

    function extractJSONString(raw) {
        let jsonString = raw.trim();
        if ((jsonString.startsWith('"') && jsonString.endsWith('"')) ||
            (jsonString.startsWith("'") && jsonString.endsWith("'"))) {
            jsonString = jsonString.slice(1, -1);
        }
        jsonString = jsonString.replace(/\\"/g, '"').replace(/\\'/g, "'");
        return jsonString;
    }

// Construct the full value with parentheses around actionValueRaw
const fullValue = `(${actionValueRaw})`;

// Construct the full expression: actionSelect + the parameters
const fullExpression = `${actionSelect}${fullValue}`;

// Use the new parser directly
const params = processParameters(fullExpression);

// Now 'params' contains the fully processed parameters
// For example, with add_meta('my_first_param', "{...address JSON...}")
// params might be: ['my_first_param', '{"name":"Julien ...","address_lines":["..."] ...}']

    // Address-based actions
    if (actionSelect === 'set_custom_address' ||
        actionSelect === 'set_gcd_seller_address' ||
        actionSelect === 'set_gcd_sold_to') {

        let addressJSON;
        let addressType = '';

        if (actionSelect === 'set_custom_address') {
            // Two params: addressType, json
            const firstParam = params[0].replace(/^['"]|['"]$/g, '');
            let jsonString = actionValueRaw.substring(actionValueRaw.indexOf(',') + 1).trim();
            jsonString = extractJSONString(jsonString);
            addressJSON = safeParseJSON(jsonString);
            addressType = firstParam;
        } else {
            // One param: json
            let jsonString = extractJSONString(actionValueRaw);
            addressJSON = safeParseJSON(jsonString);
        }

        if (!addressJSON) return;

        actionParametersDiv.innerHTML = '';
        const showDropdown = (actionSelect === 'set_custom_address');
        addCustomAddressParameters(actionParametersDiv, showDropdown);

        if (showDropdown) {
            const paramSelect = actionParametersDiv.querySelector('.cbm-custom-address-select');
            if (paramSelect) paramSelect.value = addressType;
        }

        const addressContainer = actionParametersDiv.querySelector('.cbm-custom-address-parameters');
        if (!addressContainer) return;

        addressContainer.querySelector('.cbm-custom-address-name').value = addressJSON.name || '';
        addressContainer.querySelector('.cbm-custom-address-lines').value = Array.isArray(addressJSON.address_lines) ? addressJSON.address_lines.join(', ') : '';
        addressContainer.querySelector('.cbm-custom-address-apartment-number').value = addressJSON.apartment_number || '';
        addressContainer.querySelector('.cbm-custom-address-attn').value = addressJSON.attn || '';
        addressContainer.querySelector('.cbm-custom-address-care-of').value = addressJSON.care_of || '';
        addressContainer.querySelector('.cbm-custom-address-city').value = addressJSON.city || '';
        addressContainer.querySelector('.cbm-custom-address-region').value = addressJSON.region || '';
        addressContainer.querySelector('.cbm-custom-address-subregion').value = addressJSON.subregion || '';
        addressContainer.querySelector('.cbm-custom-address-street').value = addressJSON.street || '';
        addressContainer.querySelector('.cbm-custom-address-street-number').value = addressJSON.street_number || '';
        addressContainer.querySelector('.cbm-custom-address-door-code').value = addressJSON.door_code || '';
        addressContainer.querySelector('.cbm-custom-address-floor-number').value = addressJSON.floor_number || '';
        addressContainer.querySelector('.cbm-custom-address-postal-code').value = addressJSON.postal_code || '';
        addressContainer.querySelector('.cbm-custom-address-country').value = addressJSON.country || '';

        const latInput = addressContainer.querySelector('.cbm-custom-address-lat');
        const lngInput = addressContainer.querySelector('.cbm-custom-address-lng');
        if (addressJSON.coordinates && typeof addressJSON.coordinates.lat === 'number' && typeof addressJSON.coordinates.lng === 'number') {
            latInput.value = addressJSON.coordinates.lat;
            lngInput.value = addressJSON.coordinates.lng;
        } else {
            latInput.value = '';
            lngInput.value = '';
        }

    } else if (actionSelect === 'set_custom_address_company_name') {
        actionParametersDiv.innerHTML = '';
        // Two params: addressType, companyName
        const firstParam = params[0].replace(/^['"]|['"]$/g, '');
        const secondParam = params[1].replace(/^['"]|['"]$/g, '');

        const container = createElement('div', { className: 'cbm-action-parameters' },
            createElement('label', {}, 'Address Type'),
            (function() {
                const select = createElement('select', { className: 'cbm-custom-address-select' },
                    createElement('option', { value: 'ADDRESS_FROM' }, 'ADDRESS_FROM'),
                    createElement('option', { value: 'ADDRESS_TO' }, 'ADDRESS_TO'),
                    createElement('option', { value: 'ADDRESS_RETURN' }, 'ADDRESS_RETURN'),
                    createElement('option', { value: 'ADDRESS_CUSTOMER' }, 'ADDRESS_CUSTOMER')
                );
                select.value = firstParam;
                return select;
            })(),
            createElement('label', {}, 'Company Name'),
            createElement('input', { type: 'text', className: 'cbm-action-value-2', value: secondParam })
        );
        actionParametersDiv.appendChild(container);

    } else if (actionSelect === 'remove_location_ref' ||
               actionSelect === 'use_gcd_unit_alternative_value' ||
               actionSelect === 'use_line_items_currency_as_gcd_currency' ||
               actionSelect === 'use_customer_info_as_gcd_buyer_contact') {
        actionParametersDiv.innerHTML = '';

    } else if (actionSelect === 'use_addr_as_gcd_sold_to') {
        // One param: addressType
        actionParametersDiv.innerHTML = '';
        const firstParam = params[0].replace(/^['"]|['"]$/g, '');
        const container = createElement('div', { className: 'cbm-action-parameters' },
            createElement('label', {}, 'Address Type'),
            (function() {
                const select = createElement('select', { className: 'cbm-custom-address-select' },
                    createElement('option', { value: 'ADDRESS_FROM' }, 'ADDRESS_FROM'),
                    createElement('option', { value: 'ADDRESS_TO' }, 'ADDRESS_TO'),
                    createElement('option', { value: 'ADDRESS_RETURN' }, 'ADDRESS_RETURN'),
                    createElement('option', { value: 'ADDRESS_CUSTOMER' }, 'ADDRESS_CUSTOMER')
                );
                select.value = firstParam;
                return select;
            })()
        );
        actionParametersDiv.appendChild(container);

    } else if (actionSelect === 'set_gcd_buyer_contact') {
        actionParametersDiv.innerHTML = '';
        let jsonString = extractJSONString(actionValueRaw);
        const contactData = safeParseJSON(jsonString);
        const container = createElement('div', { className: 'cbm-action-parameters' },
            createElement('label', {}, 'email'),
            createElement('input', { type: 'text', className: 'cbm-action-value-1', value: contactData?.email || '' }),
            createElement('label', {}, 'phone'),
            createElement('input', { type: 'text', className: 'cbm-action-value-2', value: contactData?.phone || '' })
        );
        actionParametersDiv.appendChild(container);

    } else if (actionSelect === 'set_gcd_seller_id_numbers') {
        actionParametersDiv.innerHTML = '';
        let jsonString = extractJSONString(actionValueRaw);
        const idData = safeParseJSON(jsonString);
        const container = createElement('div', { className: 'cbm-action-parameters' },
            createElement('label', {}, 'VAT Number'),
            createElement('input', { type: 'text', className: 'cbm-action-value-1', value: idData?.vat || '' }),
            createElement('label', {}, 'EORI Number'),
            createElement('input', { type: 'text', className: 'cbm-action-value-2', value: idData?.eori || '' })
        );
        actionParametersDiv.appendChild(container);

    } else if (actionSelect === 'set_gcd_buyer_id_numbers') {
        actionParametersDiv.innerHTML = '';
        let jsonString = extractJSONString(actionValueRaw);
        const idData = safeParseJSON(jsonString);
        const container = createElement('div', { className: 'cbm-action-parameters' },
            createElement('label', {}, 'Buyer ID Type'),
            createElement('select', { className: 'cbm-buyer-id-type' },
                createElement('option', { value: '' }, 'Select ID Type'),
                createElement('option', { value: 'VAT+EORI' }, 'VAT + EORI'),
                createElement('option', { value: 'EIN' }, 'EIN')
            ),
            createElement('div', { className: 'cbm-buyer-id-fields' })
        );
        actionParametersDiv.appendChild(container);

        const dropdown = container.querySelector('.cbm-buyer-id-type');
        const fieldsContainer = container.querySelector('.cbm-buyer-id-fields');

        function showVATandEORI(vatVal, eoriVal) {
            fieldsContainer.innerHTML = '';
            fieldsContainer.appendChild(createElement('label', {}, 'VAT Number'));
            fieldsContainer.appendChild(createElement('input', { type: 'text', className: 'cbm-action-value-1', value: vatVal || '' }));
            fieldsContainer.appendChild(createElement('label', {}, 'EORI Number'));
            fieldsContainer.appendChild(createElement('input', { type: 'text', className: 'cbm-action-value-2', value: eoriVal || '' }));
        }

        function showEIN(einVal) {
            fieldsContainer.innerHTML = '';
            fieldsContainer.appendChild(createElement('label', {}, 'EIN'));
            fieldsContainer.appendChild(createElement('input', { type: 'text', className: 'cbm-action-value-1', value: einVal || '' }));
        }

        if (idData) {
            if (idData.vat && idData.eori) {
                dropdown.value = 'VAT+EORI';
                showVATandEORI(idData.vat, idData.eori);
            } else if (idData.ein) {
                dropdown.value = 'EIN';
                showEIN(idData.ein);
            } else {
                dropdown.value = '';
                fieldsContainer.innerHTML = '';
            }
        }

        dropdown.addEventListener('change', () => {
            if (dropdown.value === 'VAT+EORI') {
                showVATandEORI('', '');
            } else if (dropdown.value === 'EIN') {
                showEIN('');
            } else {
                fieldsContainer.innerHTML = '';
            }
        });

    } else if (actionSelect === 'add_addon_for_carrier') {
        actionParametersDiv.innerHTML = '';
        // Two parameters
        const firstParam = params[0].replace(/^['"]|['"]$/g, '');
        const secondParam = params[1].replace(/^['"]|['"]$/g, '');
        const paramInput1 = createElement('input', {
            type: 'text',
            className: 'cbm-action-value-1',
            value: firstParam
        });
        const paramInput2 = createElement('input', {
            type: 'text',
            className: 'cbm-action-value-2',
            value: secondParam
        });
        actionParametersDiv.appendChild(paramInput1);
        actionParametersDiv.appendChild(paramInput2);

    } else if (actionSelect === 'set_shipping_method') {
        actionParametersDiv.innerHTML = '';
        const firstParam = params[0].replace(/^['"]|['"]$/g, '');
        const paramInput = createElement('input', {
            type: 'text',
            className: 'cbm-action-value-1',
            value: firstParam,
            placeholder: 'Enter shipping method'
        });
        actionParametersDiv.appendChild(paramInput);

    } else if (actionSelect === 'set_gcd_currency') {
        actionParametersDiv.innerHTML = '';
        const firstParam = params[0].replace(/^['"]|['"]$/g, '');
        const paramInput = createElement('input', {
            type: 'text',
            className: 'cbm-action-value-1',
            value: firstParam,
            placeholder: 'Enter currency (e.g. GBP)'
        });
        actionParametersDiv.appendChild(paramInput);

    } else if (actionSelect === 'set_gcd_incoterms') {
        actionParametersDiv.innerHTML = '';
        const firstParam = params[0].replace(/^['"]|['"]$/g, '');
        const paramInput = createElement('input', {
            type: 'text',
            className: 'cbm-action-value-1',
            value: firstParam,
            placeholder: 'Enter incoterms (e.g. DAP)'
        });
        actionParametersDiv.appendChild(paramInput);

    } else if (actionSelect === 'set_gcd_place_of_incoterms') {
        actionParametersDiv.innerHTML = '';
        const firstParam = params[0].replace(/^['"]|['"]$/g, '');
        const paramInput = createElement('input', {
            type: 'text',
            className: 'cbm-action-value-1',
            value: firstParam,
            placeholder: 'Enter place of incoterms (City name)'
        });
        actionParametersDiv.appendChild(paramInput);

    } else if (actionSelect === 'add_meta' || actionSelect === 'add_default_meta') {
        // For add_meta and add_default_meta, we have either two regular parameters or one address block
        // Example: add_meta('param1', 'param2') or add_meta('my_first_param', "{...address...}")
        actionParametersDiv.innerHTML = '';

        // Extract parameters:
        const firstParam = params[0].replace(/^['"]|['"]$/g, '');
        let secondParam = '';
        if (params.length > 1) {
            // second parameter could be a normal string or a JSON address block
            secondParam = params[1];
        }

        // Check if secondParam contains address_lines (simple check)
        let isAddressMode = false;
        if (secondParam && secondParam.toLowerCase().includes('address_lines')) {
            isAddressMode = true;
        }

        // Create dropdown
        const extraDropdown = createElement('select', { className: 'cbm-extra-dropdown' },
            createElement('option', { value: 'regular', selected: !isAddressMode }, 'Regular Parameter'),
            createElement('option', { value: 'address', selected: isAddressMode }, 'Address')
        );
        actionParametersDiv.appendChild(extraDropdown);

        const paramContainer = createElement('div', { className: 'cbm-meta-parameters' });
        actionParametersDiv.appendChild(paramContainer);

        if (isAddressMode) {
            // Address mode: first param + address block
            const addressFirstParamInput = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-1',
                placeholder: 'Enter first parameter',
                value: firstParam
            });
            paramContainer.appendChild(addressFirstParamInput);

            // Parse JSON from secondParam
            let jsonString = extractJSONString(secondParam);
            const addressJSON = safeParseJSON(jsonString);

            // Add address parameters
            addCustomAddressParameters(paramContainer, false);
            const addressContainer = paramContainer.querySelector('.cbm-custom-address-parameters');
            if (addressContainer && addressJSON) {
                addressContainer.querySelector('.cbm-custom-address-name').value = addressJSON.name || '';
                addressContainer.querySelector('.cbm-custom-address-lines').value = Array.isArray(addressJSON.address_lines) ? addressJSON.address_lines.join(', ') : '';
                addressContainer.querySelector('.cbm-custom-address-apartment-number').value = addressJSON.apartment_number || '';
                addressContainer.querySelector('.cbm-custom-address-attn').value = addressJSON.attn || '';
                addressContainer.querySelector('.cbm-custom-address-care-of').value = addressJSON.care_of || '';
                addressContainer.querySelector('.cbm-custom-address-city').value = addressJSON.city || '';
                addressContainer.querySelector('.cbm-custom-address-region').value = addressJSON.region || '';
                addressContainer.querySelector('.cbm-custom-address-subregion').value = addressJSON.subregion || '';
                addressContainer.querySelector('.cbm-custom-address-street').value = addressJSON.street || '';
                addressContainer.querySelector('.cbm-custom-address-street-number').value = addressJSON.street_number || '';
                addressContainer.querySelector('.cbm-custom-address-door-code').value = addressJSON.door_code || '';
                addressContainer.querySelector('.cbm-custom-address-floor-number').value = addressJSON.floor_number || '';
                addressContainer.querySelector('.cbm-custom-address-postal-code').value = addressJSON.postal_code || '';
                addressContainer.querySelector('.cbm-custom-address-country').value = addressJSON.country || '';

                const latInput = addressContainer.querySelector('.cbm-custom-address-lat');
                const lngInput = addressContainer.querySelector('.cbm-custom-address-lng');
                if (addressJSON.coordinates && typeof addressJSON.coordinates.lat === 'number' && typeof addressJSON.coordinates.lng === 'number') {
                    latInput.value = addressJSON.coordinates.lat;
                    lngInput.value = addressJSON.coordinates.lng;
                } else {
                    latInput.value = '';
                    lngInput.value = '';
                }
            }

        } else {
            // Regular mode: two parameters
            const regParamInput1 = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-1',
                placeholder: 'Enter field name',
                value: firstParam
            });
            const regParamInput2 = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-2',
                placeholder: 'Enter field value',
                value: secondParam.replace(/^['"]|['"]$/g, '')
            });
            paramContainer.appendChild(regParamInput1);
            paramContainer.appendChild(regParamInput2);
        }

        // On dropdown change, switch UI dynamically
        extraDropdown.addEventListener('change', (e) => {
            const selection = e.target.value;
            paramContainer.innerHTML = '';
            if (selection === 'regular') {
                // Go back to two parameters
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
            } else {
                // Address mode
                const addressFirstParam = createElement('input', {
                    type: 'text',
                    className: 'cbm-action-value-1',
                    placeholder: 'Enter first parameter'
                });
                paramContainer.appendChild(addressFirstParam);
                addCustomAddressParameters(paramContainer, false);
            }
        });

    } else {
        // Default handling for actions with a single parameter or no parameters
        actionParametersDiv.innerHTML = '';
        const paramStr = params.join(', ').replace(/^['"]|['"]$/g, '').trim();
        if (paramStr) {
            const paramInput = createElement('input', {
                type: 'text',
                className: 'cbm-action-value-1',
                value: paramStr
            });
            actionParametersDiv.appendChild(paramInput);
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

    if (actionSelect === 'set_custom_address' ||
        actionSelect === 'set_gcd_seller_address' ||
        actionSelect === 'set_gcd_sold_to') {

        let paramSelect = '';
        const paramSelectEl = actionField.querySelector('.cbm-custom-address-select');
        if (paramSelectEl) {
            paramSelect = paramSelectEl.value;
        }

        const nameInput = actionField.querySelector('.cbm-custom-address-name')?.value.trim() || '';
        const addressLinesInput = actionField.querySelector('.cbm-custom-address-lines')?.value.trim() || '';
        const apartmentNumber = actionField.querySelector('.cbm-custom-address-apartment-number')?.value.trim() || '';
        const attn = actionField.querySelector('.cbm-custom-address-attn')?.value.trim() || '';
        const careOf = actionField.querySelector('.cbm-custom-address-care-of')?.value.trim() || '';
        const cityInput = actionField.querySelector('.cbm-custom-address-city')?.value.trim() || '';
        const region = actionField.querySelector('.cbm-custom-address-region')?.value.trim() || '';
        const subregion = actionField.querySelector('.cbm-custom-address-subregion')?.value.trim() || '';
        const street = actionField.querySelector('.cbm-custom-address-street')?.value.trim() || '';
        const streetNumber = actionField.querySelector('.cbm-custom-address-street-number')?.value.trim() || '';
        const doorCode = actionField.querySelector('.cbm-custom-address-door-code')?.value.trim() || '';
        const floorNumber = actionField.querySelector('.cbm-custom-address-floor-number')?.value.trim() || '';
        const postalCode = actionField.querySelector('.cbm-custom-address-postal-code')?.value.trim() || '';
        const countryInput = actionField.querySelector('.cbm-custom-address-country')?.value.trim() || '';

        const latVal = actionField.querySelector('.cbm-custom-address-lat')?.value.trim();
        const lngVal = actionField.querySelector('.cbm-custom-address-lng')?.value.trim();
        const lat = latVal !== '' ? parseFloat(latVal) : NaN;
        const lng = lngVal !== '' ? parseFloat(lngVal) : NaN;

        const addressObj = {};
        if (nameInput) addressObj.name = nameInput;
        if (addressLinesInput) {
            addressObj.address_lines = addressLinesInput.split(',').map(line => line.trim()).filter(line => line !== '');
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
        if (!isNaN(lat) && !isNaN(lng)) {
            addressObj.coordinates = { lat, lng };
        }

        const addressJSON = JSON.stringify(addressObj).replace(/"/g, '\\"');

        if (actionSelect === 'set_custom_address') {
            return `${actionSelect}('${paramSelect}', "${addressJSON}")`;
        } else {
            return `${actionSelect}("${addressJSON}")`;
        }

    } else if (actionSelect === 'set_custom_address_company_name') {
        const paramSelect = actionField.querySelector('.cbm-custom-address-select').value;
        const companyNameInput = actionField.querySelector('.cbm-action-value-2').value.trim();
        return `${actionSelect}('${paramSelect}', '${companyNameInput}')`;

    } else if (actionSelect === 'remove_location_ref' ||
               actionSelect === 'use_gcd_unit_alternative_value' ||
               actionSelect === 'use_line_items_currency_as_gcd_currency' ||
               actionSelect === 'use_customer_info_as_gcd_buyer_contact') {
        return `${actionSelect}()`;

    } else if (actionSelect === 'use_addr_as_gcd_sold_to') {
        const paramSelect = actionField.querySelector('.cbm-custom-address-select').value;
        return `${actionSelect}('${paramSelect}')`;

    } else if (actionSelect === 'set_gcd_buyer_contact') {
        const inputs = actionField.querySelectorAll('.cbm-action-parameters input');
        const email = inputs[0].value.trim();
        const phone = inputs[1].value.trim();
        const contactData = {};
        if (email) contactData.email = email;
        if (phone) contactData.phone = phone;
        const contactJSON = JSON.stringify(contactData).replace(/"/g, '\\"');
        return `${actionSelect}("${contactJSON}")`;

    } else if (actionSelect === 'set_gcd_seller_id_numbers') {
        const vat = actionField.querySelector('.cbm-action-value-1').value.trim();
        const eori = actionField.querySelector('.cbm-action-value-2').value.trim();
        const idData = {};
        if (vat) idData.vat = vat;
        if (eori) idData.eori = eori;
        const idJSON = JSON.stringify(idData).replace(/"/g, '\\"');
        return `${actionSelect}("${idJSON}")`;

    } else if (actionSelect === 'set_gcd_buyer_id_numbers') {
        const typeDropdown = actionField.querySelector('.cbm-buyer-id-type');
        const fieldsContainer = actionField.querySelector('.cbm-buyer-id-fields');
        if (typeDropdown.value === 'VAT+EORI') {
            const vat = fieldsContainer.querySelector('.cbm-action-value-1').value.trim();
            const eori = fieldsContainer.querySelector('.cbm-action-value-2').value.trim();
            const idData = {};
            if (vat) idData.vat = vat;
            if (eori) idData.eori = eori;
            const idJSON = JSON.stringify(idData).replace(/"/g, '\\"');
            return `${actionSelect}("${idJSON}")`;
        } else if (typeDropdown.value === 'EIN') {
            const ein = fieldsContainer.querySelector('.cbm-action-value-1').value.trim();
            const idData = { ein };
            const idJSON = JSON.stringify(idData).replace(/"/g, '\\"');
            return `${actionSelect}("${idJSON}")`;
        } else {
            return null; // No selection made
        }

    } else if (actionSelect === 'add_meta' || actionSelect === 'add_default_meta') {
        // Check the dropdown value
        const extraDropdown = actionField.querySelector('.cbm-extra-dropdown');
        const selection = extraDropdown ? extraDropdown.value : 'regular';
        if (selection === 'regular') {
            const fieldName = actionField.querySelector('.cbm-action-value-1')?.value.trim() || '';
            const fieldValue = actionField.querySelector('.cbm-action-value-2')?.value.trim() || '';
            return `${actionSelect}('${fieldName}', '${fieldValue}')`;
        } else if (selection === 'address') {
            // Address mode for add_meta/add_default_meta
            const addressFirstParam = actionField.querySelector('.cbm-action-value-1')?.value.trim() || '';

            const addressContainer = actionField.querySelector('.cbm-meta-parameters .cbm-custom-address-parameters');
            if (!addressContainer) return null;

            const nameInput = addressContainer.querySelector('.cbm-custom-address-name')?.value.trim() || '';
            const addressLinesInput = addressContainer.querySelector('.cbm-custom-address-lines')?.value.trim() || '';
            const apartmentNumber = addressContainer.querySelector('.cbm-custom-address-apartment-number')?.value.trim() || '';
            const attn = addressContainer.querySelector('.cbm-custom-address-attn')?.value.trim() || '';
            const careOf = addressContainer.querySelector('.cbm-custom-address-care-of')?.value.trim() || '';
            const cityInput = addressContainer.querySelector('.cbm-custom-address-city')?.value.trim() || '';
            const region = addressContainer.querySelector('.cbm-custom-address-region')?.value.trim() || '';
            const subregion = addressContainer.querySelector('.cbm-custom-address-subregion')?.value.trim() || '';
            const street = addressContainer.querySelector('.cbm-custom-address-street')?.value.trim() || '';
            const streetNumber = addressContainer.querySelector('.cbm-custom-address-street-number')?.value.trim() || '';
            const doorCode = addressContainer.querySelector('.cbm-custom-address-door-code')?.value.trim() || '';
            const floorNumber = addressContainer.querySelector('.cbm-custom-address-floor-number')?.value.trim() || '';
            const postalCode = addressContainer.querySelector('.cbm-custom-address-postal-code')?.value.trim() || '';
            const countryInput = addressContainer.querySelector('.cbm-custom-address-country')?.value.trim() || '';

            const latVal = addressContainer.querySelector('.cbm-custom-address-lat')?.value.trim();
            const lngVal = addressContainer.querySelector('.cbm-custom-address-lng')?.value.trim();
            const lat = latVal !== '' ? parseFloat(latVal) : NaN;
            const lng = lngVal !== '' ? parseFloat(lngVal) : NaN;

            const addressObj = {};
            if (nameInput) addressObj.name = nameInput;
            if (addressLinesInput) {
                addressObj.address_lines = addressLinesInput.split(',').map(line => line.trim()).filter(line => line !== '');
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
            if (!isNaN(lat) && !isNaN(lng)) {
                addressObj.coordinates = { lat, lng };
            }

            const addressJSON = JSON.stringify(addressObj).replace(/"/g, '\\"');
            return `${actionSelect}('${addressFirstParam}', "${addressJSON}")`;
        }

} else {
    // For other actions that accept simple parameters
    const inputs = actionField.querySelectorAll('.cbm-action-parameters input');
    if (inputs.length > 0) {
        const params = Array.from(inputs)
            .map(i => i.value.trim())
            .filter(p => p !== '');
        if (params.length === 1) {
            return `${actionSelect}('${params[0]}')`;
        } else {
            return `${actionSelect}(${params.map(p => `'${p}'`).join(', ')})`;
        }
    } else {
        return `${actionSelect}()`;
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
