// ==UserScript==
// @name         Carrier Add-Ons
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Displays carrier add-ons in a modal.
// @author       julpif
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Carrier%20Add-Ons.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Carrier%20Add-Ons.user.js
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Function to display carrier add-ons in a modal.
     * @param {Array} addons - Array of carrier add-ons data.
     * @param {string} searchTerm - Optional search term to highlight.
     */
    function displayCarrierAddOns(addons, searchTerm = "") {
        // Create overlay
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            zIndex: "10000",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            animation: "fadeIn 0.3s ease",
            boxSizing: "border-box",
            overflow: "hidden"
        });

        // Create modal container
        const modal = document.createElement("div");
        Object.assign(modal.style, {
            backgroundColor: "#fff",
            padding: "0",
            borderRadius: "12px",
            width: "80%",
            maxHeight: "80%",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            position: "relative",
            animation: "slideIn 0.3s ease",
            boxSizing: "border-box",
            overflow: "hidden"
        });

        // Create header
        const header = document.createElement("div");
        Object.assign(header.style, {
            backgroundColor: "#000",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "12px 12px 0 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flex: "none"
        });

        const title = document.createElement("h2");
        title.textContent = "Carrier Add-Ons";
        Object.assign(title.style, {
            margin: "0",
            fontSize: "18px",
            color: "#fff"
        });

        const closeButton = document.createElement("span");
        closeButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
                <line x1="8" y1="8" x2="16" y2="16" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <line x1="16" y1="8" x2="8" y2="16" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
        Object.assign(closeButton.style, {
            cursor: "pointer",
            display: "flex",
            alignItems: "center"
        });
        closeButton.addEventListener("click", closeModal);

        header.appendChild(title);
        header.appendChild(closeButton);

        // Create search and filter section
        const searchFilterContainer = document.createElement("div");
        Object.assign(searchFilterContainer.style, {
            display: "flex",
            justifyContent: "space-between",
            margin: "15px 20px",
            flex: "none"
        });

        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Search add-ons...";
        Object.assign(searchInput.style, {
            padding: "10px",
            width: "48%",
            boxSizing: "border-box",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "16px"
        });

        const carrierSelect = document.createElement("select");
        Object.assign(carrierSelect.style, {
            padding: "10px",
            width: "48%",
            boxSizing: "border-box",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "16px"
        });

        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "All Carriers";
        carrierSelect.appendChild(allOption);

        const uniqueCarriers = Array.from(new Set(addons.map(addon => addon.carrier)));
        uniqueCarriers.forEach(carrier => {
            const option = document.createElement("option");
            option.value = carrier;
            option.textContent = carrier.toUpperCase();
            carrierSelect.appendChild(option);
        });

        searchFilterContainer.appendChild(searchInput);
        searchFilterContainer.appendChild(carrierSelect);

        // Create content container
        const contentContainer = document.createElement("div");
        Object.assign(contentContainer.style, {
            padding: "0 20px 20px 20px",
            boxSizing: "border-box",
            flex: "1",
            overflowY: "auto"
        });

        // Function to escape HTML
        function escapeHTML(str) {
            const escapeMap = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };
            return str.replace(/[&<>"']/g, match => escapeMap[match]);
        }

        // Function to highlight search term
        function highlightTerm(text, term) {
            if (!term) return escapeHTML(text);
            const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return escapeHTML(text).replace(regex, '<span style="background-color: yellow;">$1</span>');
        }

        /**
         * Render the add-ons based on filters.
         * @param {Array} filteredAddons - Array of filtered add-ons.
         * @param {string} term - Search term for highlighting.
         */
        function renderAddOns(filteredAddons, term) {
            contentContainer.innerHTML = "";
            const groupedAddons = {};

            filteredAddons.forEach(addon => {
                if (!groupedAddons[addon.carrier]) {
                    groupedAddons[addon.carrier] = [];
                }
                groupedAddons[addon.carrier].push(addon);
            });

            for (const carrier in groupedAddons) {
                const carrierSection = document.createElement("div");
                carrierSection.style.marginBottom = "20px";

                const carrierTitle = document.createElement("h3");
                carrierTitle.textContent = carrier.toUpperCase();
                Object.assign(carrierTitle.style, {
                    borderBottom: "2px solid #000",
                    paddingBottom: "5px",
                    display: "flex",
                    alignItems: "center",
                    fontSize: "18px",
                    margin: "10px 0"
                });

                carrierSection.appendChild(carrierTitle);

                groupedAddons[carrier].forEach(addon => {
                    const addonContainer = document.createElement("div");
                    Object.assign(addonContainer.style, {
                        border: "1px solid #ddd",
                        padding: "15px",
                        borderRadius: "6px",
                        margin: "10px 0",
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: "#f9f9f9",
                        transition: "transform 0.2s",
                        boxSizing: "border-box"
                    });

                    addonContainer.onmouseover = () => {
                        addonContainer.style.transform = "scale(1.02)";
                    };
                    addonContainer.onmouseout = () => {
                        addonContainer.style.transform = "scale(1)";
                    };

                    const addonName = document.createElement("strong");
                    addonName.innerHTML = highlightTerm(addon.name || "N/A", term);
                    Object.assign(addonName.style, { fontSize: "18px" });

                    const addonDescription = document.createElement("p");
                    addonDescription.innerHTML = `<strong>Description:</strong> ${highlightTerm(addon.description || "No description available.", term)}`;
                    Object.assign(addonDescription.style, { margin: "10px 0" });

                    const addonDetails = document.createElement("div");
                    Object.assign(addonDetails.style, { fontSize: "14px", color: "#555" });

                    const addonCode = document.createElement("span");
                    addonCode.innerHTML = `<strong>Code:</strong> ${highlightTerm(addon.code || "N/A", term)}`;
                    Object.assign(addonCode.style, { display: "block", marginBottom: "5px" });

                    const shippingMethods = document.createElement("span");
                    const shippingMethodsText = Array.isArray(addon.shipping_methods) ? addon.shipping_methods.map(method => highlightTerm(method, term)).join(", ") : "N/A";
                    shippingMethods.innerHTML = `<strong>Shipping Methods:</strong> ${shippingMethodsText}`;
                    shippingMethods.style.display = "block";

                    addonDetails.appendChild(addonCode);
                    addonDetails.appendChild(shippingMethods);

                    addonContainer.appendChild(addonName);
                    addonContainer.appendChild(addonDescription);
                    addonContainer.appendChild(addonDetails);

                    carrierSection.appendChild(addonContainer);
                });

                contentContainer.appendChild(carrierSection);
            }
        }

        // Initial render
        renderAddOns(addons, searchTerm);

        // Search and filter functionality with debounce
        let debounceTimeout;
        function handleFilter() {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const searchValue = searchInput.value.toLowerCase();
                const selectedCarrier = carrierSelect.value;
                const filtered = addons.filter(addon => {
                    const matchesSearch =
                        (addon.name && addon.name.toLowerCase().includes(searchValue)) ||
                        (addon.description && addon.description.toLowerCase().includes(searchValue)) ||
                        (addon.code && addon.code.toLowerCase().includes(searchValue)) ||
                        (addon.carrier && addon.carrier.toLowerCase().includes(searchValue)) ||
                        (Array.isArray(addon.shipping_methods) && addon.shipping_methods.some(method => method.toLowerCase().includes(searchValue)));
                    const matchesCarrier = selectedCarrier === "all" || addon.carrier === selectedCarrier;
                    return matchesSearch && matchesCarrier;
                });
                renderAddOns(filtered, searchValue);
            }, 300);
        }

        searchInput.addEventListener("input", handleFilter);
        carrierSelect.addEventListener("change", handleFilter);

        // Append elements
        modal.appendChild(header);
        modal.appendChild(searchFilterContainer);
        modal.appendChild(contentContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Close modal on overlay click or Escape key
        function closeModal() {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            document.removeEventListener("keydown", handleKeyDown);
        }

        function handleKeyDown(e) {
            if (e.key === "Escape") {
                closeModal();
            }
        }

        overlay.addEventListener("click", function(e) {
            if (e.target === overlay) {
                closeModal();
            }
        });

        document.addEventListener("keydown", handleKeyDown);

        // Inject CSS animations and scrollbar styles
        const style = document.createElement("style");
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            /* Custom scrollbar to match rounded corners */
            div::-webkit-scrollbar {
                width: 8px;
            }
            div::-webkit-scrollbar-track {
                background: transparent;
            }
            div::-webkit-scrollbar-thumb {
                background-color: rgba(0,0,0,0.2);
                border-radius: 4px;
            }
            /* Bold labels */
            strong {
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Function to fetch carrier add-ons and trigger display.
     */
    function fetchAndDisplayCarrierAddOns() {
        try {
            const currentUrl = window.location.href;
            let apiUrl = "";

            if (currentUrl.startsWith("https://mad-stage.ingrid.com/")) {
                apiUrl = "https://api-stage.ingrid.com/v1/config/carrieraddons.get";
            } else if (currentUrl.startsWith("https://mad.ingrid.com/")) {
                apiUrl = "https://api.ingrid.com/v1/config/carrieraddons.get";
            } else {
                alert("This script can only be used on mad.ingrid.com or mad-stage.ingrid.com.");
                return;
            }

            const authToken = window.authToken;
            if (!authToken) {
                alert("Authentication token (window.authToken) not found.");
                return;
            }

            fetch(apiUrl, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok. Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.addons) {
                    throw new Error("Invalid data format received.");
                }
                displayCarrierAddOns(data.addons);
            })
            .catch(error => {
                alert(`Error fetching data: ${error.message}`);
            });
        } catch (error) {
            alert(`An unexpected error occurred: ${error.message}`);
        }
    }

    /**
     * Event listener for the "carrieraddons" event.
     */
    window.addEventListener("carrieraddons", fetchAndDisplayCarrierAddOns);

    // Optionally, you can also trigger the function immediately or based on other conditions.
    // For example, uncomment the line below to run on page load:
    // fetchAndDisplayCarrierAddOns();

})();
