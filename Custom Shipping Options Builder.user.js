// ==UserScript==
// @name         Custom Shipping Options Builder
// @namespace    http://tampermonkey.net/
// @version      6.1
// @description  Build and manage custom_shipping_methods via a user-friendly interface with API integration
// @author       julpif
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @grant        unsafeWindow
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Custom%20Shipping%20Options%20Builder.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Custom%20Shipping%20Options%20Builder.user.js
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

    // Function to format datetime-local input
    const formatDateTimeLocal = (dateString) => {
        const date = new Date(dateString);
        const pad = (n) => n.toString().padStart(2, '0');
        const yyyy = date.getFullYear();
        const mm = pad(date.getMonth() + 1);
        const dd = pad(date.getDate());
        const hh = pad(date.getHours());
        const min = pad(date.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    };

    /* ------------------- Inject Font Awesome ------------------- */
    const injectFontAwesome = () => {
        const fontAwesomeLink = document.createElement('link');
        fontAwesomeLink.rel = 'stylesheet';
        fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        fontAwesomeLink.crossOrigin = 'anonymous';
        fontAwesomeLink.referrerPolicy = 'no-referrer';
        document.head.appendChild(fontAwesomeLink);
    };

    /* ------------------- Inject CSS Styles ------------------- */
    const injectCSS = () => {
        const styles = `
            /* [Include all your CSS styles here] */
                        /* Modal Overlay */
#cso-builder-modal-overlay {
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
/* Fixed Width and Text Wrapping for Time Slots Table */
#time-slots-table {
    table-layout: fixed; /* Ensures the table uses fixed layout algorithm */
    width: 800px; /* Set your desired fixed width */
    max-width: 100%; /* Ensures responsiveness on smaller screens */
    word-wrap: break-word; /* Allows long words to break and wrap to the next line */
}

#time-slots-table th,
#time-slots-table td {
    overflow: hidden; /* Prevents content from overflowing */
    text-overflow: ellipsis; /* Adds ellipsis (...) for overflowing text */
    white-space: normal; /* Allows text to wrap */
    word-wrap: break-word; /* Ensures long words break appropriately */
    padding: 10px 12px; /* Maintain existing padding or adjust as needed */
}

/* Optional: Set specific widths for each column */
#time-slots-table th:nth-child(1),
#time-slots-table td:nth-child(1) {
    width: 100px; /* Adjust based on content */
}

#time-slots-table th:nth-child(2),
#time-slots-table td:nth-child(2) {
    width: 130px; /* Adjust based on content */
}

#time-slots-table th:nth-child(3),
#time-slots-table td:nth-child(3) {
    width: 130px; /* Adjust based on content */
}

#time-slots-table th:nth-child(4),
#time-slots-table td:nth-child(4) {
    width: 130px; /* Adjust based on content */
}

#time-slots-table th:nth-child(5),
#time-slots-table td:nth-child(5) {
    width: 130px; /* Adjust based on content */
}

#time-slots-table th:nth-child(6),
#time-slots-table td:nth-child(6) {
    width: 130px; /* Adjust based on content */
}

/* Styles for Fetch Pickup Location Types input */
#cso-fetch-pickup-location-types {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
    transition: border-color 0.3s, box-shadow 0.3s;
    margin-top: 4px;
    min-height: 100px; /* Adjust height as needed */
}

#cso-fetch-pickup-location-types:focus {
    border-color: #80bdff;
    box-shadow: 0 0 4px rgba(0, 123, 255, 0.5);
    outline: none;
}

/* Optional: Placeholder color */
#cso-fetch-pickup-location-types::placeholder {
    color: #6c757d;
    opacity: 1; /* Firefox */
}

/* Styles for Meta Additional Properties inputs */
.cso-meta-fields {
    margin-top: 8px;
}

.cso-meta-field {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
}

.cso-meta-field input[type="text"] {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 13px;
    transition: border-color 0.3s, box-shadow 0.3s;
}

.cso-meta-field input[type="text"]:focus {
    border-color: #80bdff;
    box-shadow: 0 0 4px rgba(0,123,255,0.5);
    outline: none;
}

.cso-add-meta-btn {
    padding: 5px 10px;
    background: #28a745;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: background-color 0.3s;
}

.cso-add-meta-btn:hover {
    background: #218838;
}

.cso-remove-meta-btn {
    background: #dc3545;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 13px;
}

.cso-remove-meta-btn:hover {
    background: #c82333;
}

/* Modal Content */
#cso-builder-modal {
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
/* Adjust the buttons container */
#cso-section-methods > div {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 8px; /* Add some space below the buttons */
}

/* Optional: Ensure buttons have consistent spacing */
#cso-section-methods > div > div > button {
    margin-left: 8px; /* Add space between buttons */
}

#cso-section-methods > div > div {
    display: flex;
    gap: 8px; /* Space between the buttons */
}

#cso-section-methods h3 {
    margin: 0; /* Remove bottom margin to align vertically */
}

/* Adjust the margin of the Add Shipping Method button */
#add-method-btn {
    margin-top: 8px;
    margin-left: 0;
}
/* Header */
#cso-header {
    padding: 8px 16px;
    background: #000000;
    color: #ffffff;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

#cso-header h2 {
    margin: 0;
    font-size: 20px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #ffffff;
}

#cso-close-btn {
    background: transparent;
    border: none;
    color: #ffffff;
    cursor: pointer;
    font-size: 24px;
}

/* Main Content */
#cso-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    box-sizing: border-box;
}

/* Shipping Methods Section */
.cso-section {
    margin-bottom: 32px;
}

.cso-section h3 {
    margin-bottom: 12px;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #007bff;
}

.cso-button {
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

.cso-button:hover {
    background: #333333;
}

.cso-button:active {
    background: #004085;
    transform: scale(0.98);
}

/* Edit Buttons */
.cso-button.secondary.edit-method-btn,
.cso-button.secondary.edit-time-slot-btn {
    background: #007BFF; /* New color for Edit buttons */
    color: #ffffff;
}

.cso-button.secondary.edit-method-btn:hover,
.cso-button.secondary.edit-time-slot-btn:hover {
    background: #0056b3;
}

.cso-button.danger {
    background: #dc3545;
}

.cso-button.danger:hover {
    background: #c82333;
}

/* Clone Button */
.cso-button.clone-method-btn {
    background: rgb(23, 162, 184);
    color: #ffffff;
}

.cso-button.clone-method-btn:hover {
    background: rgb(17, 132, 160);
}

/* Tables */
.cso-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 13px;
}

.cso-table th, .cso-table td {
    border: 1px solid #dddddd;
    padding: 10px 12px;
    text-align: left;
    word-wrap: break-word;
    white-space: normal;
    vertical-align: top;
}

.cso-table th {
    background-color: #f2f2f2;
}

.cso-table tbody tr:hover {
    background-color: #f9f9f9;
}

/* Forms */
.cso-form-group {
    margin-bottom: 12px;
}

.cso-form-group label {
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
}

.cso-form-group input[type="text"],
.cso-form-group select,
.cso-form-group textarea,
.cso-form-group input[type="time"],
.cso-form-group input[type="datetime-local"],
.cso-form-group input[type="number"] {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 13px;
    transition: border-color 0.3s, box-shadow 0.3s;
}

.cso-form-group input[type="text"]:focus,
.cso-form-group select:focus,
.cso-form-group textarea:focus,
.cso-form-group input[type="time"]:focus,
.cso-form-group input[type="datetime-local"]:focus,
.cso-form-group input[type="number"]:focus {
    border-color: #80bdff;
    box-shadow: 0 0 4px rgba(0,123,255,0.5);
    outline: none;
}

/* Notification */
#cso-notification {
    position: fixed;
    top: 16px;
    right: 16px;
    background: #28a745; /* Green by default for success */
    color: #ffffff;
    padding: 10px 14px;
    border-radius: 4px;
    display: none;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    font-size: 13px;
    animation: fadeIn 0.5s;
}

/* Keyframes for Animations */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideIn {
    from { transform: translateY(-30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

/* Responsive Design */
@media (max-width: 1024px) {
    #cso-builder-modal {
        width: 95%;
        height: 90%;
    }
}

@media (max-width: 768px) {
    #cso-header h2 {
        font-size: 16px;
    }

    .cso-button {
        padding: 5px 10px;
        font-size: 12px;
    }

    .cso-table th, .cso-table td {
        padding: 6px 8px;
    }

    .cso-form-group label {
        font-size: 12px;
    }

    .cso-form-group input[type="text"],
    .cso-form-group select,
    .cso-form-group textarea,
    .cso-form-group input[type="time"],
    .cso-form-group input[type="datetime-local"],
    .cso-form-group input[type="number"] {
        font-size: 12px;
    }
}

/* Time Operations Styles */
.time-operation {
    border: 1px solid #ced4da;
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 8px;
    background-color: #f8f9fa;
}

.time-operation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.time-operation-header h5 {
    margin: 0;
    font-size: 14px;
}

.remove-operation-btn {
    background: #dc3545;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 3px 6px;
    cursor: pointer;
    font-size: 12px;
}

.remove-operation-btn:hover {
    background: #c82333;
}

.add-operation-btn {
    background: #28a745;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 13px;
    margin-top: 8px;
}

.add-operation-btn:hover {
    background: #218838;
}

.operation-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.operation-fields select,
.operation-fields input[type="text"],
.operation-fields input[type="number"],
.operation-fields input[type="time"] {
    flex: 1 1 180px;
}

/* New Columns Specific Styles */
.cso-table pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    background: #f8f9fa;
    padding: 6px;
    border-radius: 4px;
    max-height: 150px;
    overflow-y: auto;
}

.cso-table ul {
    list-style-type: disc;
    padding-left: 18px;
    margin: 0;
}

/* Fetch Configuration Toggle Switch */
.cso-fetch-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.cso-fetch-toggle input[type="checkbox"] {
    width: 36px;
    height: 18px;
    -webkit-appearance: none;
    background: #c6c6c6;
    outline: none;
    border-radius: 18px;
    position: relative;
    cursor: pointer;
    transition: background 0.3s;
}

.cso-fetch-toggle input[type="checkbox"]:checked {
    background: #28a745;
}

.cso-fetch-toggle input[type="checkbox"]::before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    top: 1px;
    left: 1px;
    background: #ffffff;
    transition: transform 0.3s;
}

.cso-fetch-toggle input[type="checkbox"]:checked::before {
    transform: translateX(18px);
}

/* Hide fetch configuration by default */
.cso-fetch-container {
    display: none;
}

.cso-fetch-container.active {
    display: block;
}

/* Filter Rules Styles */
.cso-filter-rules {
    margin-top: 12px;
    border-top: 1px solid #ced4da;
    padding-top: 8px;
}

.cso-filter-rules input[type="text"] {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
    margin-top: 4px;
}

.cso-filter-rules input[type="text"]:focus {
    border-color: #80bdff;
    box-shadow: 0 0 4px rgba(0,123,255,0.5);
    outline: none;
}

/* Toggle Switch Styles */
.cso-toggle-switch {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.cso-toggle-switch input[type="checkbox"] {
    width: 36px;
    height: 18px;
    -webkit-appearance: none;
    background: #c6c6c6;
    outline: none;
    border-radius: 18px;
    position: relative;
    cursor: pointer;
    transition: background 0.3s;
}

.cso-toggle-switch input[type="checkbox"]:checked {
    background: #28a745;
}

.cso-toggle-switch input[type="checkbox"]::before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    top: 1px;
    left: 1px;
    background: #ffffff;
    transition: transform 0.3s;
}

.cso-toggle-switch input[type="checkbox"]:checked::before {
    transform: translateX(18px);
}

/* Hide Meta and Time Slots by default */
.cso-meta-container,
.cso-time-slots-container {
    display: none;
}

.cso-meta-container.active,
.cso-time-slots-container.active {
    display: block;
    margin-bottom: 16px;
    max-width: 500px
}

/* Conditional Bottom Margins */
.cso-section-meta-enabled {
    margin-bottom: 32px;
}

.cso-fetch-container-meta-enabled {
    margin-bottom: 32px;
}
        `;
        injectStyles(styles);
    };

    /* ------------------- Notification Function ------------------- */
    const createNotification = () => {
        const notification = createElement('div', { id: 'cso-notification' });
        document.body.appendChild(notification);
        return notification;
    };

    const showNotification = (message, type = 'success') => {
        const notification = document.getElementById('cso-notification');
        if (notification) {
            notification.textContent = message;
            notification.style.background = type === 'success' ? '#28a745' : '#dc3545'; // Green for success, Red for danger
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
    };

    /* ------------------- Modal Management ------------------- */
let escKeyListener;

    // Function to create modal overlays with required behaviors
    const createModalOverlay = (id) => {
        // Check if overlay already exists and remove it
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
            backdrop-filter: blur(3px);
        ` });

        document.body.appendChild(overlay);

        let isInsideClick = false;

        // Listen for mousedown to determine if the click started inside the modal
        overlay.addEventListener('mousedown', (e) => {
            if (e.target !== overlay) {
                isInsideClick = true;
            } else {
                isInsideClick = false;
            }
        });

        // Click outside to close modal only if the mousedown was not inside
        overlay.addEventListener('click', (e) => {
            if (!isInsideClick && e.target === overlay) {
                closeModalHandler();
            }
        });

        // Function to close the modal
        const closeModalHandler = () => {
            overlay.style.display = 'none';
            // Remove "Esc" key listener when modal is closed
            document.removeEventListener('keydown', escKeyListener);
        };

        // "Esc" key to close modal
        const escKeyListener = (e) => {
            if (e.key === 'Escape') {
                closeModalHandler();
            }
        };
        document.addEventListener('keydown', escKeyListener);

        return overlay;
    };

    // Function to add "X" close button to a modal
    const addCloseButton = (modalContent, overlayId) => {
        // Check if the close button already exists
        if (!modalContent.querySelector('.cso-modal-close-btn')) {
            const closeButton = createElement('button', {
                className: 'cso-modal-close-btn',
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

            // Event listener to close the modal when "X" is clicked
            closeButton.addEventListener('click', () => {
                const overlay = document.getElementById(overlayId);
                if (overlay) {
                    overlay.style.display = 'none';
                    // Remove "Esc" key listener when modal is closed
                    document.removeEventListener('keydown', escKeyListener);
                }
            });
        }
    };

    // Function to open a modal
    const openModal = (overlay) => {
        overlay.style.display = 'flex';
    };

    // Function to close a modal
    const closeModal = (overlay) => {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    };

    /* ------------------- Helper Functions ------------------- */

    const getAvailableOperations = () => ([
        { value: 'add_business_days', label: 'Add Business Days' },
        { value: 'add_days', label: 'Add Days' },
        { value: 'add_hours', label: 'Add Hours' },
        { value: 'add_minutes', label: 'Add Minutes' },
        { value: 'set_hhmm', label: 'Set HH:MM' }
    ]);

const createOperationForm = (availableOperations, targetField, operationData = {}) => {
    // Oi! If we're dealing with 'expires', chuck the 'add_business_days' operation in the bin
    let filteredOperations = availableOperations;
    if (targetField === 'expires') {
        filteredOperations = filteredOperations.filter(op => op.value !== 'add_business_days');
    }

    // Build the form for this operation
    const operationDiv = createElement(
        'div',
        { className: 'time-operation' },
        createElement(
            'div',
            { className: 'operation-fields' },
            createElement('select', { className: 'operation-select' },
                createElement('option', { value: '', disabled: true, selected: true }, 'Select Operation'),
                ...filteredOperations.map(op => createElement('option', { value: op.value }, op.label))
            ),
            // This cheeky input is for parameters (e.g. the numeric or time input)
            createElement('input', {
                type: 'text',
                className: 'operation-param',
                placeholder: 'Parameter',
                style: 'display: none;'
            })
        )
    );

    // If there’s existing operation data, set the bastards now
    if (operationData.action) {
        const select = operationDiv.querySelector('.operation-select');
        const paramInput = operationDiv.querySelector('.operation-param');
        select.value = operationData.action;

        handleOperationSelectChange(select, paramInput, operationData.action, operationData.value);
    }

    // When the user picks an operation from the dropdown
    operationDiv.querySelector('.operation-select').addEventListener('change', function() {
        const selectedOp = this.value;
        const paramInput = operationDiv.querySelector('.operation-param');
        handleOperationSelectChange(this, paramInput, selectedOp);
    });

    return operationDiv;
};

const handleOperationSelectChange = (selectElement, paramInput, selectedOp, existingValue = '') => {
    if (!selectedOp) {
        paramInput.style.display = 'none';
        paramInput.value = '';
        return;
    }

    if (['add_business_days', 'add_days', 'add_hours', 'add_minutes'].includes(selectedOp)) {
        paramInput.type = 'number';
        paramInput.placeholder = 'Enter value';
        paramInput.value = existingValue;
        paramInput.style.display = 'block';
    } else if (selectedOp === 'set_hhmm') {
        paramInput.type = 'time';
        paramInput.placeholder = 'Enter HH:MM';
        paramInput.value = existingValue;
        paramInput.style.display = 'block';
    } else {
        paramInput.style.display = 'none';
        paramInput.value = '';
    }
};

    /* ------------------- Remove Empty Objects/Arrays Function ------------------- */

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

    /* ------------------- Fetch Shipping Methods Function ------------------- */

    // Function to fetch shipping methods
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

    // Function to populate the shipping methods dropdown
function populateShippingMethodsDropdown(dropdown, methods, selectedValue = '') {
    dropdown.innerHTML = ''; // Clear existing options

    let selectedValueExistsInMethods = methods.some(method => method.id === selectedValue);

    if (selectedValue && !selectedValueExistsInMethods) {
        // Add the existing selectedValue as an option
        dropdown.appendChild(createElement('option', { value: selectedValue, selected: true }, selectedValue));
    } else if (!selectedValue) {
        // No selected value and no methods, add default option
        dropdown.appendChild(createElement('option', { value: '' }, '-- Select Shipping Option --'));
    }

    methods.forEach(method => {
        const option = createElement('option', { value: method.id }, method.id);
        if (method.id === selectedValue) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });
}

    // Helper function to parse operation strings
const parseOperationString = (operationString) => {
    // Pattern to match pickup_time.start, pickup_time.end, pickup_time.expires
    const operationPatternPickup = /pickup_time\.(start|end|expires)\.(\w+)\(([^)]+)\)/;
    const matchPickup = operationString.match(operationPatternPickup);
    if (matchPickup) {
        const target = matchPickup[1]; // start, end, or expires
        const action = matchPickup[2];
        let param = matchPickup[3].trim();

        // Remove quotes if present (for set_hhmm)
        if (param.startsWith("'") && param.endsWith("'")) {
            param = param.slice(1, -1);
        }

        return { target, action, param };
    }

    // Pattern to match time_now.add_days(3) or time_now.set_hhmm('12:00')
    const operationPatternExpires = /time_now\.(\w+)\(([^)]+)\)/;
    const matchExpires = operationString.match(operationPatternExpires);
    if (matchExpires) {
        const target = 'expires';
        const action = matchExpires[1];
        let param = matchExpires[2].trim();

        // Remove quotes if present (for set_hhmm)
        if (param.startsWith("'") && param.endsWith("'")) {
            param = param.slice(1, -1);
        }

        return { target, action, param };
    }

    return null;
};

    // Mapping of operation actions to user-friendly labels
const operationLabels = {
    add_business_days: 'Business Days',
    add_days: 'Days',
    add_hours: 'Hours',
    add_minutes: 'Minutes',
    set_hhmm: 'HH:MM'
};
    /* ------------------- Builder Initialization ------------------- */

    const initializeBuilder = () => {
        // Initialize data structures
        window.csoConfig = {
            methods: []
        };

        // Create Notification
        createNotification();

        // Create Modal Overlay
        const modalOverlay = createModalOverlay('cso-builder-modal-overlay');

        // Create Main Modal Content
        const mainModal = createElement('div', { id: 'cso-builder-modal', style: `
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
            // Header
            createElement('div', { id: 'cso-header' },
                createElement('h2', { innerHTML: `<i class="fas fa-truck"></i> Custom Shipping Options Builder` }),
                // The "X" button will be added by the helper function
            ),
            // Content
            createElement('div', { id: 'cso-content' },
                // Shipping Methods Section
                createElement('div', { className: 'cso-section', id: 'cso-section-methods' },
                    // Buttons Container (Aligned to the right)
                    createElement('div', {
                        style: 'display: flex; justify-content: flex-end; align-items: center; margin-bottom: 8px;'
                    },
                        createElement('div', {},
                            createElement('button', { className: 'cso-button', id: 'export-json-btn', innerHTML: `<i class="fas fa-file-export"></i> Export JSON` }),
                            createElement('button', { className: 'cso-button', id: 'publish-config-btn', innerHTML: `<i class="fas fa-upload"></i> Publish Configuration` })
                        )
                    ),
                    createElement('button', { className: 'cso-button', id: 'add-method-btn', innerHTML: `<i class="fas fa-plus"></i> Add Shipping Method` }),
                    createElement('table', { className: 'cso-table', id: 'methods-table' },
                        createElement('thead', {},
                            createElement('tr', {},
                                createElement('th', {}, 'Shipping Method'),
                                createElement('th', {}, 'Carrier Name'),
                                createElement('th', {}, 'Delivery Type'),
                                createElement('th', {}, 'Display Name'),
                                createElement('th', {}, 'Fetch Configurations'),
                                createElement('th', {}, 'Meta Informations'),
                                createElement('th', {}, 'Time Slots'),
                                createElement('th', {}, 'Actions')
                            )
                        ),
                        createElement('tbody', {})
                    )
                ),
            )
        );

        modalOverlay.appendChild(mainModal);

        // Add "X" close button to the main modal
        addCloseButton(mainModal, 'cso-builder-modal-overlay');

        /* ------------------- Event Listeners ------------------- */

        // Open Add Method Modal
        mainModal.querySelector('#add-method-btn').addEventListener('click', () => {
            openAddMethodModal(modalOverlay);
        });

        // Export JSON
        mainModal.querySelector('#export-json-btn').addEventListener('click', () => {
            exportJSON();
        });

        // Publish Configuration
        mainModal.querySelector('#publish-config-btn').addEventListener('click', () => {
            publishConfig();
        });

        /* ------------------- Shipping Methods Handling ------------------- */

        const addShippingMethodRow = (methodData) => {
            const tbody = mainModal.querySelector('#methods-table tbody');
            const tr = createElement('tr', {},
                createElement('td', { className: 'cso-shipping-method' }, methodData.shipping_method || ''),
                createElement('td', { className: 'cso-carrier-name' }, methodData.carrier_name || ''),
                createElement('td', { className: 'cso-delivery-type' }, methodData.delivery_type || ''),
                createElement('td', { className: 'cso-product' }, methodData.product || ''),
                // Fetch Configurations
                createElement('td', { className: 'cso-fetch-config' },
                    methodData.fetch
                        ? createElement('ul', {},
                            createElement('li', {}, `Shipping Method: ${methodData.fetch.shipping_method || ''}`),
                            createElement('li', {}, `Delivery Type: ${methodData.fetch.delivery_type || ''}`),
                            createElement('li', {}, `Pickup Location Types: ${Array.isArray(methodData.fetch.pickup_location_types) ? methodData.fetch.pickup_location_types.join(', ') : ''}`)
                          )
                        : ''
                ),
                // Meta Informations
                createElement('td', { className: 'cso-meta-info' },
                    methodData.meta && Object.keys(methodData.meta).length > 0
                        ? createElement('ul', {},
                            ...Object.entries(methodData.meta).map(([key, value]) => createElement('li', {}, `${key}: ${value}`))
                          )
                        : ''
                ),
                // Time Slots
                createElement('td', { className: 'cso-time-slots' },
                    methodData.time_slots && methodData.time_slots.length > 0
                        ? createElement('ul', {},
                            ...methodData.time_slots.map(ts => createElement('li', {}, ts.name))
                          )
                        : ''
                ),
                // Actions
                createElement('td', { className: 'cso-actions' },
                    createElement('button', { className: 'cso-button secondary edit-method-btn', innerHTML: `<i class="fas fa-edit"></i> Edit` }),
                    createElement('button', { className: 'cso-button danger delete-method-btn', innerHTML: `<i class="fas fa-trash-alt"></i> Delete` }),
                    // Clone Button Added Here
                    createElement('button', {
                        className: 'cso-button clone-method-btn',
                        innerHTML: `<i class="fas fa-copy"></i> Clone`,
                        style: 'background: rgb(23, 162, 184); color: #ffffff;' // Ensuring the color
                    })
                )
            );

            // Edit Button Event
            tr.querySelector('.edit-method-btn').addEventListener('click', () => {
                const shippingMethod = methodData.shipping_method;
                openEditMethodModal(tr, shippingMethod);
            });

            // Delete Button Event
            tr.querySelector('.delete-method-btn').addEventListener('click', () => {
                if(confirm(`Are you sure you want to delete the shipping method "${methodData.shipping_method}"?`)) {
                    tbody.removeChild(tr);
                    // Remove from config
                    window.csoConfig.methods = window.csoConfig.methods.filter(m => m.shipping_method !== methodData.shipping_method);
                    showNotification('Shipping method deleted successfully.');
                }
            });

            // Clone Button Event
            tr.querySelector('.clone-method-btn').addEventListener('click', () => {
                // Fetch the latest methodData from window.csoConfig.methods
                const latestMethodData = window.csoConfig.methods.find(m => m.shipping_method === methodData.shipping_method);

                if (!latestMethodData) {
                    showNotification('Shipping method data not found.', 'danger');
                    console.error(`[CSO Builder] Shipping method data not found for cloning: ${methodData.shipping_method}`);
                    return;
                }

                // Create a deep copy to avoid referencing the original object
                const methodDataCopy = JSON.parse(JSON.stringify(latestMethodData));

                // Set the shipping_method to empty
                methodDataCopy.shipping_method = '';

                // Open the Add Method modal with the cloned data
                openAddMethodModal(modalOverlay, methodDataCopy);
            });

            tbody.appendChild(tr);
            // Add to config
            window.csoConfig.methods.push(methodData);
        };

        /* ------------------- Initialize Builder with Data ------------------- */

        const initializeBuilderWithData = (data) => {
            // Ensure data.methods exists and is an array
            const methods = Array.isArray(data.methods) ? data.methods : [];
            window.csoConfig = {
                methods: []
            };
            const tbody = mainModal.querySelector('#methods-table tbody');
            tbody.innerHTML = '';

            // Add methods to table
            methods.forEach(method => {
                // Ensure each method has the necessary properties
                const validatedMethod = {
                    shipping_method: method.shipping_method || '',
                    carrier_name: method.carrier_name || '',
                    delivery_type: method.delivery_type || '',
                    product: method.product || '',
                    fetch: method.fetch ? {
                        shipping_method: method.fetch.shipping_method || '',
                        delivery_type: method.fetch.delivery_type || '',
                        pickup_location_types: Array.isArray(method.fetch.pickup_location_types) ? method.fetch.pickup_location_types : []
                    } : null,
                    meta: method.meta && typeof method.meta === 'object' ? method.meta : null,
                    time_slots: Array.isArray(method.time_slots) ? method.time_slots : []
                };
                addShippingMethodRow(validatedMethod);
            });
        };

        /* ------------------- Fetch Existing Configuration ------------------- */

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
                // Extract custom_shipping_methods from the response
                const csoData = data.site?.custom_shipping_methods || { methods: [] };
                window.fullData = data; // Store the full data for publishing
                window.csoVersion = data.site?.version || '1';
                initializeBuilderWithData(csoData);
                openModal(modalOverlay); // Open the builder modal
            })
            .catch(error => {
                console.error('Failed to fetch custom shipping options:', error);
                showNotification('Failed to fetch custom shipping options.', 'danger');
            });
        };

        // Fetch configuration on builder initialization
        fetchConfiguration();

