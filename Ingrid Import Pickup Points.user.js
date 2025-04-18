// ==UserScript==
// @name         Ingrid Import Pickup Points
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Import pickup points from XLSX with an enhanced and user-friendly frontend, triggered via a bookmarklet
// @author       julpif
// @match        *://mad-stage.ingrid.com/*
// @match        *://mad.ingrid.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        unsafeWindow
// @connect      api.ingrid.com
// @connect      api-stage.ingrid.com
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Ingrid%20Import%20Pickup%20Points.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Ingrid%20Import%20Pickup%20Points.user.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// ==/UserScript==

(function() {
    'use strict';

    // Unique prefix to avoid naming conflicts
    const PREFIX = 'ingrid-import-';

    // Set to track days where default cutoff times were applied
    const defaultCutoffDays = new Set();

    // Include Font Awesome for Icons
    const fontAwesomeLink = document.createElement('link');
    fontAwesomeLink.rel = 'stylesheet';
    fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesomeLink);

    // Add Enhanced CSS Styles with Customizations
    GM_addStyle(`
        /* Modal Overlay Styles */
        #${PREFIX}modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.6);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
            animation: fadeIn 0.3s;
        }

        /* Modal Container Styles */
        #${PREFIX}modal {
            background-color: #ffffff;
            padding: 25px 30px;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 20px rgba(0,0,0,0.15);
            position: relative;
            animation: slideIn 0.3s ease-out;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        /* Close Button */
        .${PREFIX}close-modal {
            position: absolute;
            top: 10px;
            right: 15px;
            color: #ffffff;
            background-color: #000000;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.3s, color 0.3s;
            z-index: 10001;
        }
        .${PREFIX}close-modal:hover,
        .${PREFIX}close-modal:focus {
            background-color: #333333;
            color: #ff0000;
        }

        /* Modal Header */
        #${PREFIX}modal h2 {
            text-align: center;
            margin-bottom: 20px;
            color: #ffffff;
            background-color: #000000;
            padding: 12px;
            border-radius: 10px 10px 0 0;
            font-size: 1.6em;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Form Styles */
        #${PREFIX}import-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        #${PREFIX}import-form label {
            font-weight: bold;
            margin-bottom: 4px;
            display: block;
        }

        #${PREFIX}import-form input[type="text"],
        #${PREFIX}import-form input[type="file"] {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #cccccc;
            border-radius: 6px;
            font-size: 14px;
        }

        /* Download Template Button */
        #${PREFIX}download-template-button {
            padding: 8px 14px;
            background-color: #000000; /* Black background */
            color: #ffffff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 8px;
        }
        #${PREFIX}download-template-button:hover {
            background-color: #333333;
        }
        #${PREFIX}download-template-button:active {
            background-color: #555555;
        }

        /* Button Container */
        #${PREFIX}button-container {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
                margin-top: 15px;
        }

        /* Import Button */
        #${PREFIX}import-button {
            padding: 8px 16px;
            background-color: #000000; /* Black background */
            color: #ffffff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
            display: flex;
            align-items: center;
            gap: 6px; /* Add spacing between icon and text */
        }
        #${PREFIX}import-button:hover {
            background-color: #333333;
        }
        #${PREFIX}import-button:active {
            background-color: #555555;
        }

        /* Debug Button */
        #${PREFIX}debug-button {
            padding: 8px 16px;
            background-color: #000000; /* Black background */
            color: #ffffff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        #${PREFIX}debug-button:hover {
            background-color: #333333;
        }
        #${PREFIX}debug-button:active {
            background-color: #555555;
        }

        /* Spinner Styles */
        #${PREFIX}spinner {
            border: 6px solid #f3f3f3;
            border-top: 6px solid #000000;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
            display: none;
        }

        /* Validation Error Styles */
        #${PREFIX}error-messages {
            background-color: #ffe6e6;
            border: 1px solid #ff0000;
            color: #ff0000;
            padding: 10px 15px;
            border-radius: 8px;
            max-height: 200px;
            overflow-y: auto;
            position: relative;
        }

        /* Success Message Styles */
        #${PREFIX}success-message {
            background-color: #e6ffe6;
            border: 1px solid #00cc00;
            color: #006600;
            padding: 10px 15px;
            border-radius: 8px;
            margin-top: 10px;
        }

        /* Keyframes for Animations */
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            #${PREFIX}modal {
                padding: 20px 25px;
            }
            #${PREFIX}modal h2 {
                font-size: 1.4em;
            }
            #${PREFIX}import-button,
            #${PREFIX}debug-button,
            #${PREFIX}download-template-button {
                padding: 6px 12px;
                font-size: 12px;
            }
        }
    `);

    // Include Font Awesome Icons in the Modal Header
    const fontAwesomeScript = document.createElement('script');
    fontAwesomeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js';
    fontAwesomeScript.defer = true;
    document.head.appendChild(fontAwesomeScript);

    // Create the Modal Structure
    function createModal() {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.id = `${PREFIX}modal-overlay`;

        // Create modal container
        const modal = document.createElement('div');
        modal.id = `${PREFIX}modal`;

        // Close button
        const closeButton = document.createElement('span');
        closeButton.className = `${PREFIX}close-modal`;
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Close';
        closeButton.onclick = () => hideModal();
        modal.appendChild(closeButton);

        // Modal header
        const header = document.createElement('h2');
        header.innerText = 'Import Pickup Points';
        modal.appendChild(header);

        // Import form
        const form = document.createElement('form');
        form.id = `${PREFIX}import-form`;

        // Insert an explanatory paragraph
const infoParagraph = document.createElement('p');
infoParagraph.style.margin = '10px 0';
infoParagraph.innerHTML = `
  For a step by step guide, follow
  <a href="https://ingrid.slite.com/app/docs/Q93DcpArU-dUwb" target="_blank" style="color: blue; text-decoration: underline;">
    this article
  </a>.
`;
form.appendChild(infoParagraph);

        // Download Template Button
        const downloadTemplateButton = document.createElement('button');
        downloadTemplateButton.type = 'button';
        downloadTemplateButton.id = `${PREFIX}download-template-button`;
        downloadTemplateButton.innerHTML = '<i class="fas fa-download"></i> Download Template';
        downloadTemplateButton.onclick = () => {
            // Provide a direct link to an XLSX template
            window.open('https://docs.google.com/spreadsheets/d/1ykNWbNDAKn57Z-TUyXhj5FJGueownYvqeSKmTWL_uR0/edit?gid=0#gid=0', '_blank');
            // Alternatively, generate a template on the fly using SheetJS
        };
        form.appendChild(downloadTemplateButton);

        // Shipping Method Input
        const shippingMethodLabel = document.createElement('label');
        shippingMethodLabel.innerText = 'Shipping Method*';
        shippingMethodLabel.htmlFor = `${PREFIX}shippingMethodInput`;
        form.appendChild(shippingMethodLabel);

        const shippingMethodInput = document.createElement('input');
        shippingMethodInput.type = 'text';
        shippingMethodInput.id = `${PREFIX}shippingMethodInput`;
        shippingMethodInput.required = true;
        shippingMethodInput.placeholder = 'Enter Shipping Method';
        form.appendChild(shippingMethodInput);

        // File Upload Input
        const fileLabel = document.createElement('label');
        fileLabel.innerText = 'XLSX File*';
        fileLabel.htmlFor = `${PREFIX}xlsxFileInput`;
        form.appendChild(fileLabel);

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = `${PREFIX}xlsxFileInput`;
        fileInput.accept = '.xlsx';
        fileInput.required = true;
        form.appendChild(fileInput);

        // Error Messages Container
        const errorMessages = document.createElement('div');
        errorMessages.id = `${PREFIX}error-messages`;
        errorMessages.style.display = 'none';
        form.appendChild(errorMessages);

        // Success Message Container
        const successMessage = document.createElement('div');
        successMessage.id = `${PREFIX}success-message`;
        successMessage.style.display = 'none';
        form.appendChild(successMessage);

        // Spinner
        const spinner = document.createElement('div');
        spinner.id = `${PREFIX}spinner`;
        form.appendChild(spinner);

        // Button Container
        const buttonContainer = document.createElement('div');
        buttonContainer.id = `${PREFIX}button-container`;

        // Import Button with Icon
        const importButton = document.createElement('button');
        importButton.type = 'submit';
        importButton.id = `${PREFIX}import-button`;
        importButton.innerHTML = '<i class="fas fa-file-import"></i> Import';
        buttonContainer.appendChild(importButton);

        form.appendChild(buttonContainer);
        modal.appendChild(form);
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);

        // Handle form submission
        form.onsubmit = function(e) {
            e.preventDefault();

            // Clear previous errors and success messages
            errorMessages.innerHTML = '';
            errorMessages.style.display = 'none';
            successMessage.innerHTML = '';
            successMessage.style.display = 'none';

            const shippingMethod = shippingMethodInput.value.trim();
            const file = fileInput.files[0];

            if (!shippingMethod) {
                displayErrors(['Shipping method is required.']);
                return;
            }

            if (!file) {
                displayErrors(['XLSX file is required.']);
                return;
            }

            // Check if the private key is already available
            if (unsafeWindow.privateKeyBase64) {
                handleImportProcess(shippingMethod, file);
            } else {
                // Inform the user that the private key is being fetched
                displayErrors(['Authorization key is not yet available. Waiting for it to be fetched...']);

                // Listen for the 'privateKeyReady' event on unsafeWindow
                const onPrivateKeyReady = () => {
                    console.log('privateKeyReady event received.');
                    window.removeEventListener('privateKeyReady', onPrivateKeyReady);
                    handleImportProcess(shippingMethod, file);
                };

                window.addEventListener('privateKeyReady', onPrivateKeyReady);
            }
        };

        return modalOverlay;
    }

    // Function to display error messages
    function displayErrors(errors) {
        const errorMessages = document.getElementById(`${PREFIX}error-messages`);
        errorMessages.innerHTML = '<ul>' + errors.map(err => `<li>${err}</li>`).join('') + '</ul>';
        errorMessages.style.display = 'block';
    }

    // Function to display success messages
    function displaySuccess(message) {
        const successMessage = document.getElementById(`${PREFIX}success-message`);
        successMessage.innerText = message;
        successMessage.style.display = 'block';
    }

    // Function to hide the modal
    function hideModal() {
        const modalOverlay = document.getElementById(`${PREFIX}modal-overlay`);
        if (modalOverlay) {
            modalOverlay.style.display = 'none';
            modalOverlay.remove();
        }
    }

    // Function to show the modal
    function showModal() {
        // Create and display the modal
        const modalOverlay = createModal();
        modalOverlay.style.display = 'flex';

        // Focus on the first input
        const shippingMethodInput = document.getElementById(`${PREFIX}shippingMethodInput`);
        if (shippingMethodInput) {
            shippingMethodInput.focus();
        }

        // Add event listener for Esc key to close the modal
        function handleEsc(event) {
            if (event.key === 'Escape') {
                hideModal();
                document.removeEventListener('keydown', handleEsc);
            }
        }

        document.addEventListener('keydown', handleEsc);
    }

    // Utility function to validate data
    function validateData(headers, data) {
        const mandatoryHeaders = headers.filter(header => header.endsWith('*')).map(header => header.replace(/\*$/, '').trim());
        const errors = [];

        data.forEach((row, rowIndex) => {
            mandatoryHeaders.forEach(header => {
                if (!row[header] || String(row[header]).trim() === '') {
                    errors.push(`Row ${rowIndex + 2}: Missing mandatory field "${header}".`);
                }
            });

            // Additional validations can be added here (e.g., data types, formats)
            // Example: Validate lat and lng are numbers
            if (row['lat'] !== undefined && isNaN(parseFloat(row['lat']))) {
                errors.push(`Row ${rowIndex + 2}: "lat" must be a valid number.`);
            }

            if (row['lng'] !== undefined && isNaN(parseFloat(row['lng']))) {
                errors.push(`Row ${rowIndex + 2}: "lng" must be a valid number.`);
            }

            // Validate time formats (HH:MM or HH:MM-HH:MM)
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            days.forEach(day => {
                const openingHours = row[`${day} (opening hours, HH:MM-HH:MM)`];
                const cutoffTime = row[`${day} (cut-off times, HH:MM)`];
                const deliveryDays = row[`${day} (delivery days)`];

                if (openingHours && openingHours !== '-' && !/^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/.test(openingHours)) {
                    errors.push(`Row ${rowIndex + 2}: Invalid opening hours format for ${day}. Expected "HH:MM-HH:MM" or "-" if closed.`);
                }

                if (cutoffTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(cutoffTime)) {
                    errors.push(`Row ${rowIndex + 2}: Invalid cutoff time format for ${day}. Expected "HH:MM".`);
                }

                if (deliveryDays && isNaN(parseInt(deliveryDays))) {
                    errors.push(`Row ${rowIndex + 2}: "delivery days" for ${day} must be a number.`);
                }
            });
        });

        return errors;
    }

    // Utility function to build JSON
    function buildJSON(data) {
        const json = {
            shipping_method: data.shipping_method, // From the form input
            locations: data.locations.map(row => {
                // Build operational_hours
                const operational_hours = {};
                const daysMap = {
                    'Monday': 'mon',
                    'Tuesday': 'tue',
                    'Wednesday': 'wed',
                    'Thursday': 'thu',
                    'Friday': 'fri',
                    'Saturday': 'sat',
                    'Sunday': 'sun'
                };

                Object.keys(daysMap).forEach(day => {
                    const shortDay = daysMap[day];
                    const opening = row[`${day} (opening hours, HH:MM-HH:MM)`];
                    operational_hours[shortDay] = (opening && opening.trim() !== '') ? opening : '-';
                });

                // Build cutoff_times
                const cutoff_times = {};
                Object.keys(daysMap).forEach(day => {
                    const shortDay = daysMap[day];
                    const cutoff = row[`${day} (cut-off times, HH:MM)`];
                    const deliveryDays = row[`${day} (delivery days)`];
                    if (cutoff && deliveryDays) {
                        if (!cutoff_times[shortDay]) {
                            cutoff_times[shortDay] = [];
                        }
                        cutoff_times[shortDay].push({
                            time: cutoff
                            // Exclude delivery_days and delivery_time as per user request
                        });
                    }
                });

                // Add default cutoff time "23:59" for days without cutoff times
                Object.keys(daysMap).forEach(day => {
                    const shortDay = daysMap[day];
                    if (!cutoff_times[shortDay] || cutoff_times[shortDay].length === 0) {
                        cutoff_times[shortDay] = [{
                            time: "23:59"
                        }];
                        // Track the day for user notification
                        defaultCutoffDays.add(day);
                    }
                });

                // Build visiting_address without Full Address, street_number, route
                let addressLines = [];
                if (row['address_lines']) {
                    // Split by comma and take the first part
                    const firstPart = row['address_lines'].split(',')[0].trim();
                    addressLines = [firstPart];
                }

                const visiting_address = {
                    name: row['name'],
                    address_lines: addressLines,
                    city: String(row['city']),
                    postal_code: String(row['postal_code']), // Ensure postal_code is a string
                    country: String(row['country']),
                    coordinates: {
                        lat: parseFloat(row['lat']),
                        lng: parseFloat(row['lng'])
                    }
                };

                // Construct the location object
                const location = {
                    external_id: String(row['external_id']), // Ensure external_id is a string
                    visiting_address: visiting_address,
                    operational_hours: operational_hours,
                    cutoff_times: cutoff_times
                };

                // Optional fields
                if (row['email']) location.email = row['email'];
                if (row['phone']) location.phone = row['phone'];

                // Add other optional fields as needed based on Swagger
                // For example, attributes, booking_method, etc.

                return location;
            })
        };

        return json;
    }

    // Utility function to determine API endpoint
    function getApiEndpoint(shippingMethod) {
        const currentUrl = window.location.href;
        let baseUrl = '';

        if (currentUrl.startsWith('https://mad-stage.ingrid.com/')) {
            baseUrl = 'https://api-stage.ingrid.com/v1/ombud/methods/';
        } else if (currentUrl.startsWith('https://mad.ingrid.com/')) {
            baseUrl = 'https://api.ingrid.com/v1/ombud/methods/';
        } else {
            throw new Error('Unsupported URL. The script works only on mad.ingrid.com or mad-stage.ingrid.com.');
        }

        return `${baseUrl}${encodeURIComponent(shippingMethod)}/locations`;
    }

    // Utility function to send POST request using GM_xmlhttpRequest
    function sendPostRequest(url, jsonData, authKey, callback, errorCallback) {
        GM_xmlhttpRequest({
            method: "POST",
            url: url,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authKey}`
            },
            data: JSON.stringify(jsonData),
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    try {
                        const result = JSON.parse(response.responseText);
                        callback(result);
                    } catch (e) {
                        errorCallback(`Failed to parse response JSON: ${e.message}`);
                    }
                } else {
                    let errorMsg = `HTTP ${response.status}: ${response.statusText || response.responseText}`;
                    try {
                        const errorResponse = JSON.parse(response.responseText);
                        if (errorResponse.trace_id) {
                            errorMsg += `\nTrace ID: ${errorResponse.trace_id}`;
                        }
                    } catch (e) {
                        // If response is not JSON, do nothing
                    }
                    errorCallback(errorMsg);
                }
            },
            onerror: function(error) {
                errorCallback(`Request failed: ${error.statusText}`);
            }
        });
    }

    // Function to handle the import process
    function handleImportProcess(shippingMethod, file) {
        const spinner = document.getElementById(`${PREFIX}spinner`);
        spinner.style.display = 'block';

        const reader = new FileReader();

        reader.onload = function(event) {
            try {
                const arrayBuffer = event.target.result;
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });

                // Assuming the first sheet contains the data
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert sheet to JSON with headers
                const sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                // Debugging: Log parsed data
                console.log('Parsed Data:', sheetData);

                if (sheetData.length === 0) {
                    throw new Error('The XLSX file is empty or has an invalid format.');
                }

                // Transform headers: remove trailing '*' and trim
                const originalHeaders = Object.keys(sheetData[0]);
                const transformedHeaders = originalHeaders.map(header => header.replace(/\*$/, '').trim());

                // Map data to new headers
                const jsonData = sheetData.map(row => {
                    const newRow = {};
                    originalHeaders.forEach((originalHeader, index) => {
                        const transformedHeader = transformedHeaders[index];
                        newRow[transformedHeader] = row[originalHeader];
                    });
                    return newRow;
                });

                // Update headers for validation
                const headers = transformedHeaders;
                const data = jsonData;

                const validationErrors = validateData(headers, data);

                if (validationErrors.length > 0) {
                    displayErrors(validationErrors);
                    spinner.style.display = 'none';
                    return;
                }

                const formattedData = buildJSON({
                    shipping_method: shippingMethod,
                    locations: data
                });
                const apiEndpoint = getApiEndpoint(shippingMethod);

                // Retrieve authorization key from unsafeWindow
                const authKey = unsafeWindow.privateKeyBase64;
                if (!authKey) {
                    displayErrors(['Authorization key not found. Please ensure the private key has been fetched.']);
                    spinner.style.display = 'none';
                    return;
                }

                // Send POST request using GM_xmlhttpRequest
                sendPostRequest(apiEndpoint, formattedData, authKey,
                    (result) => {
                        let successMsg = 'Data successfully imported.';
                        if (defaultCutoffDays.size > 0) {
                            const daysArray = Array.from(defaultCutoffDays);
                            successMsg += `\nDefault cutoff times applied for: ${daysArray.join(', ')}.`;
                        }
                        displaySuccess(successMsg);
                        // Do not close the modal; keep it open for further actions
                        console.log('API Response:', result);
                        spinner.style.display = 'none';
                    },
                    (errorMessage) => {
                        // Check if errorMessage contains trace_id
                        let traceId = null;
                        const traceIdMatch = errorMessage.match(/Trace ID:\s*(\S+)/);
                        if (traceIdMatch && traceIdMatch[1]) {
                            traceId = traceIdMatch[1];
                        }

                        if (traceId) {
                            displayErrors([`Error: ${errorMessage}`]);
                            addDebugButton(traceId);
                        } else {
                            displayErrors([`Error: ${errorMessage}`]);
                        }

                        console.error(errorMessage);
                        spinner.style.display = 'none';
                    }
                );

            } catch (error) {
                displayErrors([error.message]);
                console.error(error);
                spinner.style.display = 'none';
            }
        };

        reader.onerror = function() {
            displayErrors(['Failed to read the file.']);
            spinner.style.display = 'none';
        };

        reader.readAsArrayBuffer(file);
    }

    // Function to add the "Check in Debug" button to the left of the Import button
    function addDebugButton(traceId) {
        const buttonContainer = document.getElementById(`${PREFIX}button-container`);
        if (!buttonContainer) return;

        // Check if the debug button already exists
        const existingDebugButton = document.getElementById(`${PREFIX}debug-button`);
        if (existingDebugButton) {
            existingDebugButton.remove();
        }

        // Create Debug Button
        const debugButton = document.createElement('button');
        debugButton.type = 'button';
        debugButton.id = `${PREFIX}debug-button`;
        debugButton.innerHTML = '<i class="fas fa-search"></i> Check in Debug';
        debugButton.onclick = () => {
            const debugUrl = `https://debug.ingrid.com/view-payloads?trace_id=${encodeURIComponent(traceId)}`;
            window.open(debugUrl, '_blank');
        };

        // Insert the debug button to the left of the Import button
        buttonContainer.insertBefore(debugButton, buttonContainer.firstChild);
    }

    // Function to close the modal when clicking outside the modal content
    function handleClickOutside(event) {
        const modalOverlay = document.getElementById(`${PREFIX}modal-overlay`);
        if (modalOverlay && event.target === modalOverlay) {
            hideModal();
        }
    }

    window.addEventListener('click', handleClickOutside);

        // Listen for the custom event dispatched by the primary script
window.addEventListener('triggerImportPickupPointsICS', function() {
    showModal();
}, false);

})();
