// ==UserScript==
// @name         IMP Extra Button
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds an "IMP Extra" button to trigger the Launchpad modal on specific URLs. The button is positioned at 90% of the window's width and appears behind any modals triggered by other scripts.
// @author       julpif
// @match        https://mad-stage.ingrid.com/*
// @match        https://mad.ingrid.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/IMP%20Extra%20Button.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/IMP%20Extra%20Button.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Function to inject Font Awesome CSS if not already present
    function injectFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const faLink = document.createElement('link');
            faLink.rel = 'stylesheet';
            faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            faLink.integrity = 'sha512-pap6VlCdWyS+cj91Vp4Ka5/8lkcPljL5L8mHdD0RexKbWdNcM24N9xXkDJiZypzbKj4UlTzlN5DlF0/9eVJpwg==';
            faLink.crossOrigin = 'anonymous';
            faLink.referrerPolicy = 'no-referrer';
            document.head.appendChild(faLink);
        }
    }

    // Function to inject custom CSS for the IMP Extra button
    function injectCustomStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* IMP Extra Button Styles */
            #imp-extra-button {
                position: fixed;
                left: 90%;
                bottom: 20px;
                transform: translateX(-50%);
                background: #16213e;
                color: #fff;
                border: none;
                border-radius: 15px;
                padding: 10px 20px;
                cursor: pointer;
                font-size: 14px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                transition: transform 0.3s, box-shadow 0.3s, background 0.3s;
                z-index: 90000; /* Set below common modal z-indexes like 99999 */
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px; /* Space between icon and text */
                pointer-events: auto; /* Ensure the button is clickable */
            }

            /* Hover Effects */
            #imp-extra-button:hover {
                transform: translateX(-50%) scale(1.05);
                box-shadow: 0 8px 20px rgba(0,0,0,0.3);
                background: #121a30;
            }

            /* Icon Styles */
            #imp-extra-button .imp-icon {
                font-size: 16px; /* Adjust icon size as needed */
                color: #fff;
            }
        `;
        document.head.appendChild(style);
    }

    // Function to create and append the IMP Extra button to the DOM
    function createImpExtraButton() {
        // Prevent multiple buttons
        if (document.getElementById('imp-extra-button')) return;

        // Create button element
        const button = document.createElement('button');
        button.id = 'imp-extra-button';

        // Optional: Add an icon using Font Awesome
        button.innerHTML = `
            <i class="fa-solid fa-rocket imp-icon"></i>
            <span>IMP Extra</span>
        `;

        // Click event to dispatch the custom event for Launchpad modal
        button.addEventListener('click', () => {
            window.dispatchEvent(new Event('triggerSleekLaunchpadModal'));
        });

        // Append the button to the body
        document.body.appendChild(button);
    }

    // Initialize the script after the DOM is fully loaded
    function init() {
        injectFontAwesome();
        injectCustomStyles();
        createImpExtraButton();
    }

    // Listen for the DOMContentLoaded event to ensure the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
