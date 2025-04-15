// ==UserScript==
// @name         Launchpad
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Displays a sleek Launchpad-style modal with specific buttons, each triggering custom events, and includes a tracking notice.
// @author       julpif
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @connect      script.googleusercontent.com
// @connect      script.google.com
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Launchpad.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Launchpad.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- START: Usage Tracking ---
    const trackingWebAppUrl = 'https://script.google.com/a/macros/ingrid.com/s/AKfycbysOaMKrLW4G7ZtwgsBtF_xEUr19gsJjN_Pewp9aFVH4Z2jDdJwBWDECuUabYADO8zpXA/exec';

    function sendTrackingPing(appName) {
        if (!trackingWebAppUrl || trackingWebAppUrl.includes('YOUR_WEB_APP_URL_HERE')) {
            console.error('Launchpad Tracking: Invalid Web App URL configured.');
            return;
        }

        const payload = {
            scriptVersion: GM_info.script.version || 'Unknown',
            userAgent: navigator.userAgent || 'Unknown',
            clickedApp: appName || 'Unknown'
        };

        GM_xmlhttpRequest({
            method: 'POST',
            url: trackingWebAppUrl,
            data: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000,
            onload: function(response) { /* Optional success log */ },
            onerror: function(response) {
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

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'sl-launchpad-modal-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: '99999', opacity: '0', transition: 'opacity 0.5s ease',
            overflowX: 'hidden'
        });

        // Create modal container
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
            appButton.setAttribute('aria-label', app.name);
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
                appButton.style.background = '#121a30';
            });
            appButton.addEventListener('mouseout', () => {
                appButton.style.transform = 'scale(1)';
                appButton.style.boxShadow = 'none';
                appButton.style.background = '#16213e';
            });
            // Button actions
            appButton.addEventListener('click', () => {
                sendTrackingPing(app.name); // Send tracking ping
                window.dispatchEvent(new Event(app.triggerEvent)); // Trigger original event
                removeModal(); // Optionally close the modal
            });
            grid.appendChild(appButton);
        });

        modal.appendChild(grid); // Add the grid to the modal

        // --- START: Add Tracking Disclaimer ---
        const trackingDisclaimer = document.createElement('p');
        trackingDisclaimer.id = 'sl-tracking-disclaimer';
        trackingDisclaimer.textContent = 'Usage of these tools is tracked anonymously for improvement purposes.';
        Object.assign(trackingDisclaimer.style, {
            fontSize: '12px',
            color: '#ccc', // Light grey color for less prominence
            marginTop: '20px', // Add some space above the text
            marginBottom: '0', // Remove default bottom margin if needed
            textAlign: 'center'
        });
        modal.appendChild(trackingDisclaimer); // Add the disclaimer below the grid
        // --- END: Add Tracking Disclaimer ---

        overlay.appendChild(modal); // Add the modal to the overlay
        document.body.appendChild(overlay); // Add the overlay to the page

        // Fade in overlay
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);

        // Close modal listeners
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
        font-size: 32px;
        margin-bottom: 8px;
        line-height: 1;
        color: #fff;
    }
    .sl-app-label {
        font-size: 14px;
        color: #fff;
        white-space: normal;
    }
    .sl-app-button:focus {
        outline: none;
    }
    /* Optional: Style for the disclaimer if needed */
    #sl-tracking-disclaimer {
        /* Styles are currently inline, but could be moved here */
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
