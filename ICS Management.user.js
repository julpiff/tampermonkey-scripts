// ==UserScript==
// @name         ICS Management
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  ICS Management
// @author       julpif
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/ICS%20Management.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/ICS%20Management.user.js
// ==/UserScript==

(function() {
    'use strict';

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

    // Function to create and display the ICS Management modal
    function showModalICS() {
        // Prevent multiple ICS modals
        if (document.getElementById('ics-modal-overlay')) return;

        // Inject Font Awesome if not already present
        if (!document.querySelector('link[href*="font-awesome"]')) {
            injectFontAwesome();
        }

        // Create overlay with darker blur effect and prevent horizontal scroll
        const overlay = document.createElement('div');
        overlay.id = 'ics-modal-overlay'; // Unique ID
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.7)', // Increased opacity for darker blur
            backdropFilter: 'blur(10px)', // Slightly increased blur radius
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '100000', // Higher than main modal
            opacity: '0',
            transition: 'opacity 0.5s ease',
            overflowX: 'hidden' // Prevent horizontal scroll
        });

        // Create modal container with navy blue background
        const modal = document.createElement('div');
        Object.assign(modal.style, {
            padding: '20px',
            borderRadius: '20px',
            textAlign: 'center',
            width: '90%', // Responsive width
            maxWidth: '600px', // Increased max width to accommodate larger buttons
            maxHeight: '80%',
            overflowY: 'auto',
            transform: 'scale(0.8)',
            opacity: '0',
            animation: 'sl-zoomIn 0.6s forwards'
        });

        // Create grid container for app buttons
        const grid = document.createElement('div');
        grid.className = 'ics-grid-container'; // Unique class
        Object.assign(grid.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', // Adjusted for larger buttons
            gap: '20px',
            justifyItems: 'center',
            alignItems: 'center',
            marginTop: '10px'
        });

        // Define the specific apps
        const apps = [
            {
                name: 'Add ICS',
                icon: '<i class="fa-solid fa-square-plus"></i>',
                triggerEvent: 'triggerAddICSLocationSet',
                useImage: false
            },
            {
                name: 'Delete ICS',
                icon: '<i class="fa-solid fa-trash-can"></i>',
                triggerEvent: 'triggerDeleteICSLocationSet',
                useImage: false
            },
            {
                name: 'Show Pickup Points',
                icon: '<i class="fa-solid fa-store"></i>', // Font Awesome icon
                triggerEvent: 'triggerShowPickupPointsICS',
                useImage: true // Indicates that the icon is an HTML string
            },
            {
                name: 'Import Pickup Points',
                icon: '<i class="fa-solid fa-upload"></i>',
                triggerEvent: 'triggerImportPickupPointsICS',
                useImage: false
            }
        ];

        apps.forEach((app, index) => {
            const appButton = document.createElement('button');
            appButton.className = 'ics-app-button'; // Unique class
            appButton.setAttribute('aria-label', app.name); // Accessibility

            // Ensure the label is below the icon
            appButton.innerHTML = `<span class="ics-app-icon">${app.icon}</span><span class="ics-app-label">${app.name}</span>`;

            Object.assign(appButton.style, {
                width: '120px', // Increased size
                height: '120px', // Increased size
                background: '#16213e', // Semi-transparent black for better contrast
                border: 'none',
                borderRadius: '15px',
                display: 'flex',
                flexDirection: 'column', // Ensure label is below icon
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'transform 0.3s, box-shadow 0.3s, background 0.3s',
                opacity: '0',
                transform: 'scale(0.5)',
                animation: `sl-fadeInScale 0.4s forwards`,
                animationDelay: `${index * 0.1}s`, // Staggered animation
                pointerEvents: 'auto' // Enable interactions on buttons
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

    // Function to remove the ICS modal
    function removeModal() {
        const overlay = document.getElementById('ics-modal-overlay');
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
    .ics-app-icon {
        font-size: 32px; /* Adjusted for larger buttons */
        margin-bottom: 8px; /* Increased margin for better spacing */
        line-height: 1;
        color: #fff; /* White color for contrast against dark button background */
    }
    .ics-app-label {
        font-size: 14px; /* Increased font size for better readability */
        color: #fff; /* White color for contrast against dark button background */
        white-space: normal; /* Allow text to wrap if necessary */
    }
    .ics-app-button:focus {
        outline: none;
    }
    /* Prevent horizontal scroll on body when modal is open */
    body.modal-open {
        overflow-x: hidden;
    }
    `;
    document.head.appendChild(style);

    // Listen for custom event to trigger ICS modal
    window.addEventListener('triggerICSManagement', showModalICS, false);
})();
