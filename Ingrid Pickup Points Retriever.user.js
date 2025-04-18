// ==UserScript==
// @name         Ingrid Pickup Points Retriever
// @namespace    http://yourdomain.com/
// @version      4.8
// @description  Retrieve and display pickup points from Ingrid API with delete functionality in a beautifully styled frontend triggered via a bookmarklet. Broader search applied.
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        unsafeWindow
// @connect      api.ingrid.com
// @connect      api-stage.ingrid.com
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Ingrid%20Pickup%20Points%20Retriever.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Ingrid%20Pickup%20Points%20Retriever.user.js
// ==/UserScript==

(function() {
    'use strict';

    if (unsafeWindow && unsafeWindow.privateKeyBase64) {
        console.log("Private Key Base64:", unsafeWindow.privateKeyBase64);
    } else {
        console.log('Private Key Base64 is not defined or unsafeWindow is inaccessible.');
    }

    const PREFIX = 'ingrid-';
    let currentSearchTerm = '';

    // Include Font Awesome for Icons
    const fontAwesomeLink = document.createElement('link');
    fontAwesomeLink.rel = 'stylesheet';
    fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesomeLink);

    GM_addStyle(`
        /* Modal Overlay Styles */
        #${PREFIX}locations-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.6);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            backdrop-filter: blur(5px);
            animation: fadeIn 0.5s;
        }

        /* Modal Container Styles */
        #${PREFIX}locations-modal {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 15px;
            width: 90%;
            max-width: 1200px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 12px 24px rgba(0,0,0,0.2);
            position: relative;
            animation: slideIn 0.5s ease-out;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        /* Close Button */
        .${PREFIX}close-modal {
            position: absolute;
            top: 20px;
            right: 25px;
            color: #aaaaaa;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            transition: color 0.3s;
        }
        .${PREFIX}close-modal:hover,
        .${PREFIX}close-modal:focus {
            color: #000000;
            text-decoration: none;
        }

        /* Modal Header */
        #${PREFIX}locations-modal h2 {
            text-align: center;
            margin-bottom: 30px;
            color: #ffffff;
            background-color: #000000;
            padding: 15px;
            border-radius: 10px 10px 0 0;
            position: relative;
        }

        /* Input Section */
        #${PREFIX}locations-input-section {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 30px;
            justify-content: center;
        }

        #${PREFIX}locations-input-section input[type="text"] {
            flex: 1 1 250px;
            padding: 10px 15px;
            border: 1px solid #cccccc;
            border-radius: 8px;
            font-size: 16px;
        }

        #${PREFIX}locations-input-section button {
            padding: 10px 20px;
            background-color: #000000;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        #${PREFIX}locations-input-section button:hover {
            background-color: #333333;
        }
        #${PREFIX}locations-input-section button:active {
            background-color: #222222;
        }

        /* Spinner Styles */
        #${PREFIX}locations-spinner {
            border: 6px solid #f3f3f3;
            border-top: 6px solid #000000;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
            display: none;
        }

        /* Search and Filter Section */
        #${PREFIX}search-filter-section {
            display: none;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 20px;
            justify-content: center;
        }

        #${PREFIX}search-filter-section input,
        #${PREFIX}search-filter-section select {
            padding: 10px 15px;
            border: 1px solid #cccccc;
            border-radius: 8px;
            font-size: 16px;
            flex: 1 1 200px;
        }

        /* Locations Container */
        #${PREFIX}locations-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 25px;
        }

        /* Location Card */
        .${PREFIX}location-card {
            background-color: #f9f9f9;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 6px 18px rgba(0,0,0,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
            display: flex;
            flex-direction: column;
        }
        .${PREFIX}location-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.2);
        }

        /* Card Header */
        .${PREFIX}location-header {
            background-color: #000000;
            color: #ffffff;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .${PREFIX}location-name {
            font-size: 1.5em;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .${PREFIX}location-id {
            font-size: 0.8em;
            background-color: #ffffff;
            color: #000000;
            padding: 3px 8px;
            border-radius: 15px;
            font-weight: 600;
            max-width: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            title: "Full ID";
        }

        /* Highlight class for search terms */
        .highlight {
            background-color: yellow;
            padding: 0 2px;
            border-radius: 3px;
        }

        /* Delete Button Styles */
        .${PREFIX}delete-button {
            background-color: #d9534f;
            color: #ffffff;
            border: none;
            border-radius: 5px;
            padding: 5px 10px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background-color 0.3s;
            display: flex;
            align-items: center;
            gap: 5px;
            align-self: flex-start;
        }
        .${PREFIX}delete-button i {
            margin: 0;
        }
        .${PREFIX}delete-button:hover {
            background-color: #c9302c;
        }
        .${PREFIX}delete-button:active {
            background-color: #ac2925;
        }

        /* Card Body */
        .${PREFIX}location-body {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        /* Detail Sections */
        .${PREFIX}detail-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .${PREFIX}detail-section h3 {
            display: flex;
            align-items: center;
            font-size: 1.1em;
            color: #000000;
            margin-bottom: 8px;
            gap: 12px;
        }
        .${PREFIX}detail-section summary {
            display: flex;
            align-items: center;
            font-size: 1.1em;
            color: #000000;
            margin-bottom: 8px;
            cursor: pointer;
            list-style: none;
            outline: none;
            gap: 12px;
        }
        .${PREFIX}detail-section summary::-webkit-details-marker {
            display: none;
        }
        .${PREFIX}detail-section summary::before {
            content: '\\f0da';
            font-family: 'Font Awesome 6 Free';
            font-weight: 900;
            transition: transform 0.3s;
        }
        .${PREFIX}detail-section details[open] summary::before {
            transform: rotate(180deg);
        }

        .${PREFIX}detail-section p, .${PREFIX}detail-section ul {
            margin: 4px 0;
            color: #555555;
            font-size: 0.95em;
        }
        .${PREFIX}detail-section ul {
            list-style: none;
            padding-left: 0;
        }
        .${PREFIX}detail-section ul li {
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Contact Links */
        .${PREFIX}contact-link {
            color: #000000;
            text-decoration: none;
            transition: color 0.3s;
        }
        .${PREFIX}contact-link:hover {
            color: #333333;
        }

        /* Search Bar */
        #${PREFIX}search-input {
            flex: 1 1 300px;
            padding: 10px 15px;
            border: 1px solid #cccccc;
            border-radius: 8px;
            font-size: 16px;
        }

        /* Filter Dropdown */
        #${PREFIX}filter-select {
            flex: 1 1 200px;
            padding: 10px 15px;
            border: 1px solid #cccccc;
            border-radius: 8px;
            font-size: 16px;
            appearance: none;
            background: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><path fill="%23000000" d="M0 3l5 5 5-5z"/></svg>') no-repeat right 10px center;
            background-size: 10px;
        }

        /* No Data Message Styles */
        #${PREFIX}locations-container .${PREFIX}no-data-message {
            text-align: center;
            font-size: 1.2em;
            color: #555555;
            padding: 20px;
        }

        /* Delete Confirmation Modal Overlay */
        #${PREFIX}delete-confirm-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.6);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10002;
            backdrop-filter: blur(5px);
        }

        /* Delete Confirmation Modal Container */
        #${PREFIX}delete-confirm-modal {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 15px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 12px 24px rgba(0,0,0,0.2);
            position: relative;
            animation: slideIn 0.3s ease-out;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
        }

        /* Notification Modal Overlay */
        #${PREFIX}notification-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.6);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10003;
            backdrop-filter: blur(5px);
        }

        /* Notification Modal Container */
        #${PREFIX}notification-modal {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 15px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 12px 24px rgba(0,0,0,0.2);
            position: relative;
            animation: slideIn 0.3s ease-out;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
        }

        /* Buttons in Delete Confirmation Modal */
        #${PREFIX}confirm-delete-button, #${PREFIX}cancel-delete-button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s;
        }

        #${PREFIX}confirm-delete-button {
            background-color: #d9534f;
            color: #ffffff;
        }
        #${PREFIX}confirm-delete-button:hover {
            background-color: #c9302c;
        }

        #${PREFIX}cancel-delete-button {
            background-color: #6c757d;
            color: #ffffff;
        }
        #${PREFIX}cancel-delete-button:hover {
            background-color: #5a6268;
        }

        /* Buttons in Notification Modal */
        #${PREFIX}close-notification-button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            background-color: #000000;
            color: #ffffff;
            transition: background-color 0.3s;
        }
        #${PREFIX}close-notification-button:hover {
            background-color: #333333;
        }

        /* Shared Close Button Style */
        #${PREFIX}delete-confirm-modal .${PREFIX}close-modal,
        #${PREFIX}notification-modal .${PREFIX}close-modal {
            position: absolute;
            top: 15px;
            right: 20px;
            color: #aaaaaa;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            transition: color 0.3s;
        }
        #${PREFIX}delete-confirm-modal .${PREFIX}close-modal:hover,
        #${PREFIX}notification-modal .${PREFIX}close-modal:hover {
            color: #000000;
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
    `);

    /* ------------------- Modal Structures ------------------- */

    const modalOverlay = document.createElement('div');
    modalOverlay.id = `${PREFIX}locations-modal-overlay`;
    modalOverlay.innerHTML = `
        <div id="${PREFIX}locations-modal">
            <span class="${PREFIX}close-modal">&times;</span>
            <h2>Retrieve Pickup Points</h2>
            <div id="${PREFIX}locations-input-section">
                <input type="text" id="${PREFIX}shipping-method-input" placeholder="Enter Shipping Method" />
                <button id="${PREFIX}fetch-locations-button"><i class="fas fa-download"></i> Get</button>
            </div>
            <div id="${PREFIX}locations-spinner"></div>
            <div id="${PREFIX}search-filter-section" style="display:none;">
                <input type="text" id="${PREFIX}search-input" placeholder="Search by any text..." />
                <select id="${PREFIX}filter-select">
                    <option value="">Filter by Country</option>
                </select>
            </div>
            <div id="${PREFIX}locations-container"></div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    const deleteConfirmModal = document.createElement('div');
    deleteConfirmModal.id = `${PREFIX}delete-confirm-modal-overlay`;
    deleteConfirmModal.innerHTML = `
        <div id="${PREFIX}delete-confirm-modal">
            <span class="${PREFIX}close-modal">&times;</span>
            <h2>Confirm Deletion</h2>
            <p>Are you sure you want to delete this pickup point?</p>
            <div style="display: flex; justify-content: center; gap: 20px; margin-top: 20px;">
                <button id="${PREFIX}confirm-delete-button">Yes, Delete</button>
                <button id="${PREFIX}cancel-delete-button">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(deleteConfirmModal);

    const notificationModal = document.createElement('div');
    notificationModal.id = `${PREFIX}notification-modal-overlay`;
    notificationModal.innerHTML = `
        <div id="${PREFIX}notification-modal">
            <span class="${PREFIX}close-modal">&times;</span>
            <h2 id="${PREFIX}notification-title">Notification</h2>
            <p id="${PREFIX}notification-message"></p>
            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <button id="${PREFIX}close-notification-button">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(notificationModal);

    /* ------------------- Modal Handling Functions ------------------- */

    function showModal() {
        modalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function hideModal() {
        modalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        clearInputs();
    }

    function clearInputs() {
        document.getElementById(`${PREFIX}shipping-method-input`).value = '';
        document.getElementById(`${PREFIX}locations-container`).innerHTML = '';
        document.getElementById(`${PREFIX}search-input`).value = '';
        document.getElementById(`${PREFIX}filter-select`).innerHTML = '<option value="">Filter by Country</option>';
        document.getElementById(`${PREFIX}search-filter-section`).style.display = 'none';
        currentSearchTerm = '';
    }

    function showDeleteConfirmModal(externalId) {
        deleteConfirmModal.style.display = 'flex';

        const confirmButton = document.getElementById(`${PREFIX}confirm-delete-button`);
        const cancelButton = document.getElementById(`${PREFIX}cancel-delete-button`);
        const closeBtn = deleteConfirmModal.querySelector(`.${PREFIX}close-modal`);

        confirmButton.replaceWith(confirmButton.cloneNode(true));
        cancelButton.replaceWith(cancelButton.cloneNode(true));
        closeBtn.replaceWith(closeBtn.cloneNode(true));

        const newConfirmButton = document.getElementById(`${PREFIX}confirm-delete-button`);
        const newCancelButton = document.getElementById(`${PREFIX}cancel-delete-button`);
        const newCloseBtn = deleteConfirmModal.querySelector(`.${PREFIX}close-modal`);

        newConfirmButton.addEventListener('click', function() {
            hideDeleteConfirmModal();
            proceedWithDeletion(externalId);
        });
        newCancelButton.addEventListener('click', hideDeleteConfirmModal);
        newCloseBtn.addEventListener('click', hideDeleteConfirmModal);
    }

    function hideDeleteConfirmModal() {
        deleteConfirmModal.style.display = 'none';
    }

    function showNotificationModal(title, message) {
        document.getElementById(`${PREFIX}notification-title`).innerText = title;
        document.getElementById(`${PREFIX}notification-message`).innerText = message;
        notificationModal.style.display = 'flex';
    }

    function hideNotificationModal() {
        notificationModal.style.display = 'none';
    }

    modalOverlay.querySelector(`.${PREFIX}close-modal`).addEventListener('click', hideModal);
    window.addEventListener('click', (event) => {
        if (event.target == modalOverlay) {
            hideModal();
        }
    });

    modalOverlay.addEventListener('click', function(e) {
        if (e.target && (e.target.id === `${PREFIX}fetch-locations-button` || e.target.closest(`#${PREFIX}fetch-locations-button`))) {
            triggerFetchLocations();
        }
    });

    document.getElementById(`${PREFIX}locations-input-section`).addEventListener('keydown', function(e) {
        if (e.target && e.target.id === `${PREFIX}shipping-method-input` && e.key === 'Enter') {
            e.preventDefault();
            triggerFetchLocations();
        }
    });

    document.getElementById(`${PREFIX}close-notification-button`).addEventListener('click', hideNotificationModal);
    notificationModal.querySelector(`.${PREFIX}close-modal`).addEventListener('click', hideNotificationModal);

    function determineApiEndpoint(currentUrl, shippingMethod) {
        if (currentUrl.startsWith('https://mad.ingrid.com/')) {
            return `https://api.ingrid.com/v1/ombud/methods/${shippingMethod}/locations`;
        } else if (currentUrl.startsWith('https://mad-stage.ingrid.com/')) {
            return `https://api-stage.ingrid.com/v1/ombud/methods/${shippingMethod}/locations`;
        } else {
            showNotificationModal('Unsupported URL', 'This script works only on mad.ingrid.com or mad-stage.ingrid.com.');
            return null;
        }
    }

    function determineDeleteEndpoint(currentUrl, shippingMethod) {
        if (currentUrl.startsWith('https://mad.ingrid.com/')) {
            return `https://api.ingrid.com/v1/ombud/methods/${shippingMethod}/locations.delete`;
        } else if (currentUrl.startsWith('https://mad-stage.ingrid.com/')) {
            return `https://api-stage.ingrid.com/v1/ombud/methods/${shippingMethod}/locations.delete`;
        } else {
            showNotificationModal('Unsupported URL', 'This script works only on mad.ingrid.com or mad-stage.ingrid.com.');
            return null;
        }
    }

    function showSpinner() {
        document.getElementById(`${PREFIX}locations-spinner`).style.display = 'block';
    }

    function hideSpinner() {
        document.getElementById(`${PREFIX}locations-spinner`).style.display = 'none';
    }

    function fetchLocations(shippingMethod, apiEndpoint, privateKey) {
        showSpinner();
        GM_xmlhttpRequest({
            method: 'GET',
            url: apiEndpoint,
            headers: {
                'Authorization': `Bearer ${privateKey}`,
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'application/json'
            },
            onload: function(response) {
                hideSpinner();
                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);
                        displayResult(data);
                    } catch (e) {
                        showNotificationModal('Error', 'Failed to parse response JSON.');
                    }
                } else {
                    showNotificationModal('Error', `Error: ${response.status} - ${response.statusText}`);
                }
            },
            onerror: function() {
                hideSpinner();
                showNotificationModal('Error', 'Request failed.');
            }
        });
    }

    function triggerFetchLocations() {
        const shippingMethod = document.getElementById(`${PREFIX}shipping-method-input`).value.trim();
        if (!shippingMethod) {
            showNotificationModal('Input Required', 'Please enter the Shipping Method.');
            return;
        }

        const currentUrl = window.location.href;
        const apiEndpoint = determineApiEndpoint(currentUrl, shippingMethod);
        if (!apiEndpoint) return;

        const privateKey = unsafeWindow.privateKeyBase64;
        if (!privateKey) {
            showNotificationModal('Authorization Error', 'Authorization token not found. Please ensure the Private key is available.');
            return;
        }

        fetchLocations(shippingMethod, apiEndpoint, privateKey);
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function displayResult(data) {
        const container = document.getElementById(`${PREFIX}locations-container`);
        container.innerHTML = '';

        function showNoPickupMessage(messageText = 'No pickup points available for this shipping method.') {
            const message = document.createElement('div');
            message.className = `${PREFIX}no-data-message`;
            message.innerText = messageText;
            container.appendChild(message);
        }

        if (typeof data === 'object' && data !== null && Object.keys(data).length === 0) {
            showNoPickupMessage();
            return;
        }

        if (data.locations && Array.isArray(data.locations)) {
            if (data.locations.length > 0) {
                displayLocations(data.locations);
            } else {
                showNoPickupMessage();
            }
        } else {
            showNoPickupMessage('Unexpected data format received from the API.');
        }
    }

    function displayLocations(locations) {
        const container = document.getElementById(`${PREFIX}locations-container`);
        container.innerHTML = '';

        const countries = new Set();

        locations.forEach(location => {
            const card = document.createElement('div');
            card.className = `${PREFIX}location-card`;

            const header = document.createElement('div');
            header.className = `${PREFIX}location-header`;

            const name = document.createElement('div');
            name.className = `${PREFIX}location-name`;
            name.innerText = location.visiting_address.name;

            const id = document.createElement('div');
            id.className = `${PREFIX}location-id`;
            id.title = `ID: ${location.external_id}`;
            id.innerText = `ID: ${location.external_id}`;

            const deleteButton = document.createElement('button');
            deleteButton.className = `${PREFIX}delete-button`;
            deleteButton.innerHTML = `<i class="fas fa-trash-alt"></i> Delete`;
            deleteButton.addEventListener('click', function(e) {
                e.stopPropagation();
                handleDeleteLocation(location.external_id);
            });

            header.appendChild(name);
            header.appendChild(id);
            header.appendChild(deleteButton);
            card.appendChild(header);

            const body = document.createElement('div');
            body.className = `${PREFIX}location-body`;

            // Address Section
            const addressSection = document.createElement('div');
            addressSection.className = `${PREFIX}detail-section`;
            const addressTitle = document.createElement('h3');
            addressTitle.innerHTML = '<i class="fas fa-map-marker-alt"></i> Address';
            const addressList = document.createElement('ul');
            location.visiting_address.address_lines.forEach(line => {
                const li = document.createElement('li');
                li.innerText = line;
                addressList.appendChild(li);
            });
            const city = document.createElement('p');
            city.innerHTML = `<strong>City:</strong> ${location.visiting_address.city}`;
            const postal = document.createElement('p');
            postal.innerHTML = `<strong>Postal Code:</strong> ${location.visiting_address.postal_code}`;
            const country = document.createElement('p');
            country.innerHTML = `<strong>Country:</strong> ${location.visiting_address.country}`;
            const coordinates = document.createElement('p');
            coordinates.innerHTML = `<strong>Coordinates:</strong> Lat: ${location.visiting_address.coordinates.lat}, Lng: ${location.visiting_address.coordinates.lng}`;
            addressSection.appendChild(addressTitle);
            addressSection.appendChild(addressList);
            addressSection.appendChild(city);
            addressSection.appendChild(postal);
            addressSection.appendChild(country);
            addressSection.appendChild(coordinates);

            countries.add(location.visiting_address.country);

            // Contact Section
            const contactSection = document.createElement('div');
            contactSection.className = `${PREFIX}detail-section`;
            const contactTitle = document.createElement('h3');
            contactTitle.innerHTML = '<i class="fas fa-phone-alt"></i> Contact';
            const email = document.createElement('p');
            email.innerHTML = `<strong>Email:</strong> <a href="mailto:${location.email}" class="${PREFIX}contact-link">${location.email}</a>`;
            const phone = document.createElement('p');
            phone.innerHTML = `<strong>Phone:</strong> <a href="tel:${location.phone}" class="${PREFIX}contact-link">${location.phone}</a>`;
            contactSection.appendChild(contactTitle);
            contactSection.appendChild(email);
            contactSection.appendChild(phone);

            // Operational Hours
            const hoursSection = document.createElement('details');
            hoursSection.className = `${PREFIX}detail-section`;
            const hoursSummary = document.createElement('summary');
            hoursSummary.innerHTML = '<i class="fas fa-clock"></i> Operational Hours';
            const hoursList = document.createElement('ul');
            for (const [day, hours] of Object.entries(location.operational_hours)) {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${capitalizeFirstLetter(day)}:</strong> ${hours}`;
                hoursList.appendChild(li);
            }
            hoursSection.appendChild(hoursSummary);
            hoursSection.appendChild(hoursList);

            // Cutoff Times
            const cutoffSection = document.createElement('details');
            cutoffSection.className = `${PREFIX}detail-section`;
            const cutoffSummary = document.createElement('summary');
            cutoffSummary.innerHTML = '<i class="fas fa-hourglass-half"></i> Cutoff Times';
            const cutoffList = document.createElement('ul');
            for (const [day, times] of Object.entries(location.cutoff_times)) {
                times.forEach(timeObj => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${capitalizeFirstLetter(day)}:</strong> ${timeObj.time} (${timeObj.delivery_days} day(s) delivery)`;
                    cutoffList.appendChild(li);
                });
            }
            cutoffSection.appendChild(cutoffSummary);
            cutoffSection.appendChild(cutoffList);

            body.appendChild(addressSection);
            body.appendChild(contactSection);
            body.appendChild(hoursSection);
            body.appendChild(cutoffSection);

            card.appendChild(body);
            container.appendChild(card);
        });

        populateFilterOptions(Array.from(countries));
        document.getElementById(`${PREFIX}search-filter-section`).style.display = 'flex';
        attachSearchAndFilterListeners();
    }

    function handleDeleteLocation(externalId) {
        const shippingMethod = document.getElementById(`${PREFIX}shipping-method-input`).value.trim();
        if (!shippingMethod) {
            showNotificationModal('Error', 'Shipping Method is missing. Please ensure you have entered it.');
            return;
        }
        showDeleteConfirmModal(externalId);
    }

    function proceedWithDeletion(externalId) {
        const shippingMethod = document.getElementById(`${PREFIX}shipping-method-input`).value.trim();
        const payload = {
            "location_ids": [externalId],
            "shipping_method": shippingMethod
        };

        const currentUrl = window.location.href;
        const deleteEndpoint = determineDeleteEndpoint(currentUrl, shippingMethod);
        if (!deleteEndpoint) return;

        const privateKey = unsafeWindow.privateKeyBase64;
        if (!privateKey) {
            showNotificationModal('Error', 'Authorization token not found.');
            return;
        }

        GM_xmlhttpRequest({
            method: 'POST',
            url: deleteEndpoint,
            headers: {
                'Authorization': `Bearer ${privateKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            data: JSON.stringify(payload),
            onload: function(response) {
                if (response.status === 200 || response.status === 204) {
                    showNotificationModal('Success', 'Pickup point deleted successfully.');
                    removeLocationCard(externalId);
                } else {
                    showNotificationModal('Error', `Failed to delete. Status: ${response.status} - ${response.statusText}`);
                }
            },
            onerror: function() {
                showNotificationModal('Error', 'Error while deleting the pickup point.');
            }
        });
    }

    function removeLocationCard(externalId) {
        const cards = document.querySelectorAll(`.${PREFIX}location-card`);
        cards.forEach(card => {
            const idElement = card.querySelector(`.${PREFIX}location-id`);
            if (idElement && idElement.innerText.includes(externalId)) {
                card.remove();
            }
        });

        const remainingCards = document.querySelectorAll(`.${PREFIX}location-card`);
        if (remainingCards.length === 0) {
            const container = document.getElementById(`${PREFIX}locations-container`);
            const message = document.createElement('div');
            message.className = `${PREFIX}no-data-message`;
            message.innerText = 'No pickup points available for this shipping method.';
            container.appendChild(message);
            document.getElementById(`${PREFIX}search-filter-section`).style.display = 'none';
        }
    }

    function populateFilterOptions(countries) {
        const filterSelect = document.getElementById(`${PREFIX}filter-select`);
        filterSelect.innerHTML = '<option value="">Filter by Country</option>';
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.text = country;
            filterSelect.appendChild(option);
        });
    }

    // Functions for highlighting
    function removeHighlights(container) {
        const highlighted = container.querySelectorAll('.highlight');
        highlighted.forEach(span => {
            const parent = span.parentNode;
            parent.replaceChild(document.createTextNode(span.textContent), span);
        });
    }

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function highlightMatches(container, searchTerm) {
        if (!searchTerm) return;

        const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');

        function highlightNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue;
                let lastIndex = 0;
                let hasMatch = false;
                const fragment = document.createDocumentFragment();

                text.replace(regex, (match, p1, offset) => {
                    hasMatch = true;
                    // Append any text before this match
                    if (offset > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
                    }
                    // Create highlighted span for the matched text
                    const highlightSpan = document.createElement('span');
                    highlightSpan.className = 'highlight';
                    highlightSpan.textContent = match;
                    fragment.appendChild(highlightSpan);

                    lastIndex = offset + match.length;
                    return match;
                });

                // Append any remaining text after the last match
                if (lastIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                }

                // Only replace if we had at least one match
                if (hasMatch) {
                    node.parentNode.replaceChild(fragment, node);
                }

            } else if (node.nodeType === Node.ELEMENT_NODE && node.childNodes) {
                const children = Array.from(node.childNodes);
                children.forEach(child => highlightNode(child));
            }
        }

        highlightNode(container);
    }

    function filterLocations() {
        const searchValue = document.getElementById(`${PREFIX}search-input`).value.trim().toLowerCase();
        const filterValue = document.getElementById(`${PREFIX}filter-select`).value.trim().toLowerCase();

        currentSearchTerm = document.getElementById(`${PREFIX}search-input`).value.trim();

        const container = document.getElementById(`${PREFIX}locations-container`);
        const cards = container.querySelectorAll(`.${PREFIX}location-card`);
        let visibleCount = 0;

        cards.forEach(card => {
            const cardText = card.textContent.toLowerCase();
            const matchesSearch = searchValue === '' || cardText.includes(searchValue);
            const matchesFilter = filterValue === '' || cardText.includes(filterValue);

            if (matchesSearch && matchesFilter) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        let noDataMessage = container.querySelector(`.${PREFIX}no-data-message`);
        if (visibleCount === 0) {
            if (!noDataMessage) {
                noDataMessage = document.createElement('div');
                noDataMessage.className = `${PREFIX}no-data-message`;
                noDataMessage.innerText = 'No pickup points match your search criteria.';
                container.appendChild(noDataMessage);
            }
        } else {
            if (noDataMessage) {
                noDataMessage.remove();
            }
        }

        // Remove old highlights
        removeHighlights(container);

        // Re-apply highlights if there's a current search term
        if (currentSearchTerm) {
            highlightMatches(container, currentSearchTerm);
        }
    }

    function attachSearchAndFilterListeners() {
        const searchInput = document.getElementById(`${PREFIX}search-input`);
        const filterSelect = document.getElementById(`${PREFIX}filter-select`);

        if (searchInput && filterSelect) {
            searchInput.addEventListener('input', filterLocations);
            filterSelect.addEventListener('change', filterLocations);
        }
    }

    window.addEventListener('triggerShowPickupPointsICS', function() {
        showModal();
    }, false);

})();
