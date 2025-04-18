// ==UserScript==
// @name         Number Series Manager
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Display and manage shipping methods with number series, enhanced with UI/UX features and API integration.
// @author       julpif
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Number%20Series%20Manager.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Number%20Series%20Manager.user.js
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
            /* Modal Overlay */
            #nsm-modal-overlay {
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

            /* Modal Content */
            #nsm-modal {
                background: #ffffff; /* White background for a clean look */
                width: 95%;
                max-width: 1200px; /* Increased max-width for a bigger modal */
                max-height: 90%;
                border-radius: 8px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                box-shadow: 0 8px 20px rgba(0,0,0,0.3);
                position: relative;
                animation: slideIn 0.3s;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #333333;
            }

            /* Header */
            #nsm-header {
                padding: 16px 24px;
                background: #000000; /* Black for header */
                color: #333333;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #dddddd;
            }

            #nsm-header h2 {
                margin: 0;
                font-size: 20px;
                display: flex;
                align-items: center;
                gap: 8px;
                color: #ffffff;
                font-weight: normal; /* Reduced boldness */
            }

            #nsm-close-btn {
                background: transparent;
                border: none;
                color: #333333;
                cursor: pointer;
                font-size: 24px;
                transition: transform 0.2s;
            }

            #nsm-close-btn:hover {
                transform: rotate(90deg);
            }

            /* Content */
            #nsm-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px 24px;
                box-sizing: border-box;
                position: relative;
                display: flex;
                flex-direction: column;
                background: #ffffff;
            }

            /* Spinner Container */
            #nsm-spinner-container {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                display: none; /* Initially hidden */
                z-index: 1001;
            }

            /* Spinner Styles */
            .spinner {
                border: 6px solid rgba(0, 0, 0, 0.1);
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border-left-color: #0000ff; /* Blue */
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* Table Styles */
            .nsm-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 24px;
                font-size: 14px; /* Reduced font size for compactness */
                background: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                table-layout: fixed; /* Fixed layout to prevent shifting */
            }

            .nsm-table th, .nsm-table td {
                border: 1px solid #dddddd;
                padding: 8px 12px; /* Reduced padding for compactness */
                text-align: left;
                word-wrap: break-word;
                white-space: normal;
                vertical-align: middle;
                box-sizing: border-box; /* Ensure padding and borders are included in width */
            }

            .nsm-table th {
                background-color: #f5f5f5;
                position: sticky;
                top: 0;
                z-index: 2;
                color: #333333;
                font-weight: normal; /* Reduced boldness */
                /* Set specific widths for each column to maintain layout */
                width: 14%; /* Adjust percentages as needed */
            }

            /* Adjusting column widths */
            .nsm-table th:nth-child(1), .nsm-table td:nth-child(1) { width: 14%; } /* Shipping Method */
            .nsm-table th:nth-child(2), .nsm-table td:nth-child(2) { width: 14%; } /* Name */
            .nsm-table th:nth-child(3), .nsm-table td:nth-child(3) { width: 10%; } /* Start */
            .nsm-table th:nth-child(4), .nsm-table td:nth-child(4) { width: 10%; } /* End */
            .nsm-table th:nth-child(5), .nsm-table td:nth-child(5) { width: 10%; } /* Current */
            .nsm-table th:nth-child(6), .nsm-table td:nth-child(6) { width: 10%; } /* Iteration */
            .nsm-table th:nth-child(7), .nsm-table td:nth-child(7) { width: 10%; } /* Prefix */
            .nsm-table th:nth-child(8), .nsm-table td:nth-child(8) { width: 22%; } /* Actions */

            .nsm-table tbody tr:hover {
                background-color: #f9f9f9;
            }

            /* Action Buttons */
            .nsm-button {
                padding: 6px 12px; /* Reduced padding */
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px; /* Reduced font size */
                transition: background-color 0.3s, transform 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 4px; /* Reduced gap */
                margin-right: 3px; /* Reduced margin */
                box-sizing: border-box;
            }

            .nsm-button.save {
                background: #28a745; /* Green for Save */
                color: #ffffff;
            }

            .nsm-button.save:hover {
                background: #218838;
            }

            .nsm-button.save:active {
                transform: scale(0.98);
            }

            .nsm-button.cancel {
                background: #dc3545; /* Red for Cancel */
                color: #ffffff;
            }

            .nsm-button.cancel:hover {
                background: #c82333;
            }

            .nsm-button.cancel:active {
                transform: scale(0.98);
            }

            .nsm-button.delete {
                background: #dc3545; /* Red for Delete */
                color: #ffffff;
            }

            .nsm-button.delete:hover {
                background: #c82333;
            }

            .nsm-button.delete:active {
                transform: scale(0.98);
            }

            /* Add Number Series Button */
            #nsm-add-number-series-btn {
                padding: 10px 20px; /* Reduced padding */
                background: #000000; /* Black color */
                color: #ffffff;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px; /* Reduced font size */
                transition: background-color 0.3s, transform 0.2s, box-shadow 0.3s;
                margin-bottom: 16px; /* Reduced margin */
                align-self: flex-start;
                display: flex;
                align-items: center;
                gap: 6px; /* Reduced gap */
                box-sizing: border-box;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            #nsm-add-number-series-btn:hover {
                background: #0056b3;
                box-shadow: 0 6px 16px rgba(0,0,0,0.3);
            }

            #nsm-add-number-series-btn:active {
                background: #004085;
                transform: scale(0.98);
                box-shadow: 0 3px 10px rgba(0,0,0,0.1);
            }

            /* Notification */
            #nsm-notification {
                position: fixed;
                top: 24px;
                right: 24px;
                background: #28a745; /* Green for success */
                color: #ffffff;
                padding: 10px 16px; /* Reduced padding */
                border-radius: 6px;
                display: none;
                z-index: 10001;
                box-shadow: 0 6px 18px rgba(0,0,0,0.3);
                font-size: 14px;
                animation: fadeIn 0.5s;
            }

            /* No Results Box */
            #nsm-no-results {
                text-align: center;
                padding: 16px;
                font-size: 16px;
                color: #999999;
            }

            /* Keyframes */
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
                #nsm-modal {
                    width: 95%;
                    max-height: 90%;
                }
            }

            @media (max-width: 768px) {
                #nsm-header h2 {
                    font-size: 18px;
                }

                .nsm-table th, .nsm-table td {
                    padding: 6px 10px;
                    font-size: 12px;
                }

                .nsm-button.save, .nsm-button.cancel, .nsm-button.delete {
                    padding: 4px 8px;
                    font-size: 10px;
                }

                #nsm-add-number-series-btn {
                    padding: 8px 16px;
                    font-size: 12px;
                }
            }

            /* Ensure consistent input sizes */
            .nsm-table input[type="text"],
            .nsm-table input[type="number"],
            .nsm-table select {
                width: 100%;
                height: 28px; /* Fixed height */
                box-sizing: border-box; /* Include padding and border in width and height */
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #cccccc;
                background: #ffffff;
                color: #333333;
                font-size: 12px;
            }

            /* Prevent row height changes */
            .nsm-table tr {
                height: 40px; /* Fixed row height */
            }
        `;
        injectStyles(styles);
    };

    /* ------------------- Notification Function ------------------- */

    // Create Notification Element
    const notification = createElement('div', { id: 'nsm-notification' });
    document.body.appendChild(notification);

    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.style.background = type === 'success' ? '#28a745' :
                                       type === 'danger' ? '#dc3545' :
                                       type === 'warning' ? '#ffc107' :
                                       '#17a2b8'; // Info color
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    /* ------------------- Modal Management ------------------- */

    // Function to create modal overlay
    const createModalOverlay = (id) => {
        const existingOverlay = document.getElementById(id);
        if (existingOverlay) {
            existingOverlay.parentNode.removeChild(existingOverlay);
        }
        const overlay = createElement('div', { id, className: 'modal-overlay' });

        document.body.appendChild(overlay);
        return overlay;
    };

    // Function to open a modal
    const openModal = (overlay) => {
        overlay.style.display = 'flex';
    };

    // Function to close a modal
    const closeModal = (overlay) => {
        if (overlay && overlay.parentNode) {
            overlay.style.display = 'none';
        }
    };

    /* ------------------- API Error Handler ------------------- */

    const handleApiError = (errorText, shippingMethod) => {
        const suppressedError = "number series not found: failed to fetch number series: failed to execute query: sql: no rows in result set";
        if (errorText.includes(suppressedError)) {
            // Suppress this specific error
            return { excluded: shippingMethod };
        } else {
            // Suppress console.error for API errors
            showNotification(`API Error: ${errorText}`, 'danger');
            // Optionally, you can log a less intrusive message or remove this line entirely
            // console.error(`API Error for "${shippingMethod}": ${errorText}`);
            return null;
        }
    };

    /* ------------------- Fetch Shipping Methods ------------------- */

    // Function to fetch shipping methods from site.get
    const fetchShippingMethods = async () => {
        const siteId = window.unsafeWindow?.siteId || window.siteId;
        const authToken = window.unsafeWindow?.authToken || window.authToken;

        if (!siteId || !authToken) {
            showNotification('Missing siteId or authToken.', 'danger');
            // console.error('Missing siteId or authToken.'); // Suppressed
            return { allMethods: [], excludedMethods: [] };
        }

        const pageUrl = window.location.href;
        const baseUrl = pageUrl.startsWith('https://mad-stage.ingrid.com/')
            ? 'https://api-stage.ingrid.com'
            : 'https://api.ingrid.com';

        const endpoint = `${baseUrl}/v1/config/site.get?siteId=${siteId}`;

        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                showNotification(`Failed to fetch site data: ${response.status} - ${errorText}`, 'danger');
                // console.error(`Failed to fetch site data: ${response.status} - ${errorText}`); // Suppressed
                return { allMethods: [], excludedMethods: [] };
            }

            const data = await response.json();

            const regions = data.site?.regions || [];
            let shippingMethods = [];

            regions.forEach(region => {
                const carrierProducts = region.carrier_products || [];
                carrierProducts.forEach(cp => {
                    if (cp.shipping_method) {
                        shippingMethods.push(cp.shipping_method);
                    }
                });
            });

            // Remove duplicates
            shippingMethods = [...new Set(shippingMethods)];

            // console.log('Fetched Shipping Methods:', shippingMethods); // Optional: Suppress if not needed

            return { allMethods: shippingMethods, excludedMethods: [] };
        } catch (error) {
            showNotification('Network error while fetching site data.', 'danger');
            // console.error('Network error while fetching site data:', error); // Suppressed
            return { allMethods: [], excludedMethods: [] };
        }
    };

    // Function to fetch data for a single shipping method
    const fetchShippingMethodData = async (shippingMethod) => {
        const siteId = window.unsafeWindow?.siteId || window.siteId;
        const authToken = window.unsafeWindow?.authToken || window.authToken;

        if (!siteId || !authToken) {
            showNotification('Missing siteId or authToken.', 'danger');
            // console.error('Missing siteId or authToken.'); // Suppressed
            return null;
        }

        const pageUrl = window.location.href;
        const baseUrl = pageUrl.startsWith('https://mad-stage.ingrid.com/')
            ? 'https://api-stage.ingrid.com'
            : 'https://api.ingrid.com';

        const endpoint = `${baseUrl}/v1/numberseries/series.get?site_id=${siteId}&name=${encodeURIComponent(shippingMethod)}`;

        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                return handleApiError(errorText, shippingMethod);
            }

            const data = await response.json();

            // Debugging: Log the fetched data
            // console.log(`Fetched data for "${shippingMethod}":`, data); // Optional: Suppress if not needed

            // Assuming the API response provides data directly without a 'series' wrapper
            const series = data;

            // Define the fields to extract
            const fields = ['name', 'start', 'end', 'current', 'iteration', 'prefix'];

            // Create an object with available data, leaving fields blank if data is missing
            const shippingData = {};
            fields.forEach(field => {
                shippingData[field] = series[field] !== undefined && series[field] !== null && series[field] !== '' ? series[field] : '';
            });

            return {
                shipping_method: shippingMethod,
                ...shippingData
            };
        } catch (error) {
            showNotification(`Network error while fetching data for "${shippingMethod}".`, 'danger');
            // console.error(`Network error while fetching data for "${shippingMethod}":`, error); // Suppressed
            return null;
        }
    };

    /* ------------------- Render Table ------------------- */

    const renderTable = (data, excludedMethods) => {
        const overlay = createModalOverlay('nsm-modal-overlay');

        // Create Modal Content
        const modal = createElement('div', { id: 'nsm-modal' },
            // Header
            createElement('div', { id: 'nsm-header' },
                createElement('h2', { innerHTML: `<i class="fas fa-truck"></i> Number Series` }),
                createElement('button', { id: 'nsm-close-btn', innerHTML: `<i class="fas fa-times"></i>` })
            ),
            // Content
            createElement('div', { id: 'nsm-content' },
                // Add Number Series Button
                createElement('button', {
                    id: 'nsm-add-number-series-btn',
                    innerHTML: `<i class="fas fa-plus"></i> Add Number Series`
                }),
                // Spinner Container
                createElement('div', { id: 'nsm-spinner-container' },
                    createElement('div', { className: 'spinner' })
                ),
                // Table and No Results Message
                createElement('div', { className: 'nsm-table-container', style: 'width: 100%;' },
                    createElement('table', { className: 'nsm-table' },
                        createElement('thead', {},
                            createElement('tr', {},
                                createElement('th', {}, 'Shipping Method'),
                                createElement('th', {}, 'Name'),
                                createElement('th', {}, 'Start'),
                                createElement('th', {}, 'End'),
                                createElement('th', {}, 'Current'),
                                createElement('th', {}, 'Iteration'),
                                createElement('th', {}, 'Prefix'),
                                createElement('th', {}, 'Actions') // Extra Actions Column
                            )
                        ),
                        createElement('tbody', {})
                    ),
                    // No Results Message
                    createElement('div', { id: 'nsm-no-results', style: 'display: none;' }, 'No number series found.')
                )
            )
        );

        overlay.appendChild(modal);
        openModal(overlay);

        const spinnerContainer = modal.querySelector('#nsm-spinner-container');
        const content = modal.querySelector('#nsm-content');
        const table = content.querySelector('table.nsm-table');
        const tbody = table.querySelector('tbody');
        const noResultsDiv = content.querySelector('#nsm-no-results');

        // Event Listener for Close Button
        const closeButton = modal.querySelector('#nsm-close-btn');
        closeButton.addEventListener('click', () => {
            closeModal(overlay);
        });

        // Event Listener for clicking outside the modal to close it
        overlay.addEventListener('click', (event) => {
            // Only close if the click is directly on the overlay, not inside the modal
            if (event.target === overlay) {
                closeModal(overlay);
            }
        });

        // Prevent click events inside the modal from propagating to the overlay
        modal.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        // Event Listener for Add Number Series Button
        const addNumberSeriesBtn = modal.querySelector('#nsm-add-number-series-btn');
        addNumberSeriesBtn.addEventListener('click', () => {
            addNumberSeriesRow(modal, excludedMethods);
        });

        if (data.length > 0) {
            spinnerContainer.style.display = 'flex'; // Show spinner

            data.forEach(item => {
                const tr = createElement('tr', {},
                    createElement('td', {}, item.shipping_method),
                    createElement('td', {}, item.name),
                    createElement('td', {}, item.start),
                    createElement('td', {}, item.end),
                    createElement('td', {}, item.current),
                    createElement('td', {}, item.iteration),
                    createElement('td', {}, item.prefix),
                    // Actions Column with Delete Button
                    createElement('td', {},
                        createElement('button', {
                            className: 'nsm-button delete',
                            innerHTML: `<i class="fas fa-trash-alt"></i> Delete`,
                            // Changed to use addEventListener instead of inline onclick
                            // to ensure proper binding and avoid issues
                            // Removed the console.log for suppressed errors
                        })
                    )
                );

                // Attach event listener to the Delete button
                const deleteButton = tr.querySelector('.nsm-button.delete');
                deleteButton.addEventListener('click', () => {
                    deleteNumberSeries(item);
                });

                tbody.appendChild(tr);
            });

            // Hide spinner after table is populated
            spinnerContainer.style.display = 'none';
            noResultsDiv.style.display = 'none';
        } else {
            // No number series found
            noResultsDiv.style.display = 'block';
        }
    };

    /* ------------------- Add Number Series Row Function ------------------- */

    const addNumberSeriesRow = (modal, excludedMethods) => {
        const content = modal.querySelector('#nsm-content');
        const table = content.querySelector('table.nsm-table');
        if (!table) {
            showNotification('No table available to add number series.', 'danger');
            return;
        }
        const tbody = table.querySelector('tbody');
        const noResultsDiv = content.querySelector('#nsm-no-results');

        // Create a new row with enhanced design
        const tr = createElement('tr', { className: 'nsm-new-row' },
            // Shipping Method Dropdown
            createElement('td', {},
                createElement('select', { className: 'nsm-shipping-method-dropdown' },
                    createElement('option', { value: '', disabled: true, selected: true }, 'Select Shipping Method'),
                    ...excludedMethods.map(method => createElement('option', { value: method }, method))
                )
            ),
            // Name Field (auto-filled, non-editable)
            createElement('td', {},
                createElement('input', { type: 'text', className: 'nsm-name-field', placeholder: 'Select shipping method', disabled: true })
            ),
            // Start Field
            createElement('td', {},
                createElement('input', { type: 'number', className: 'nsm-start-field', min: '0', placeholder: 'Start' })
            ),
            // End Field
            createElement('td', {},
                createElement('input', { type: 'number', className: 'nsm-end-field', min: '0', placeholder: 'End' })
            ),
            // Current Field
            createElement('td', {},
                createElement('input', { type: 'number', className: 'nsm-current-field', min: '0', placeholder: 'Current' })
            ),
            // Iteration Field
            createElement('td', {},
                createElement('input', { type: 'number', className: 'nsm-iteration-field', min: '0', placeholder: 'Iteration' })
            ),
            // Prefix Field
            createElement('td', {},
                createElement('input', { type: 'text', className: 'nsm-prefix-field', placeholder: 'Prefix' })
            ),
            // Actions Column with Save and Cancel Buttons
            createElement('td', {},
                createElement('button', {
                    className: 'nsm-button save',
                    innerHTML: `<i class="fas fa-save"></i> Save`,
                }),
                createElement('button', {
                    className: 'nsm-button cancel',
                    innerHTML: `<i class="fas fa-times"></i> Cancel`,
                })
            )
        );

        tbody.prepend(tr); // Add the new row at the top
        noResultsDiv.style.display = 'none'; // Hide no results message

        // Event Listener for Shipping Method Dropdown to auto-fill Name field
        const shippingMethodDropdown = tr.querySelector('.nsm-shipping-method-dropdown');
        const nameField = tr.querySelector('.nsm-name-field');
        shippingMethodDropdown.addEventListener('change', (event) => {
            const selectedMethod = event.target.value;
            nameField.value = selectedMethod;
        });

        // Event Listener for Cancel Button to remove the row
        const cancelButton = tr.querySelector('.nsm-button.cancel');
        cancelButton.addEventListener('click', () => {
            tr.remove();

            // If tbody is empty after removal, show no results message
            if (tbody.children.length === 0) {
                content.querySelector('#nsm-no-results').style.display = 'block';
            }
        });

        // Event Listener for Save Button to validate and send API request
        const saveButton = tr.querySelector('.nsm-button.save');
        saveButton.addEventListener('click', async () => {
            const shippingMethod = shippingMethodDropdown.value;
            const name = nameField.value;
            const start = tr.querySelector('.nsm-start-field').value.trim();
            const end = tr.querySelector('.nsm-end-field').value.trim();
            const current = tr.querySelector('.nsm-current-field').value.trim();
            const iteration = tr.querySelector('.nsm-iteration-field').value.trim();
            const prefix = tr.querySelector('.nsm-prefix-field').value.trim();

            // Validation
            if (!shippingMethod) {
                showNotification('Please select a shipping method.', 'danger');
                return;
            }
            if (start === '' || end === '' || current === '' || iteration === '') {
                showNotification('Please fill in all numeric fields.', 'danger');
                return;
            }
            if (!/^\d+$/.test(start) || !/^\d+$/.test(end) || !/^\d+$/.test(current) || !/^\d+$/.test(iteration)) {
                showNotification('Start, End, Current, and Iteration fields must be valid numbers.', 'danger');
                return;
            }

            // Prepare API endpoint
            const pageUrl = window.location.href;
            const baseUrl = pageUrl.startsWith('https://mad-stage.ingrid.com/')
                ? 'https://api-stage.ingrid.com'
                : 'https://api.ingrid.com';
            const apiEndpoint = `${baseUrl}/v1/numberseries/series.init`;

            const siteId = window.unsafeWindow?.siteId || window.siteId;
            const authToken = window.unsafeWindow?.authToken || window.authToken;

            if (!siteId || !authToken) {
                showNotification('Missing siteId or authToken.', 'danger');
                // console.error('Missing siteId or authToken.'); // Suppressed
                return;
            }

            const payload = {
                "site_id": siteId,
                "name": shippingMethod,
                "start": start,
                "end": end,
                "current": current,
                "iteration": iteration,
                "prefix": prefix
            };

            try {
                saveButton.disabled = true; // Disable button to prevent multiple clicks
                saveButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;

                const response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: {
                        "Authorization": `Bearer ${authToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                // console.log(`POST response status: ${response.status}`); // Optional: Suppress if not needed

                if (!response.ok) {
                    const errorText = await response.text();
                    showNotification(`Failed to initialize number series: ${response.status} - ${errorText}`, 'danger');
                    // console.error(`Failed to initialize number series: ${response.status} - ${errorText}`); // Suppressed
                    saveButton.disabled = false;
                    saveButton.innerHTML = `<i class="fas fa-save"></i> Save`;
                    return;
                }

                const data = await response.json();
                // console.log('Number series initialized:', data); // Optional: Suppress if not needed
                showNotification('Number series initialized successfully.', 'success');

                // Refresh the table to include the new number series
                await initialize();

            } catch (error) {
                showNotification('Network error while initializing number series.', 'danger');
                // console.error('Network error while initializing number series:', error); // Suppressed
                saveButton.disabled = false;
                saveButton.innerHTML = `<i class="fas fa-save"></i> Save`;
            }
        });
    };

    /* ------------------- Delete Number Series Function ------------------- */