/* ------------------- Open Add Method Modal ------------------- */

const openAddMethodModal = (parentOverlay, methodData = null) => {
    const addModalOverlay = createModalOverlay('cso-add-method-modal-overlay');
    const addModal = createElement('div', { id: 'cso-add-method-modal', style: `
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
        createElement('h3', { innerHTML: `<i class="fas fa-plus"></i> Add Shipping Method` }),
        // Form Groups
        createElement('div', { className: 'cso-form-group' },
            createElement('label', { for: 'cso-shipping-method' }, 'Shipping Method Name'),
            createElement('input', { type: 'text', id: 'cso-shipping-method', placeholder: 'Enter shipping method name' })
        ),
        createElement('div', { className: 'cso-form-group' },
            createElement('label', { for: 'cso-carrier-name' }, 'Carrier Name'),
            createElement('input', { type: 'text', id: 'cso-carrier-name', placeholder: 'Enter carrier name' })
        ),
        createElement('div', { className: 'cso-form-group' },
            createElement('label', { for: 'cso-delivery-type' }, 'Delivery Type'),
            createElement('select', { id: 'cso-delivery-type' },
                createElement('option', { value: 'DELIVERY' }, 'DELIVERY'),
                createElement('option', { value: 'PICKUP' }, 'PICKUP'),
                createElement('option', { value: 'MAILBOX' }, 'MAILBOX'),
                createElement('option', { value: 'INSTORE' }, 'INSTORE'),
                createElement('option', { value: 'INWAREHOUSE' }, 'INWAREHOUSE')
            )
        ),
        createElement('div', { className: 'cso-form-group' },
            createElement('label', { for: 'cso-product-name' }, 'Display Name'),
            createElement('input', { type: 'text', id: 'cso-product-name', placeholder: 'Enter the name to be displayed in IMP' })
        ),
        // Fetch Configuration Toggle
        createElement('div', { className: 'cso-form-group cso-fetch-toggle' },
            createElement('label', {}, 'Add Fetch Configuration?'),
            createElement('input', { type: 'checkbox', id: 'cso-fetch-toggle' })
        ),
        // Fetch Configuration Container
        createElement('div', { className: 'cso-fetch-container' },
            createElement('div', { className: 'cso-form-group' },
                createElement('label', { for: 'cso-fetch-shipping-method' }, 'Fetch Shipping Method'),
                createElement('select', { id: 'cso-fetch-shipping-method', className: 'cso-fetch-shipping-method' })
            ),
            createElement('div', { className: 'cso-form-group' },
                createElement('label', { for: 'cso-fetch-delivery-type' }, 'Fetch Delivery Type'),
                createElement('select', { id: 'cso-fetch-delivery-type' },
                              createElement('option', { value: 'DELIVERY' }, 'DELIVERY'),
                              createElement('option', { value: 'PICKUP' }, 'PICKUP'),
                              createElement('option', { value: 'MAILBOX' }, 'MAILBOX'),
                              createElement('option', { value: 'INSTORE' }, 'INSTORE'),
                              createElement('option', { value: 'INWAREHOUSE' }, 'INWAREHOUSE')
                )
            ),
createElement('div', { className: 'cso-form-group' },
    createElement('label', { for: 'cso-fetch-pickup-location-types' }, 'Fetch Pickup Location Types'),
    createElement('select', { id: 'cso-fetch-pickup-location-types', multiple: true },
        createElement('option', { value: 'UNKNOWN_PICKUP_LOCATION_TYPE' }, 'UNKNOWN_PICKUP_LOCATION_TYPE'),
        createElement('option', { value: 'LOCKER' }, 'LOCKER'),
        createElement('option', { value: 'STORE' }, 'STORE'),
        createElement('option', { value: 'POSTOFFICE' }, 'POSTOFFICE'),
        createElement('option', { value: 'MANNED' }, 'MANNED')
    )
)

        ),
        // Meta Fields Toggle
        createElement('div', { className: 'cso-form-group cso-toggle-switch' },
            createElement('label', {}, 'Add Meta Information?'),
            createElement('input', { type: 'checkbox', id: 'cso-meta-toggle' })
        ),
        // Meta Fields Container
        createElement('div', { className: 'cso-meta-container' },
            createElement('button', { className: 'cso-button', id: 'add-meta-field-btn' }, 'Add Meta Field'),
            createElement('div', { className: 'cso-meta-fields' })
        ),
        // Time Slots Toggle
        createElement('div', { className: 'cso-form-group cso-toggle-switch' },
            createElement('label', {}, 'Add Time Slots?'),
            createElement('input', { type: 'checkbox', id: 'cso-time-slots-toggle' })
        ),
        // Time Slots Container
        createElement('div', { className: 'cso-time-slots-container' },
            createElement('button', { className: 'cso-button', id: 'add-time-slot-btn', innerHTML: `<i class="fas fa-plus"></i> Add Time Slot` }),
            createElement('table', { className: 'cso-table', id: 'time-slots-table' },
                createElement('thead', {},
                    createElement('tr', {},
                        createElement('th', {}, 'Name'),
                        createElement('th', {}, 'Start'),
                        createElement('th', {}, 'End'),
                        createElement('th', {}, 'Expires'),
                        createElement('th', {}, 'Filter Rules'),
                        createElement('th', {}, 'Actions')
                    )
                ),
                createElement('tbody', {})
            )
        ),
        // Buttons
        createElement('div', { style: 'margin-top: 10px; display: flex; gap: 10px;' },
            createElement('button', { className: 'cso-button', id: 'cso-save-method-btn', innerHTML: `<i class="fas fa-save"></i> Save` }),
            createElement('button', { className: 'cso-button secondary', id: 'cso-cancel-method-btn', innerHTML: `<i class="fas fa-times"></i> Cancel` })
        )
    );

    addModalOverlay.appendChild(addModal);
    openModal(addModalOverlay);

    // Add "X" close button to the Add Method modal
    addCloseButton(addModal, 'cso-add-method-modal-overlay');

    // Grab the fetch Delivery type select and the pickup location group
const fetchDeliveryTypeSelect = addModal.querySelector('#cso-fetch-delivery-type');
const pickupLocationGroup = addModal.querySelector('label[for="cso-fetch-pickup-location-types"]').parentElement;

// Add a help text to the pickup location label
const pickupLocationLabel = addModal.querySelector('label[for="cso-fetch-pickup-location-types"]');
if (pickupLocationLabel) {
    const helpText = document.createElement('small');
    helpText.style.display = 'block';
    helpText.style.fontSize = '11px';
    helpText.style.color = '#6c757d';
    helpText.textContent = 'Hold "cmd" to select several options';
    pickupLocationLabel.appendChild(helpText);
}

// Function to toggle the pickup location types field
function togglePickupLocationTypes() {
    if (fetchDeliveryTypeSelect.value === 'PICKUP') {
        pickupLocationGroup.style.display = 'block';
    } else {
        pickupLocationGroup.style.display = 'none';
    }
}

// Set initial state and add change listener
togglePickupLocationTypes();
fetchDeliveryTypeSelect.addEventListener('change', togglePickupLocationTypes);

    /* ------------------- Event Listeners ------------------- */

    // Close Add Modal
    addModal.querySelector('#cso-cancel-method-btn').addEventListener('click', () => {
        closeModal(addModalOverlay);
    });

    // Toggle Fetch Configuration
    const fetchToggle = addModal.querySelector('#cso-fetch-toggle');
    const fetchContainer = addModal.querySelector('.cso-fetch-container');

    fetchToggle.addEventListener('change', function() {
        if(this.checked) {
            fetchContainer.classList.add('active');
        } else {
            fetchContainer.classList.remove('active');
        }
        // Adjust bottom margin based on toggle
        adjustBottomMargin(addModal, 'fetch');
    });

    // Toggle Meta Fields
    const metaToggle = addModal.querySelector('#cso-meta-toggle');
    const metaContainer = addModal.querySelector('.cso-meta-container');
    const metaFieldsContainer = metaContainer.querySelector('.cso-meta-fields');

    metaToggle.addEventListener('change', function() {
        if(this.checked) {
            metaContainer.classList.add('active');
        } else {
            metaContainer.classList.remove('active');
        }
        // Adjust bottom margin based on toggle
        adjustBottomMargin(addModal, 'meta');
    });

    // Add Meta Field
    addModal.querySelector('#add-meta-field-btn').addEventListener('click', () => {
        const metaFields = metaFieldsContainer.querySelectorAll('.cso-meta-field');
        if (metaFields.length >= 3) {
            showNotification('You can add up to 3 meta fields only.', 'danger');
            console.warn('[CSO Builder] Attempted to add more than 3 meta fields.');
            return;
        }
        addMetaField(metaFieldsContainer);
    });

    // Toggle Time Slots
    const timeSlotsToggle = addModal.querySelector('#cso-time-slots-toggle');
    const timeSlotsContainer = addModal.querySelector('.cso-time-slots-container');

    timeSlotsToggle.addEventListener('change', function() {
        if(this.checked) {
            timeSlotsContainer.classList.add('active');
        } else {
            timeSlotsContainer.classList.remove('active');
        }
        // Adjust bottom margin based on toggle
        adjustBottomMargin(addModal, 'time-slots');
    });

    // Handle Time Slots
    let timeSlotsArray = [];
    const timeSlotsTbody = addModal.querySelector('#time-slots-table tbody');

    // Add Time Slot
    addModal.querySelector('#add-time-slot-btn').addEventListener('click', () => {
        openAddTimeSlotModal(timeSlotsTbody, timeSlotsArray, addModalOverlay);
    });

    // If methodData is provided (for cloning), pre-fill the fields
    if (methodData) {
        preFillAddMethodModal(addModal, methodData, timeSlotsArray);
    }

    // Save Method
    addModal.querySelector('#cso-save-method-btn').addEventListener('click', () => {
        saveMethod(addModal, addShippingMethodRow, addModalOverlay, timeSlotsArray);
    });

    /* ------------------- Fetch Shipping Methods ------------------- */

    // Variable to store fetched shipping methods
    let shippingMethodsList = [];

    // Existing fetch shipping method value
    let existingFetchShippingMethod = methodData?.fetch?.shipping_method || '';

    // Fetch shipping methods when modal opens
    fetchShippingMethods(function(err, methods) {
        const fetchShippingMethodDropdown = addModal.querySelector('#cso-fetch-shipping-method');
        if (err) {
            console.error(err);
            // If there's an error, set the existing value or default option
            populateShippingMethodsDropdown(fetchShippingMethodDropdown, [], existingFetchShippingMethod);
            return;
        }
        shippingMethodsList = methods;
        // Populate the dropdown immediately
        populateShippingMethodsDropdown(fetchShippingMethodDropdown, shippingMethodsList, existingFetchShippingMethod);
    });
};
        /* ------------------- Pre-fill Add Method Modal (For Cloning) ------------------- */

        const preFillAddMethodModal = (addModal, methodData, timeSlotsArray) => {
            addModal.querySelector('#cso-shipping-method').value = methodData.shipping_method || '';
            addModal.querySelector('#cso-carrier-name').value = methodData.carrier_name || '';
            addModal.querySelector('#cso-delivery-type').value = methodData.delivery_type || '';
            addModal.querySelector('#cso-product-name').value = methodData.product || '';

            if (methodData.fetch) {
                addModal.querySelector('#cso-fetch-toggle').checked = true;
                addModal.querySelector('.cso-fetch-container').classList.add('active');
                // Existing fetch shipping method value
                const existingFetchShippingMethod = methodData.fetch.shipping_method || '';

                // The dropdown will be populated when the user focuses on it
                // Event listener for when the user clicks on the dropdown
                const fetchShippingMethodDropdown = addModal.querySelector('#cso-fetch-shipping-method');
                fetchShippingMethodDropdown.addEventListener('focus', function() {
                    if (fetchShippingMethodDropdown.options.length <= 1) { // if not already populated
                        populateShippingMethodsDropdown(fetchShippingMethodDropdown, shippingMethodsList, existingFetchShippingMethod);
                    }
                });

                addModal.querySelector('#cso-fetch-delivery-type').value = methodData.fetch.delivery_type || '';
                addModal.querySelector('#cso-fetch-pickup-location-types').value = Array.isArray(methodData.fetch.pickup_location_types) ? methodData.fetch.pickup_location_types.join(', ') : '';
            }

            if (methodData.meta && Object.keys(methodData.meta).length > 0) {
                addModal.querySelector('#cso-meta-toggle').checked = true;
                addModal.querySelector('.cso-meta-container').classList.add('active');
                Object.entries(methodData.meta).forEach(([key, value]) => {
                    addMetaField(addModal.querySelector('.cso-meta-fields'), key, value);
                });
            }

            if (methodData.time_slots && methodData.time_slots.length > 0) {
                addModal.querySelector('#cso-time-slots-toggle').checked = true;
                addModal.querySelector('.cso-time-slots-container').classList.add('active');
                methodData.time_slots.forEach(tsData => {
                    timeSlotsArray.push(tsData);
                    addTimeSlotRow(tsData, addModal.querySelector('#time-slots-table tbody'), timeSlotsArray);
                });
            }

            if (methodData.fetch && methodData.fetch.pickup_location_types) {
    const pickupTypesSelect = addModal.querySelector('#cso-fetch-pickup-location-types');
    Array.from(pickupTypesSelect.options).forEach(option => {
        if (methodData.fetch.pickup_location_types.includes(option.value)) {
            option.selected = true;
        }
    });
}
        };

        /* ------------------- Add Meta Field Function ------------------- */

        const addMetaField = (container, key = '', value = '') => {
            const metaFieldDiv = createElement('div', { className: 'cso-meta-field' },
                createElement('input', {
                    type: 'text',
                    className: 'cso-meta-key',
                    placeholder: 'Field Name',
                    value: key
                }),
                createElement('input', {
                    type: 'text',
                    className: 'cso-meta-value',
                    placeholder: 'Field Value',
                    value: value
                }),
                createElement('button', {
                    className: 'cso-remove-meta-btn',
                    innerHTML: `<i class="fas fa-times"></i> Remove`,
                    style: 'margin-left: 5px; padding: 4px 8px; font-size: 12px;'
                })
            );

            // Remove Meta Field Event
            metaFieldDiv.querySelector('.cso-remove-meta-btn').addEventListener('click', () => {
                metaFieldDiv.remove();
                // Re-enable the add meta button if less than 3 meta fields
                const addMetaBtn = container.parentElement.querySelector('#add-meta-field-btn');
                if (container.querySelectorAll('.cso-meta-field').length < 3) {
                    // Optionally, you can re-enable the button here if previously disabled
                }
            });

            container.appendChild(metaFieldDiv);
        };

        /* ------------------- Adjust Bottom Margin Function ------------------- */

        const adjustBottomMargin = (modal, section) => {
            // This function can be used to adjust layout based on active sections
            // Currently, it's a placeholder for any dynamic styling needed
            // Implement any required margin adjustments here
        };

        /* ------------------- Save Method ------------------- */

        const saveMethod = (addModal, addShippingMethodRow, addModalOverlay, timeSlots) => {
            const shipping_method = addModal.querySelector('#cso-shipping-method').value.trim();
            const carrier_name = addModal.querySelector('#cso-carrier-name').value.trim();
            const delivery_type = addModal.querySelector('#cso-delivery-type').value;
            const product = addModal.querySelector('#cso-product-name').value.trim();

            // Fetch Section Data
            let fetch_shipping_method = null;
            let fetch_delivery_type = null;
            let fetch_pickup_location_types = [];

            const fetchContainer = addModal.querySelector('.cso-fetch-container');
            if (fetchContainer.classList.contains('active')) {
                fetch_shipping_method = addModal.querySelector('#cso-fetch-shipping-method').value.trim();
                fetch_delivery_type = addModal.querySelector('#cso-fetch-delivery-type').value;
                fetch_pickup_location_types = Array.from(addModal.querySelector('#cso-fetch-pickup-location-types').selectedOptions).map(option => option.value);
            }

            // Meta Section Data
            const metaFields = addModal.querySelectorAll('.cso-meta-field');
            const meta = {};
            metaFields.forEach(field => {
                const key = field.querySelector('.cso-meta-key').value.trim();
                const value = field.querySelector('.cso-meta-value').value.trim();
                if(key) {
                    meta[key] = value;
                }
            });

const shipping_method_input = addModal.querySelector('#cso-shipping-method');

shipping_method_input.addEventListener('focus', () => {
  shipping_method_input.style.border = '';
  shipping_method_input.style.boxShadow = '';
});

const shipping_method_value = shipping_method_input.value.trim();

if (!shipping_method_value) {
  // Bitch and moan if it’s empty
  showNotification('Please fill in the Shipping Method Name.', 'danger');
  console.warn('[CSO Builder] Missing required fields.');

  // Smear it in red to shame the wanker who forgot to fill it
  shipping_method_input.style.border = '2px solid red';
  shipping_method_input.style.boxShadow = '0 0 5px rgba(255, 0, 0, 0.8)';

  return;
}

            // Check for duplicate shipping method
            if(window.csoConfig.methods.some(m => m.shipping_method === shipping_method)) {
                showNotification('Shipping method already exists.', 'danger');
                console.warn(`[CSO Builder] Duplicate shipping method detected: ${shipping_method}`);
                return;
            }

            // Construct method data
            const methodData = {
                shipping_method,
                carrier_name,
                delivery_type,
                product,
                fetch: fetch_shipping_method ? {
                    shipping_method: fetch_shipping_method,
                    delivery_type: fetch_delivery_type,
pickup_location_types: fetch_pickup_location_types.length ? fetch_pickup_location_types : []
                } : undefined,
                meta: Object.keys(meta).length > 0 ? meta : undefined,
                time_slots: Array.isArray(timeSlots) ? [...timeSlots] : []
            };


            // Add the new shipping method to the table and config
            addShippingMethodRow(methodData);

            showNotification('Shipping method added successfully.');
            closeModal(addModalOverlay);
        };

/* ------------------- Open Edit Method Modal ------------------- */

const openEditMethodModal = (tr, shippingMethod) => {
    const methodData = window.csoConfig.methods.find(m => m.shipping_method === shippingMethod);
    if (!methodData) {
        showNotification('Shipping method not found.', 'danger');
        console.error(`[CSO Builder] Shipping method not found: ${shippingMethod}`);
        return;
    }

    const editModalOverlay = createModalOverlay('cso-edit-method-modal-overlay');
    const editModal = createElement('div', { id: 'cso-edit-method-modal', style: `
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
        createElement('h3', { innerHTML: `<i class="fas fa-edit"></i> Edit Shipping Method` }),
        // Form Groups
        createElement('div', { className: 'cso-form-group' },
            createElement('label', { for: 'cso-shipping-method' }, 'Shipping Method Name'),
            createElement('input', { type: 'text', id: 'cso-shipping-method', placeholder: 'Enter shipping method name', value: methodData.shipping_method || '', disabled: true })
        ),
        createElement('div', { className: 'cso-form-group' },
            createElement('label', { for: 'cso-carrier-name' }, 'Carrier Name'),
            createElement('input', { type: 'text', id: 'cso-carrier-name', placeholder: 'Enter carrier name', value: methodData.carrier_name || '' })
        ),
        createElement('div', { className: 'cso-form-group' },
            createElement('label', { for: 'cso-delivery-type' }, 'Delivery Type'),
            createElement('select', { id: 'cso-delivery-type' },
                createElement('option', { value: 'DELIVERY', selected: methodData.delivery_type === 'DELIVERY' }, 'DELIVERY'),
                createElement('option', { value: 'PICKUP', selected: methodData.delivery_type === 'PICKUP' }, 'PICKUP'),
                createElement('option', { value: 'MAILBOX', selected: methodData.delivery_type === 'MAILBOX' }, 'MAILBOX'),
                createElement('option', { value: 'INSTORE', selected: methodData.delivery_type === 'INSTORE' }, 'INSTORE'),
                createElement('option', { value: 'INWAREHOUSE', selected: methodData.delivery_type === 'INWAREHOUSE' }, 'INWAREHOUSE')
            )
        ),
        createElement('div', { className: 'cso-form-group' },
            createElement('label', { for: 'cso-product-name' }, 'Display Name'),
            createElement('input', { type: 'text', id: 'cso-product-name', placeholder: 'Enter product', value: methodData.product || '' })
        ),
        // Fetch Configuration Toggle
        createElement('div', { className: 'cso-form-group cso-fetch-toggle' },
            createElement('label', {}, 'Add Fetch Configuration?'),
            createElement('input', { type: 'checkbox', id: 'cso-fetch-toggle', checked: methodData.fetch ? true : false })
        ),
        // Fetch Configuration Container
        createElement('div', { className: 'cso-fetch-container' },
            createElement('div', { className: 'cso-form-group' },
                createElement('label', { for: 'cso-fetch-shipping-method' }, 'Fetch Shipping Method'),
                createElement('select', { id: 'cso-fetch-shipping-method', className: 'cso-fetch-shipping-method' })
            ),
            createElement('div', { className: 'cso-form-group' },
                createElement('label', { for: 'cso-fetch-delivery-type' }, 'Fetch Delivery Type'),
                createElement('select', { id: 'cso-fetch-delivery-type' },
                              createElement('option', { value: 'DELIVERY', selected: methodData.delivery_type === 'DELIVERY' }, 'DELIVERY'),
                              createElement('option', { value: 'PICKUP', selected: methodData.delivery_type === 'PICKUP' }, 'PICKUP'),
                              createElement('option', { value: 'MAILBOX', selected: methodData.delivery_type === 'MAILBOX' }, 'MAILBOX'),
                              createElement('option', { value: 'INSTORE', selected: methodData.delivery_type === 'INSTORE' }, 'INSTORE'),
                              createElement('option', { value: 'INWAREHOUSE', selected: methodData.delivery_type === 'INWAREHOUSE' }, 'INWAREHOUSE')
                )
            ),
createElement('div', { className: 'cso-form-group' },
    createElement('label', { for: 'cso-fetch-pickup-location-types' }, 'Fetch Pickup Location Types'),
    createElement('select', { id: 'cso-fetch-pickup-location-types', multiple: true },
        ...['UNKNOWN_PICKUP_LOCATION_TYPE', 'LOCKER', 'STORE', 'POSTOFFICE', 'MANNED'].map(value =>
            createElement('option', {
                value: value,
                selected: methodData.fetch && methodData.fetch.pickup_location_types && methodData.fetch.pickup_location_types.includes(value)
            }, value)
        )
    )
)
        ),
        // Meta Fields Toggle
        createElement('div', { className: 'cso-form-group cso-toggle-switch' },
            createElement('label', {}, 'Add Meta Information?'),
            createElement('input', { type: 'checkbox', id: 'cso-meta-toggle', checked: methodData.meta ? true : false })
        ),
        // Meta Fields Container
        createElement('div', { className: 'cso-meta-container' },
            createElement('button', { className: 'cso-button', id: 'add-meta-field-btn' }, 'Add Meta Field'),
            createElement('div', { className: 'cso-meta-fields' })
        ),
        // Time Slots Toggle
        createElement('div', { className: 'cso-form-group cso-toggle-switch' },
            createElement('label', {}, 'Add Time Slots?'),
            createElement('input', { type: 'checkbox', id: 'cso-time-slots-toggle', checked: methodData.time_slots && methodData.time_slots.length > 0 ? true : false })
        ),
        // Time Slots Container
        createElement('div', { className: 'cso-time-slots-container' },
            createElement('button', { className: 'cso-button', id: 'cso-add-time-slot-btn', innerHTML: `<i className="fas fa-plus"></i> Add Time Slot` }),
            createElement('table', { className: 'cso-table', id: 'time-slots-table' },
                createElement('thead', {},
                    createElement('tr', {},
                        createElement('th', {}, 'Name'),
                        createElement('th', {}, 'Start'),
                        createElement('th', {}, 'End'),
                        createElement('th', {}, 'Expires'),
                        createElement('th', {}, 'Filter Rules'),
                        createElement('th', {}, 'Actions')
                    )
                ),
                createElement('tbody', {})
            )
        ),
        // Buttons
        createElement('div', { style: 'margin-top: 10px; display: flex; gap: 10px;' },
            createElement('button', { className: 'cso-button', id: 'cso-update-method-btn', innerHTML: `<i className="fas fa-save"></i> Update` }),
            createElement('button', { className: 'cso-button secondary', id: 'cso-cancel-method-btn', innerHTML: `<i className="fas fa-times"></i> Cancel` })
        )
    );

    editModalOverlay.appendChild(editModal);
    openModal(editModalOverlay);

    // Add "X" close button to the Edit Method modal
    addCloseButton(editModal, 'cso-edit-method-modal-overlay');

// Grab the fetch Delivery type select and the pickup location group from the edit modal
const fetchDeliveryTypeSelectEdit = editModal.querySelector('#cso-fetch-delivery-type');
const pickupLocationGroupEdit = editModal.querySelector('label[for="cso-fetch-pickup-location-types"]').parentElement;

// Add a help text to the pickup location label in the edit modal
const pickupLocationLabelEdit = editModal.querySelector('label[for="cso-fetch-pickup-location-types"]');
if (pickupLocationLabelEdit) {
    const helpTextEdit = document.createElement('small');
    helpTextEdit.style.display = 'block';
    helpTextEdit.style.fontSize = '11px';
    helpTextEdit.style.color = '#6c757d';
    helpTextEdit.textContent = 'Hold cmd to select several options';
    pickupLocationLabelEdit.appendChild(helpTextEdit);
}

// Function to toggle the pickup location types field in the edit modal
function togglePickupLocationTypesEdit() {
    if (fetchDeliveryTypeSelectEdit.value === 'PICKUP') {
        pickupLocationGroupEdit.style.display = 'block';
    } else {
        pickupLocationGroupEdit.style.display = 'none';
    }
}

// Set initial state and add change listener for the edit modal
togglePickupLocationTypesEdit();
fetchDeliveryTypeSelectEdit.addEventListener('change', togglePickupLocationTypesEdit);


    /* ------------------- Event Listeners ------------------- */

    // Close Edit Modal
    editModal.querySelector('#cso-cancel-method-btn').addEventListener('click', () => {
        closeModal(editModalOverlay);
    });

    // Toggle Fetch Configuration
    const fetchToggle = editModal.querySelector('#cso-fetch-toggle');
    const fetchContainer = editModal.querySelector('.cso-fetch-container');

    if(fetchToggle.checked) {
        fetchContainer.classList.add('active');
    }

    fetchToggle.addEventListener('change', function() {
        if(this.checked) {
            fetchContainer.classList.add('active');
        } else {
            fetchContainer.classList.remove('active');
        }
        // Adjust bottom margin based on toggle
        adjustBottomMargin(editModal, 'fetch');
    });

    // Toggle Meta Fields
    const metaToggle = editModal.querySelector('#cso-meta-toggle');
    const metaContainer = editModal.querySelector('.cso-meta-container');
    const metaFieldsContainer = metaContainer.querySelector('.cso-meta-fields');

    if(metaToggle.checked) {
        metaContainer.classList.add('active');
        // Populate existing meta fields
        if (methodData.meta && typeof methodData.meta === 'object') {
            Object.entries(methodData.meta).forEach(([key, value]) => {
                addMetaField(metaFieldsContainer, key, value);
            });
        }
    }

    metaToggle.addEventListener('change', function() {
        if(this.checked) {
            metaContainer.classList.add('active');
        } else {
            metaContainer.classList.remove('active');
        }
        // Adjust bottom margin based on toggle
        adjustBottomMargin(editModal, 'meta');
    });

    // Add Meta Field
    editModal.querySelector('#add-meta-field-btn').addEventListener('click', () => {
        const metaFields = metaFieldsContainer.querySelectorAll('.cso-meta-field');
        if (metaFields.length >= 3) {
            showNotification('You can add up to 3 meta fields only.', 'danger');
            console.warn('[CSO Builder] Attempted to add more than 3 meta fields.');
            return;
        }
        addMetaField(metaFieldsContainer);
    });

    // Toggle Time Slots
    const timeSlotsToggle = editModal.querySelector('#cso-time-slots-toggle');
    const timeSlotsContainer = editModal.querySelector('.cso-time-slots-container');

    if(timeSlotsToggle.checked) {
        timeSlotsContainer.classList.add('active');
    }

    timeSlotsToggle.addEventListener('change', function() {
        if(this.checked) {
            timeSlotsContainer.classList.add('active');
        } else {
            timeSlotsContainer.classList.remove('active');
        }
        // Adjust bottom margin based on toggle
        adjustBottomMargin(editModal, 'time-slots');
    });

    // Handle Time Slots
    let timeSlotsArray = methodData.time_slots ? [...methodData.time_slots] : [];
    const timeSlotsTbody = editModal.querySelector('#time-slots-table tbody');

    // Populate existing time slots
    if (timeSlotsArray.length > 0) {
        timeSlotsArray.forEach(tsData => {
            addTimeSlotRow(tsData, timeSlotsTbody, timeSlotsArray, editModalOverlay);
        });
    }

    // Add Time Slot
    editModal.querySelector('#cso-add-time-slot-btn').addEventListener('click', () => {
        openAddTimeSlotModal(timeSlotsTbody, timeSlotsArray, editModalOverlay);
    });

    // Update Method
    editModal.querySelector('#cso-update-method-btn').addEventListener('click', () => {
        updateMethod(editModal, tr, methodData, editModalOverlay, timeSlotsArray);
    });

    /* ------------------- Fetch Shipping Methods ------------------- */

    // Variable to store fetched shipping methods
    let shippingMethodsList = [];

    // Existing fetch shipping method value
    let existingFetchShippingMethod = methodData.fetch?.shipping_method || '';

    // Fetch shipping methods when modal opens
    fetchShippingMethods(function(err, methods) {
        const fetchShippingMethodDropdown = editModal.querySelector('#cso-fetch-shipping-method');
        if (err) {
            console.error(err);
            // If there's an error, set the existing value or default option
            populateShippingMethodsDropdown(fetchShippingMethodDropdown, [], existingFetchShippingMethod);
            return;
        }
        shippingMethodsList = methods;
        // Populate the dropdown immediately
        populateShippingMethodsDropdown(fetchShippingMethodDropdown, shippingMethodsList, existingFetchShippingMethod);
    });
};
        /* ------------------- Add Time Slot Modal ------------------- */

        const openAddTimeSlotModal = (tbody, timeSlotsArray, parentModalOverlay) => {
            const addTSModalOverlay = createModalOverlay('cso-add-ts-modal-overlay');
            const addTSModal = createElement('div', { id: 'cso-add-ts-modal', style: `
                background: #fff;
                width: 90%;
                max-width: 600px;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                position: relative;
                max-height: 90%;
                overflow-y: auto;
                animation: slideIn 0.3s ease-out;
            ` },
                createElement('h3', { innerHTML: `<i class="fas fa-plus"></i> Add Time Slot` }),
                // Form Groups
                createElement('div', { className: 'cso-form-group' },
                    createElement('label', { for: 'cso-ts-name' }, 'Time Slot Name'),
                    createElement('input', { type: 'text', id: 'cso-ts-name', placeholder: 'Enter time slot name' })
                ),
                // Start Operation
                createElement('div', { className: 'cso-form-group' },
                    createElement('label', {}, 'Start Operation'),
                    createElement('div', { id: 'cso-ts-start-operation-container' })
                ),
                // End Operation
                createElement('div', { className: 'cso-form-group' },
                    createElement('label', {}, 'End Operation'),
                    createElement('div', { id: 'cso-ts-end-operation-container' })
                ),
                // Expires Toggle
                createElement('div', { className: 'cso-form-group cso-toggle-switch' },
                    createElement('label', {}, 'Add Expires Operation?'),
                    createElement('input', { type: 'checkbox', id: 'cso-ts-expires-toggle' })
                ),
                // Expires Operation Container
                createElement('div', { className: 'cso-expires-container', style: 'display: none;' },
                    createElement('div', { className: 'cso-form-group' },
                        createElement('label', {}, 'Expires Operation'),
                        createElement('div', { id: 'cso-ts-expires-operation-container' })
                    )
                ),
                // Filter Rules Toggle
                createElement('div', { className: 'cso-form-group cso-toggle-switch' },
                    createElement('label', {}, 'Add Filter Rules?'),
                    createElement('input', { type: 'checkbox', id: 'cso-ts-filter-rules-toggle' })
                ),
                // Filter Rules Container
                createElement('div', { className: 'cso-filter-rules-container', style: 'display: none;' },
                    createElement('div', { className: 'cso-form-group' },
                        createElement('label', { for: 'cso-ts-region-ids' }, 'Region IDs (comma or semicolon separated)'),
                        createElement('input', { type: 'text', id: 'cso-ts-region-ids', placeholder: 'Enter region IDs' })
                    )
                ),
                // Buttons
                createElement('div', { style: 'margin-top: 10px; display: flex; gap: 10px;' },
                    createElement('button', { className: 'cso-button', id: 'cso-save-ts-btn', innerHTML: `<i class="fas fa-save"></i> Save` }),
                    createElement('button', { className: 'cso-button secondary', id: 'cso-cancel-ts-btn', innerHTML: `<i class="fas fa-times"></i> Cancel` })
                )
            );

            addTSModalOverlay.appendChild(addTSModal);
            openModal(addTSModalOverlay);

            // Add "X" close button to the Add Time Slot modal
            addCloseButton(addTSModal, 'cso-add-ts-modal-overlay');

            /* ------------------- Event Listeners ------------------- */

            // Close Add TS Modal
            addTSModal.querySelector('#cso-cancel-ts-btn').addEventListener('click', () => {
                closeModal(addTSModalOverlay);
            });

            // Populate Operation Forms
            const availableOperations = getAvailableOperations();
            const startOpContainer = addTSModal.querySelector('#cso-ts-start-operation-container');
            const endOpContainer = addTSModal.querySelector('#cso-ts-end-operation-container');

            startOpContainer.appendChild(createOperationForm(availableOperations, 'start'));
            endOpContainer.appendChild(createOperationForm(availableOperations, 'end'));

            // Expires Toggle
            const expiresToggle = addTSModal.querySelector('#cso-ts-expires-toggle');
            const expiresContainer = addTSModal.querySelector('.cso-expires-container');
            const expiresOpContainer = addTSModal.querySelector('#cso-ts-expires-operation-container');

            expiresToggle.addEventListener('change', function() {
                if(this.checked) {
                    expiresContainer.style.display = 'block';
                    expiresOpContainer.appendChild(createOperationForm(availableOperations, 'expires'));
                } else {
                    expiresContainer.style.display = 'none';
                    expiresOpContainer.innerHTML = '';
                }
                // Adjust bottom margin based on toggle
                adjustBottomMargin(addTSModal, 'expires');
            });

            // Filter Rules Toggle
            const filterRulesToggle = addTSModal.querySelector('#cso-ts-filter-rules-toggle');
            const filterRulesContainer = addTSModal.querySelector('.cso-filter-rules-container');

            filterRulesToggle.addEventListener('change', function() {
                if(this.checked) {
                    filterRulesContainer.style.display = 'block';
                } else {
                    filterRulesContainer.style.display = 'none';
                }
                // Adjust bottom margin based on toggle
                adjustBottomMargin(addTSModal, 'filter-rules');
            });

            // Save Time Slot
            addTSModal.querySelector('#cso-save-ts-btn').addEventListener('click', () => {
                saveTimeSlot(addTSModal, timeSlotsArray, tbody, addTSModalOverlay);
            });
        };

        /* ------------------- Save Time Slot ------------------- */

const saveTimeSlot = (addTSModal, timeSlotsArray, tbody, addTSModalOverlay) => {
    const name = addTSModal.querySelector('#cso-ts-name').value.trim();
    if(!name) {
        showNotification('Please enter the time slot name.', 'danger');
        console.warn('[CSO Builder] Time slot name is missing.');
        return;
    }

    // Check for duplicate time slot name
    if(timeSlotsArray.some(ts => ts.name === name)) {
        showNotification('Time slot name already exists.', 'danger');
        console.warn(`[CSO Builder] Duplicate time slot name detected: ${name}`);
        return;
    }

    // Collect operations
    const operations = {};

    // Function to process operations for a given target (start, end, expires)
    const createProcessOperation = (container, target) => {
        const opSelect = container.querySelector('.operation-select');
        if (!opSelect) {
            // If there's no operation-select, no operation was chosen.
            // Return true or handle accordingly. Here we assume no operation is fine.
            return true;
        }

        const opDiv = opSelect.parentElement && opSelect.parentElement.parentElement;
        if (!opDiv) {
            // If something unexpected happened in the DOM structure
            return null;
        }

        const action = opDiv.querySelector('.operation-select').value;
        const param = opDiv.querySelector('.operation-param').value.trim();

        if (action) {
            if (['add_business_days', 'add_days', 'add_hours', 'add_minutes'].includes(action)) {
                if (param === '' || isNaN(param)) {
                    showNotification(`Please enter a valid number for ${action}.`, 'danger');
                    console.warn(`[CSO Builder] Invalid parameter for ${action}: "${param}"`);
                    return null;
                }
                if (target === 'expires') {
                    // Use time_now instead of pickup_time.expires
                    operations[target] = `time_now.${action}(${param})`;
                } else {
                    if (action === 'add_business_days') {
                        operations[target] = `pickup_time.${target}.${action}(${param}, address_from.country)`;
                    } else {
                        operations[target] = `pickup_time.${target}.${action}(${param})`;
                    }
                }
            } else if (action === 'set_hhmm') {
                const timePattern = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
                if (!timePattern.test(param)) {
                    showNotification(`Please enter a valid time in HH:MM format for set_hhmm.`, 'danger');
                    console.warn(`[CSO Builder] Invalid time format for set_hhmm: "${param}"`);
                    return null;
                }
                if (target === 'expires') {
                    operations[target] = `time_now.set_hhmm('${param}')`;
                } else {
                    operations[target] = `pickup_time.${target}.set_hhmm('${param}')`;
                }
            }
        }
        return true;
    };

    const startResult = createProcessOperation(addTSModal.querySelector('#cso-ts-start-operation-container'), 'start');
    if(startResult === null) return;

    const endResult = createProcessOperation(addTSModal.querySelector('#cso-ts-end-operation-container'), 'end');
    if(endResult === null) return;

    const expiresResult = createProcessOperation(addTSModal.querySelector('#cso-ts-expires-operation-container'), 'expires');
    if(expiresResult === null) return;

    // Ensure name, start, and end are present
    if(!operations.start || !operations.end) {
        showNotification('Please add operations for both start and end.', 'danger');
        console.warn('[CSO Builder] Missing start or end operations.');
        return;
    }

    // Expires is optional
    const expires = operations.expires ? operations.expires : null;

    // Handle Filter Rules
    const addFilterRules = addTSModal.querySelector('#cso-ts-filter-rules-toggle').checked;
    let filter_rules = [];
    if(addFilterRules) {
        const regionInput = addTSModal.querySelector('#cso-ts-region-ids').value.trim();
        if(!regionInput) {
            showNotification('Please enter at least one region ID or leave the filter rules unchecked.', 'danger');
            console.warn('[CSO Builder] Filter rules enabled but no region IDs provided.');
            return;
        }
        const regions = regionInput.split(/[,;]+/).map(r => r.trim()).filter(r => r);
        if(regions.length === 0) {
            showNotification('Please enter valid region IDs separated by commas or semicolons.', 'danger');
            console.warn('[CSO Builder] Invalid region IDs provided.');
            return;
        }
        filter_rules.push({
            "condition": `region.id in [${regions.map(r => `'${r}'`).join(', ')}]`
        });
    }

    // Construct time slot data
    const tsData = {
        name,
        start: operations.start,
        end: operations.end
    };
    if(expires) {
        tsData.expires = operations.expires;
    }
    if(filter_rules.length > 0) {
        tsData.filter_rules = filter_rules;
    }

    // Add the new time slot data to the array
    timeSlotsArray.push(tsData);

    // Re-render the time slots table
    renderTimeSlotsTable(tbody, timeSlotsArray);

    showNotification('Time slot added successfully.');
    closeModal(addTSModalOverlay);
};
        /* ------------------- Add Time Slot Row ------------------- */

const addTimeSlotRow = (tsData, tbody, timeSlotsArray, parentModalOverlay) => {
    // Helper function to format operation display
    const formatOperationDisplay = (operationString) => {
        const parsed = parseOperationString(operationString);
        if (parsed) {
            const { action, param } = parsed;
            const label = operationLabels[action] || action;
            return `${label} (${param})`;
        }
        return operationString; // Fallback to original string if parsing fails
    };

    const tr = createElement('tr', {},
        createElement('td', { className: 'cso-ts-name' }, tsData.name || ''),
        createElement('td', { className: 'cso-ts-start' }, tsData.start ? formatOperationDisplay(tsData.start) : ''),
        createElement('td', { className: 'cso-ts-end' }, tsData.end ? formatOperationDisplay(tsData.end) : ''),
        createElement('td', { className: 'cso-ts-expires' }, tsData.expires ? formatOperationDisplay(tsData.expires) : ''),
        createElement('td', { className: 'cso-ts-filter-rules' },
            tsData.filter_rules && tsData.filter_rules.length > 0
                ? createElement('ul', {},
                    ...tsData.filter_rules.map(fr => createElement('li', {}, fr.condition))
                  )
                : ''
        ),
        createElement('td', { className: 'cso-ts-actions' },
            createElement('button', { className: 'cso-button secondary edit-time-slot-btn', innerHTML: `<i class="fas fa-edit"></i> Edit` }),
            createElement('button', { className: 'cso-button danger delete-time-slot-btn', innerHTML: `<i class="fas fa-trash-alt"></i> Delete` })
        )
    );

    // Edit Time Slot Event
    tr.querySelector('.edit-time-slot-btn').addEventListener('click', function() {
        const tsName = tr.querySelector('.cso-ts-name').textContent.trim();
        const currentTSData = timeSlotsArray.find(ts => ts.name === tsName);
        openEditTimeSlotModal(tbody, tsName, timeSlotsArray);
    });

    // Delete Time Slot Event
    tr.querySelector('.delete-time-slot-btn').addEventListener('click', () => {
        if(confirm(`Are you sure you want to delete the time slot "${tsData.name}"?`)) {
            tbody.removeChild(tr);
            // Remove from timeSlots array
            const index = timeSlotsArray.findIndex(ts => ts.name === tsData.name);
            if(index !== -1) {
                timeSlotsArray.splice(index, 1);
            }
            showNotification('Time slot deleted successfully.');
        }
    });

    tbody.appendChild(tr);
};
        /* ------------------- Open Edit Time Slot Modal ------------------- */

        const openEditTimeSlotModal = (tbody, tsName, timeSlotsArray) => {

            // Fetch the latest tsData
            const tsData = timeSlotsArray.find(ts => ts.name === tsName);
            if (!tsData) {
                showNotification('Time slot not found.', 'danger');
                console.error(`[CSO Builder] Time slot not found: ${tsName}`);
                return;
            }

            // Remove any existing modal overlay
            const existingOverlay = document.getElementById('cso-edit-ts-modal-overlay');
            if (existingOverlay) {
                existingOverlay.parentNode.removeChild(existingOverlay);
            }
            const editTSModalOverlay = createModalOverlay('cso-edit-ts-modal-overlay');
            const editTSModal = createElement('div', { id: 'cso-edit-ts-modal', style: `
                background: #fff;
                width: 90%;
                max-width: 600px;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                position: relative;
                max-height: 90%;
                overflow-y: auto;
                animation: slideIn 0.3s ease-out;
            ` },
                createElement('h3', { innerHTML: `<i class="fas fa-edit"></i> Edit Time Slot` }),
                // Form Groups
                createElement('div', { className: 'cso-form-group' },
                    createElement('label', { for: 'cso-ts-name' }, 'Time Slot Name'),
                    createElement('input', { type: 'text', id: 'cso-ts-name', placeholder: 'Enter time slot name', value: tsData.name || '', disabled: true })
                ),
                // Start Operation
                createElement('div', { className: 'cso-form-group' },
                    createElement('label', {}, 'Start Operation'),
                    createElement('div', { id: 'cso-ts-start-operation-container' })
                ),
                // End Operation
                createElement('div', { className: 'cso-form-group' },
                    createElement('label', {}, 'End Operation'),
                    createElement('div', { id: 'cso-ts-end-operation-container' })
                ),
                // Expires Toggle
                createElement('div', { className: 'cso-form-group cso-toggle-switch' },
                    createElement('label', {}, 'Add Expires Operation?'),
                    createElement('input', { type: 'checkbox', id: 'cso-ts-expires-toggle', checked: tsData.expires ? true : false })
                ),
                // Expires Operation Container
                createElement('div', { className: 'cso-expires-container', style: 'display: none;' },
                    createElement('div', { className: 'cso-form-group' },
                        createElement('label', {}, 'Expires Operation'),
                        createElement('div', { id: 'cso-ts-expires-operation-container' })
                    )
                ),
                // Filter Rules Toggle
                createElement('div', { className: 'cso-form-group cso-toggle-switch' },
                    createElement('label', {}, 'Add Filter Rules?'),
                    createElement('input', { type: 'checkbox', id: 'cso-ts-filter-rules-toggle', checked: tsData.filter_rules && tsData.filter_rules.length > 0 ? true : false })
                ),
                // Filter Rules Container
                createElement('div', { className: 'cso-filter-rules-container', style: tsData.filter_rules && tsData.filter_rules.length > 0 ? '' : 'display: none;' },
                    createElement('div', { className: 'cso-form-group' },
                        createElement('label', { for: 'cso-ts-region-ids' }, 'Region IDs (comma or semicolon separated)'),
                        createElement('input', { type: 'text', id: 'cso-ts-region-ids', placeholder: 'Enter region IDs', value: tsData.filter_rules && tsData.filter_rules.length > 0 ? tsData.filter_rules[0].condition.match(/'([^']+)'/g).map(s => s.replace(/'/g, '')).join(', ') : '' })
                    )
                ),
                // Buttons
                createElement('div', { style: 'margin-top: 10px; display: flex; gap: 10px;' },
                    createElement('button', { className: 'cso-button', id: 'cso-save-ts-btn', innerHTML: `<i class="fas fa-save"></i> Update` }),
                    createElement('button', { className: 'cso-button secondary', id: 'cso-cancel-ts-btn', innerHTML: `<i class="fas fa-times"></i> Cancel` })
                )
            );

            editTSModalOverlay.appendChild(editTSModal);
            openModal(editTSModalOverlay);

            // Add "X" close button to the Edit Time Slot modal
            addCloseButton(editTSModal, 'cso-edit-ts-modal-overlay');

            /* ------------------- Event Listeners ------------------- */

            // Close Edit TS Modal
            editTSModal.querySelector('#cso-cancel-ts-btn').addEventListener('click', () => {
                closeModal(editTSModalOverlay);
            });

            // Populate Operation Forms
            const availableOperations = getAvailableOperations();
            const startOpContainer = editTSModal.querySelector('#cso-ts-start-operation-container');
            const endOpContainer = editTSModal.querySelector('#cso-ts-end-operation-container');

            // Parse existing operations from tsData.start and tsData.end
