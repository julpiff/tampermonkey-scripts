// ==UserScript==
// @name         Launchpad
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Displays a sleek Launchpad-style modal with specific buttons, each triggering custom events.
// @author       julpif
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @connect      script.google.com
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Launchpad.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Launchpad.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- START: Usage Tracking ---
    const trackingWebAppUrl = 'https://script.google.com/a/macros/ingrid.com/s/AKfycbysOaMKrLW4G7ZtwgsBtF_xEUr19gsJjN_Pewp9aFVH4Z2jDdJwBWDECuUabYADO8zpXA/exec';

    // Function to send tracking data when a button is clicked
    function sendTrackingPing(appName) {
        if (!trackingWebAppUrl || trackingWebAppUrl.includes('YOUR_WEB_APP_URL_HERE')) {
            // Avoid logging errors if the URL isn't properly set,
            // though it should be correct now.
            console.error('Launchpad Tracking: Invalid Web App URL configured.');
            return;
        }

        const payload = {
            scriptVersion: GM_info.script.version || 'Unknown',
            userAgent: navigator.userAgent || 'Unknown',
            clickedApp: appName || 'Unknown' // Include the name of the clicked app
        };

        // Optional: Log for debugging purposes
        // console.log('Launchpad Tracking: Sending ping for app:', appName, payload);

        GM_xmlhttpRequest({
            method: 'POST',
            url: trackingWebAppUrl,
            data: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json'
                // Note: No 'Authorization' header needed for Apps Script deployed with "Anyone" access
            },
            timeout: 15000, // 15 seconds timeout
            onload: function(response) {
                // Optional: Log success only if needed for debugging
                // console.log('Launchpad Tracking: Ping successful for', appName, response.status);
            },
            onerror: function(response) {
                // Log errors if the request fails (e.g., network issue, Apps Script error, incorrect deployment)
                console.error('Launchpad Tracking: Ping error for', appName, response.status, response.statusText, response.responseText);
            },
            ontimeout: function() {
                console.error('Launchpad Tracking: Ping timed out for', appName);
            }
        });
    }
    // --- END: Usage Tracking ---


    // Function to inject Font Awesome CSS
    function injectFontAwesome() {
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        faLink.integrity = 'sha512-pap6VlCdWyS+cj91Vp4Ka5/8lkcPljL5L8mHdD0RexKbWdNcM24N9xXkDJiZypzbKj4UlTzlN5DlF0/9eVJpwg==';
        faLink.crossOrigin = 'anonymous';
        faLink.referrerPolicy = 'no-referrer';
        document.head.appendChild(faLink);
    }

    // Function to create and display the modal
    function showModal() {
        // Prevent multiple modals
        if (document.getElementById('sl-launchpad-modal-overlay')) return;

        // Inject Font Awesome if not already present
        if (!document.querySelector('link[href*="font-awesome"]')) {
            injectFontAwesome();
        }

        // Create overlay with darker blur effect and prevent horizontal scroll
        const overlay = document.createElement('div');
        overlay.id = 'sl-launchpad-modal-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: '99999', opacity: '0', transition: 'opacity 0.5s ease',
            overflowX: 'hidden'
        });

        // Create modal container with navy blue background
        const modal = document.createElement('div');
        Object.assign(modal.style, {
            padding: '20px', borderRadius: '20px', textAlign: 'center',
            width: '90%', maxWidth: '608px', maxHeight: '80%',
            overflowY: 'auto', transform: 'scale(0.8)', opacity: '0',
            animation: 'sl-zoomIn 0.6s forwards'
        });

        // Create grid container for app buttons
        const grid = document.createElement('div');
        grid.className = 'sl-grid-container';
        Object.assign(grid.style, {
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '20px', justifyItems: 'center', alignItems: 'center', marginTop: '10px'
        });

        // Define the specific apps
        const apps = [
            { name: 'ICS Management', icon: '<i class="fa-solid fa-store"></i>', triggerEvent: 'triggerICSManagement', useImage: false },
            { name: 'Carrier Addons', icon: '<i class="fa-solid fa-puzzle-piece"></i>', triggerEvent: 'carrieraddons', useImage: false },
            { name: 'Json Editor', icon: '<i class="fa-solid fa-terminal"></i>', triggerEvent: 'openJsonEditor', useImage: true },
            { name: 'Address Form Configurations', icon: '<i class="fa-solid fa-address-book"></i>', triggerEvent: 'openAfceEditor', useImage: false },
            { name: 'Custom Shipping Options', icon: '<i class="fa-solid fa-truck-fast"></i>', triggerEvent: 'openCSOBuilder', useImage: false },
            { name: 'Custom Booking Methods', icon: '<i class="fa-solid fa-barcode"></i>', triggerEvent: 'openCBMBuilder', useImage: false },
            { name: 'Number Series', icon: '<i class="fa-solid fa-arrow-up-9-1"></i>', triggerEvent: 'numberSeriesManager', useImage: false }
        ];

        apps.forEach((app, index) => {
            const appButton = document.createElement('button');
            appButton.className = 'sl-app-button';
            appButton.setAttribute('aria-label', app.name); // Accessibility

            // Ensure the label is below the icon
            appButton.innerHTML = `<span class="sl-app-icon">${app.icon}</span><span class="sl-app-label">${app.name}</span>`;

            Object.assign(appButton.style, {
                width: '125px', height: '125px', background: '#16213e', border: 'none',
                borderRadius: '15px', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                transition: 'transform 0.3s, box-shadow 0.3s, background 0.3s',
                opacity: '0', transform: 'scale(0.5)', animation: `sl-fadeInScale 0.2s forwards`,
                animationDelay: `${index * 0.1}s`, pointerEvents: 'auto'
            });

            // Hover effects
            appButton.addEventListener('mouseover', () => {
                appButton.style.transform = 'scale(1.1)';
                appButton.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                appButton.style.background = '#121a30'; // Slightly lighter on hover
            });
            appButton.addEventListener('mouseout', () => {
                appButton.style.transform = 'scale(1)';
                appButton.style.boxShadow = 'none';
                appButton.style.background = '#16213e'; // Original color
            });

            // Button actions
            appButton.addEventListener('click', () => {
                // --- >>> CALL TRACKING PING HERE <<< ---
                sendTrackingPing(app.name); // Pass the name of the clicked app

                // Trigger the original event
                window.dispatchEvent(new Event(app.triggerEvent));
                removeModal(); // Optionally close the modal after triggering
            });

            grid.appendChild(appButton);
        });

        modal.appendChild(grid);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Fade in overlay
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);

        // Close modal when clicking outside or pressing Escape
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) removeModal();
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') removeModal();
        }, { once: true });
    }

    // Function to remove the modal
    function removeModal() {
        const overlay = document.getElementById('sl-launchpad-modal-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                overlay.remove();
            }, 500);
        }
    }

    // Inject CSS for animations and additional styles
    const style = document.createElement('style');
    style.textContent = `
    @keyframes sl-zoomIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
    @keyframes sl-fadeInScale {
        from { transform: scale(0.5); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
    .sl-app-icon {
        font-size: 32px; /* Adjusted for larger buttons */
        margin-bottom: 8px; /* Increased margin for better spacing */
        line-height: 1;
        color: #fff; /* White color for contrast against dark button background */
    }
    .sl-app-label {
        font-size: 14px; /* Increased font size for better readability */
        color: #fff; /* White color for contrast against dark button background */
        white-space: normal; /* Allow text to wrap if necessary */
    }
    .sl-app-button:focus {
        outline: none;
    }
    /* Prevent horizontal scroll on body when modal is open */
    body.modal-open {
        overflow-x: hidden;
    }
    `;
    document.head.appendChild(style);

    // Listen for custom event to trigger modal
    window.addEventListener('triggerSleekLaunchpadModal', showModal, false);

})(); // End of the main IIFE