const deleteNumberSeries = async (item) => {
    const siteId = window.unsafeWindow?.siteId || window.siteId;
    const authToken = window.unsafeWindow?.authToken || window.authToken;

    if (!siteId || !authToken) {
        showNotification('Missing siteId or authToken.', 'danger');
        return;
    }

    const pageUrl = window.location.href;
    const baseUrl = pageUrl.startsWith('https://mad-stage.ingrid.com/')
        ? 'https://api-stage.ingrid.com'
        : 'https://api.ingrid.com';

    if (!item.name || !item.iteration) {
        showNotification('Invalid item data. Cannot delete number series.', 'danger');
        return;
    }

    const apiEndpoint = `${baseUrl}/v1/numberseries/series.delete?site_id=${encodeURIComponent(siteId)}&name=${encodeURIComponent(item.name)}&iteration=${encodeURIComponent(item.iteration)}`;

    const confirmation = confirm(`Are you sure you want to delete the number series "${item.name}" with iteration "${item.iteration}"?`);
    if (!confirmation) {
        return;
    }

    showNotification('Deleting number series...', 'info');

    GM_xmlhttpRequest({
        method: "DELETE",
        url: apiEndpoint,
        headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Site-Id": siteId
        },
        onload: function(response) {
            if (response.status >= 200 && response.status < 300) {
                showNotification('Number series deleted successfully.', 'success');
                initialize(); // Refresh the table
            } else {
                showNotification(`Failed to delete number series: ${response.status} - ${response.responseText}`, 'danger');
            }
        },
        onerror: function(error) {
            showNotification('Network error while deleting number series.', 'danger');
        }
    });
};

    /* ------------------- Initialize and Fetch Data ------------------- */

    const initialize = async () => {
        // Show loading notification
        showNotification('Loading shipping methods...', 'info');

        const { allMethods, excludedMethods } = await fetchShippingMethods();

        if (allMethods.length === 0) {
            // Update notification for no shipping methods
            showNotification('No shipping methods found.', 'warning');
            // console.warn('No shipping methods found.'); // Suppressed
            return;
        }

        // Fetch data for all shipping methods
        const fetchPromises = allMethods.map(sm => fetchShippingMethodData(sm));
        const results = await Promise.all(fetchPromises);

        // Filter out any null results due to failed fetches
        const validResults = [];
        const newlyExcludedMethods = [];

        results.forEach(result => {
            if (result && result.excluded) {
                newlyExcludedMethods.push(result.excluded);
            } else if (result) {
                validResults.push(result);
            }
        });

        // Combine existing excludedMethods with newly excludedMethods
        const combinedExcludedMethods = [...excludedMethods, ...newlyExcludedMethods];

        // Hide loading notification
        notification.style.display = 'none';

        // Render the table with fetched data and excluded methods
        renderTable(validResults, combinedExcludedMethods);
    };

    /* ------------------- Initialize Script ------------------- */

    injectFontAwesome();
    injectCSS();

    // Create the modal overlay with the updated design
    const modalOverlay = createModalOverlay('nsm-modal-overlay');
    document.body.appendChild(modalOverlay);

    /* ------------------- Event Listener to Trigger the Modal ------------------- */

    // Listen for the 'numberSeriesManager' event to trigger the script
    window.addEventListener('numberSeriesManager', function() {
        initialize();
    }, false);

})();