const parseOperation = (operationString) => {
    // Pattern 1: pickup_time.{target}.{action}({param})
    const matchPickup = operationString.match(/pickup_time\.(start|end|expires)\.(\w+)\(([^)]*)\)/);
    if (matchPickup) {
        const target = matchPickup[1];
        const action = matchPickup[2];
        let param = matchPickup[3].trim();

        if (action === 'set_hhmm') {
            param = param.replace(/['"]/g, '');
        } else if (action === 'add_business_days') {
            const valueMatch = param.match(/(\d+),/);
            if (valueMatch) {
                param = valueMatch[1];
            } else {
                param = '';
            }
        }

        return { action, value: param };
    }

    // Pattern 2: time_now.{action}({param})
    const matchTimeNow = operationString.match(/time_now\.(\w+)\(([^)]*)\)/);
    if (matchTimeNow) {
        const action = matchTimeNow[1];
        let param = matchTimeNow[2].trim();

        if (action === 'set_hhmm') {
            param = param.replace(/['"]/g, '');
        }

        return { action, value: param };
    }

    return {};
};

            const startOpData = parseOperation(tsData.start);
            const endOpData = parseOperation(tsData.end);

            startOpContainer.appendChild(createOperationForm(availableOperations, 'start', startOpData));
            endOpContainer.appendChild(createOperationForm(availableOperations, 'end', endOpData));

            // Expires Operation
            const expiresToggle = editTSModal.querySelector('#cso-ts-expires-toggle');
            const expiresContainer = editTSModal.querySelector('.cso-expires-container');
            const expiresOpContainer = editTSModal.querySelector('#cso-ts-expires-operation-container');

            if (expiresToggle.checked) {
                // Make sure the container is visible
                expiresContainer.style.display = 'block';

                // Parse existing expires operation
                const expiresOpData = parseOperation(tsData.expires);
                expiresOpContainer.appendChild(createOperationForm(availableOperations, 'expires', expiresOpData));
            }

            expiresToggle.addEventListener('change', function() {
                if(this.checked) {
                    expiresContainer.style.display = 'block';
                    expiresOpContainer.appendChild(createOperationForm(availableOperations, 'expires'));
                } else {
                    expiresContainer.style.display = 'none';
                    expiresOpContainer.innerHTML = '';
                }
                // Adjust bottom margin based on toggle
                adjustBottomMargin(editTSModal, 'expires');
            });

            // Filter Rules Toggle
            const filterRulesToggle = editTSModal.querySelector('#cso-ts-filter-rules-toggle');
            const filterRulesContainer = editTSModal.querySelector('.cso-filter-rules-container');

            if (filterRulesToggle.checked) {
                filterRulesContainer.style.display = 'block';
            }

            filterRulesToggle.addEventListener('change', function() {
                if(this.checked) {
                    filterRulesContainer.style.display = 'block';
                } else {
                    filterRulesContainer.style.display = 'none';
                }
                // Adjust bottom margin based on toggle
                adjustBottomMargin(editTSModal, 'filter-rules');
            });

            // Save Time Slot
            editTSModal.querySelector('#cso-save-ts-btn').addEventListener('click', () => {
                updateTimeSlot(editTSModal, tsName, tbody, timeSlotsArray, editTSModalOverlay);
            });
        };

        /* ------------------- Render Time Slots Table ------------------- */

        const renderTimeSlotsTable = (tbody, timeSlotsArray) => {
            tbody.innerHTML = '';
            timeSlotsArray.forEach(tsData => {
                addTimeSlotRow(tsData, tbody, timeSlotsArray);
            });
        };

        /* ------------------- Update Time Slot ------------------- */

        const updateTimeSlot = (editTSModal, tsName, tbody, timeSlotsArray, editTSModalOverlay) => {

            // Fetch the latest tsData
            const tsData = timeSlotsArray.find(ts => ts.name === tsName);
            if (!tsData) {
                showNotification('Time slot not found.', 'danger');
                console.error(`[CSO Builder] Time slot not found: ${tsName}`);
                closeModal(editTSModalOverlay);
                return;
            }

            // Name is not editable
            const name = tsData.name;

            // Collect operations
            const operations = {};

const updateProcessOperation = (container, target) => {
    const opSelect = container.querySelector('.operation-select');
    if (!opSelect) {
        console.warn(`[CSO Builder] No .operation-select found for target: ${target}`);
        return true; // No operation to process for this target
    }

    if (!opSelect.parentElement) {
        console.warn(`[CSO Builder] .operation-select has no parentElement for target: ${target}`);
        return true;
    }

    const opDiv = opSelect.parentElement.parentElement;
    if (!opDiv) {
        console.warn(`[CSO Builder] .operation-select's parentElement has no parentElement for target: ${target}`);
        return true;
    }

    const action = opDiv.querySelector('.operation-select').value;
    const param = opDiv.querySelector('.operation-param').value.trim();

    if (action) {
        if (['add_business_days', 'add_days', 'add_hours', 'add_minutes'].includes(action)) {
            if (param === '' || isNaN(param)) {
                showNotification(`Please enter a valid number for ${action}.`, 'danger');
                console.warn(`[CSO Builder] Invalid parameter for ${action}: "${param}"`);
                return null;
            }
            if (target === 'expires') {
                // Use time_now instead of pickup_time.expires
                operations[target] = `time_now.${action}(${param})`;
            } else {
                if (action === 'add_business_days') {
                    operations[target] = `pickup_time.${target}.${action}(${param}, address_from.country)`;
                } else {
                    operations[target] = `pickup_time.${target}.${action}(${param})`;
                }
            }
        } else if (action === 'set_hhmm') {
            const timePattern = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
            if (!timePattern.test(param)) {
                showNotification(`Please enter a valid time in HH:MM format for set_hhmm.`, 'danger');
                console.warn(`[CSO Builder] Invalid time format for set_hhmm: "${param}"`);
                return null;
            }
            if (target === 'expires') {
                operations[target] = `time_now.set_hhmm('${param}')`;
            } else {
                operations[target] = `pickup_time.${target}.set_hhmm('${param}')`;
            }
        }
    }

    return true;
};

const startResult = updateProcessOperation(editTSModal.querySelector('#cso-ts-start-operation-container'), 'start');
if(startResult === null) return;

const endResult = updateProcessOperation(editTSModal.querySelector('#cso-ts-end-operation-container'), 'end');
if(endResult === null) return;

const expiresResult = updateProcessOperation(editTSModal.querySelector('#cso-ts-expires-operation-container'), 'expires');
if(expiresResult === null) return;

            if(!operations.start || !operations.end) {
                showNotification('Please add operations for both start and end.', 'danger');
                console.warn('[CSO Builder] Missing start or end operations.');
                return;
            }

            const expires = operations.expires ? operations.expires : null;

            const addFilterRules = editTSModal.querySelector('#cso-ts-filter-rules-toggle').checked;
            let filter_rules = [];
            if(addFilterRules) {
                const regionInput = editTSModal.querySelector('#cso-ts-region-ids').value.trim();
                if(!regionInput) {
                    showNotification('Please enter at least one region ID or leave the filter rules unchecked.', 'danger');
                    console.warn('[CSO Builder] Filter rules enabled but no region IDs provided.');
                    return;
                }
                const regions = regionInput.split(/[,;]+/).map(r => r.trim()).filter(r => r);
                if(regions.length === 0) {
                    showNotification('Please enter valid region IDs separated by commas or semicolons.', 'danger');
                    console.warn('[CSO Builder] Invalid region IDs provided.');
                    return;
                }
                filter_rules.push({
                    "condition": `region.id in [${regions.map(r => `'${r}'`).join(', ')}]`
                });
            }

            // After collecting and validating data, create updatedTSData
            const updatedTSData = {
                name: tsName, // Name is not editable
                start: operations.start,
                end: operations.end,
                // Add expires and filter_rules if present
            };
            if(expires) {
                updatedTSData.expires = expires;
            }
            if(filter_rules.length > 0) {
                updatedTSData.filter_rules = filter_rules;
            }


            // Update the timeSlotsArray
            const index = timeSlotsArray.findIndex(ts => ts.name === tsName);
            if (index !== -1) {
                timeSlotsArray[index] = updatedTSData;
            }

            // Re-render the time slots table
            renderTimeSlotsTable(tbody, timeSlotsArray);

            showNotification('Time slot updated successfully.');
            closeModal(editTSModalOverlay);
        };

        /* ------------------- Update Method ------------------- */

        const updateMethod = (editModal, tr, methodData, editModalOverlay, timeSlots) => {
            // Collect shipping method data
            const carrier_name = editModal.querySelector('#cso-carrier-name').value.trim();
            const delivery_type = editModal.querySelector('#cso-delivery-type').value;
            const product = editModal.querySelector('#cso-product-name').value.trim();

            // Fetch Configuration Data
            let fetch_shipping_method = null;
            let fetch_delivery_type = null;
            let fetch_pickup_location_types = [];

            const fetchContainer = editModal.querySelector('.cso-fetch-container');
            if (fetchContainer.classList.contains('active')) {
                fetch_shipping_method = editModal.querySelector('#cso-fetch-shipping-method').value.trim();
                fetch_delivery_type = editModal.querySelector('#cso-fetch-delivery-type').value;
                fetch_pickup_location_types = Array.from(editModal.querySelector('#cso-fetch-pickup-location-types').selectedOptions).map(option => option.value);
            }

            // Meta Information Data
            const metaFields = editModal.querySelectorAll('.cso-meta-field');
            const meta = {};
            metaFields.forEach(field => {
                const key = field.querySelector('.cso-meta-key').value.trim();
                const value = field.querySelector('.cso-meta-value').value.trim();
                if(key) {
                    meta[key] = value;
                }
            });

            if(!delivery_type) {
                showNotification('Please fill in all required fields.', 'danger');
                console.warn('[CSO Builder] Missing required fields.');
                return;
            }

            // Construct updated method data
            const updatedMethodData = {
                shipping_method: methodData.shipping_method, // Not editable
                carrier_name,
                delivery_type,
                product,
                fetch: fetch_shipping_method ? {
                    shipping_method: fetch_shipping_method,
                    delivery_type: fetch_delivery_type,
                    pickup_location_types: fetch_pickup_location_types.length ? fetch_pickup_location_types : []
                } : undefined,
                meta: Object.keys(meta).length > 0 ? meta : undefined,
                time_slots: Array.isArray(timeSlots) ? [...timeSlots] : []
            };


            // Update the table row and config
            const carrierNameCell = tr.querySelector('.cso-carrier-name');
            const deliveryTypeCell = tr.querySelector('.cso-delivery-type');
            const productCell = tr.querySelector('.cso-product');
            const fetchConfigCell = tr.querySelector('.cso-fetch-config');
            const metaInfoCell = tr.querySelector('.cso-meta-info');
            const timeSlotsCell = tr.querySelector('.cso-time-slots');

            // Update cells
            if (carrierNameCell) carrierNameCell.textContent = updatedMethodData.carrier_name || '';
            if (deliveryTypeCell) deliveryTypeCell.textContent = updatedMethodData.delivery_type || '';
            if (productCell) productCell.textContent = updatedMethodData.product || '';

            if(fetchConfigCell) {
                fetchConfigCell.innerHTML = updatedMethodData.fetch
                    ? `<ul>
                        <li>Shipping Method: ${updatedMethodData.fetch.shipping_method || ''}</li>
                        <li>Delivery Type: ${updatedMethodData.fetch.delivery_type || ''}</li>
                        <li>Pickup Location Types: ${Array.isArray(updatedMethodData.fetch.pickup_location_types) ? updatedMethodData.fetch.pickup_location_types.join(', ') : ''}</li>
                      </ul>`
                    : '';
            }

            if(metaInfoCell) {
                metaInfoCell.innerHTML = updatedMethodData.meta && Object.keys(updatedMethodData.meta).length > 0
                    ? `<ul>
                        ${Object.entries(updatedMethodData.meta).map(([key, value]) => `<li>${key}: ${value}</li>`).join('')}
                      </ul>`
                    : '';
            }

            if(timeSlotsCell) {
                timeSlotsCell.innerHTML = updatedMethodData.time_slots.length > 0
                    ? `<ul>${updatedMethodData.time_slots.map(ts => `<li>${ts.name}</li>`).join('')}</ul>`
                    : '';
            }

    // Update the config
    const methodIndex = window.csoConfig.methods.findIndex(m => m.shipping_method === methodData.shipping_method);
    if(methodIndex !== -1) {
        window.csoConfig.methods[methodIndex] = updatedMethodData;
    }

    showNotification('Shipping method updated successfully.');
    closeModal(editModalOverlay);
};

        /* ------------------- Export JSON Function ------------------- */

        const exportJSON = () => {
            const finalJSON = removeEmpty(window.csoConfig); // Remove empty arrays/objects
            const jsonString = JSON.stringify(finalJSON, null, 4); // Indented for readability

            const jsonModalOverlay = createModalOverlay('cso-json-modal-overlay');
            const jsonModal = createJSONExportModal(jsonString);
            jsonModalOverlay.appendChild(jsonModal);
            openModal(jsonModalOverlay);

            // Add "X" close button to the Export JSON modal
            addCloseButton(jsonModal, 'cso-json-modal-overlay');

            // Close JSON Modal
            jsonModal.querySelector('#cso-json-close-btn').addEventListener('click', () => {
                closeModal(jsonModalOverlay);
            });

            // Copy to Clipboard
            jsonModal.querySelector('#cso-copy-json-btn').addEventListener('click', () => {
                const textarea = jsonModal.querySelector('#cso-json-textarea');
                textarea.select();
                document.execCommand('copy');
                showNotification('JSON copied to clipboard!');
            });

            // Download JSON
            jsonModal.querySelector('#cso-download-json-btn').addEventListener('click', () => {
                const blob = new Blob([jsonString], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'custom_shipping_methods.json';
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
                // Close Button
                createElement('span', { id: 'cso-json-close-btn', style: `
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    font-size: 24px;
                    font-weight: bold;
                    color: #aaa;
                    cursor: pointer;
                ` }, '×'),
                // Title
                createElement('h3', { innerHTML: `<i class="fas fa-file-export"></i> Exported JSON` }),
                // Textarea
                createElement('textarea', {
                    id: 'cso-json-textarea',
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
                // Buttons
                createElement('div', { style: 'margin-top: 10px; display: flex; gap: 10px;' },
                    createElement('button', { className: 'cso-button secondary', id: 'cso-copy-json-btn', innerHTML: `<i class="fas fa-copy"></i> Copy to Clipboard` }),
                    createElement('button', { className: 'cso-button', id: 'cso-download-json-btn', innerHTML: `<i class="fas fa-download"></i> Download JSON` })
                )
            );

            return modalContent;
        };

        /* ------------------- Publish Configuration Function ------------------- */

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


            // Exclude custom_shipping_methods from fullData
            const { custom_shipping_methods, ...restData } = window.fullData || {};

            // Prepare the payload by spreading restData and adding custom_shipping_methods under site
            const payload = {
                ...restData,
                site: {
                    ...(restData.site || {}),
                    custom_shipping_methods: window.csoConfig,
                    version: window.csoVersion || '1' // Ensure version is included
                }
            };

            // Remove the version from custom_shipping_methods if it exists
            if ('version' in payload.site.custom_shipping_methods) {
                delete payload.site.custom_shipping_methods.version;
            }

            // Log the payload for debugging

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
                    // Attempt to parse the error response
                    return response.json().then(errData => {
                        const errorMessage = errData.error || 'Unknown error';
                        console.error('API request failed with status:', response.status, 'Error:', errorMessage);
                        showNotification('API request failed. ' + errorMessage, 'danger');
                        return Promise.reject('API request failed');
                    }).catch(() => {
                        // If response is not JSON
                        console.error('API request failed with status:', response.status);
                        showNotification('API request failed. Status: ' + response.status, 'danger');
                        return Promise.reject('API request failed');
                    });
                }
                return response.json();
            })
            .then(data => {
                showNotification('Configuration published successfully.');
                // Update the version in window.csoVersion based on response if available
                if (data.site && data.site.version) {
                    window.csoVersion = data.site.version;
                }
            })
            .catch(error => {
                console.error('Failed to publish configuration:', error);
                showNotification('Failed to publish configuration.', 'danger');
            });
        };

    };

    /* ------------------- Initialize Keyboard Shortcut ------------------- */

    // Optionally, you can bind the openCSOBuilder function to a keyboard shortcut or a button
    // For example, pressing Ctrl+Shift+C opens the builder
    document.addEventListener('keydown', function(e) {
        if(e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
            window.openCSOBuilder();
        }
    });

    /* ------------------- Initialize Font Awesome and CSS ------------------- */

    injectFontAwesome();
    injectCSS();

    /* ------------------- Open Builder Modal via Function ------------------- */

    const openBuilderModal = () => {
        const builderModalOverlay = document.getElementById('cso-builder-modal-overlay');
        if(builderModalOverlay) {
            closeModal(builderModalOverlay); // Close existing modal
        }
        initializeBuilder(); // Re-initialize to fetch latest data
    };
    /* ------------------- Event Listener to Trigger the Editor ------------------- */

    // Listen for the custom event dispatched by the primary script or bookmarklet
    window.addEventListener('openCSOBuilder', function() {
        openBuilderModal();
    }, false);

    // Expose the openBuilderModal function to the global scope if needed
    window.openCSOBuilder = openBuilderModal;
})();
