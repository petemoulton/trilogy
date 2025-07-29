/**
 * Utilities - Helper functions and common utilities
 * Provides reusable utility functions for the dashboard
 */

class DashboardUtils {
    constructor() {
        console.log('[Trilogy] Dashboard Utils initialized');
    }

    /**
     * Format timestamp to readable string
     * @param {Date|string|number} timestamp - Timestamp to format
     * @returns {string} Formatted time string
     */
    formatTime(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString();
        } catch (error) {
            console.error('[Trilogy] Error formatting time:', error);
            return 'Invalid time';
        }
    }

    /**
     * Format date to readable string
     * @param {Date|string|number} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        try {
            const dateObj = new Date(date);
            return dateObj.toLocaleDateString();
        } catch (error) {
            console.error('[Trilogy] Error formatting date:', error);
            return 'Invalid date';
        }
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.error('[Trilogy] Error cloning object:', error);
            return null;
        }
    }

    /**
     * Check if element is visible in viewport
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if element is visible
     */
    isElementVisible(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Scroll element into view smoothly
     * @param {string|HTMLElement} element - Element or element ID to scroll to
     */
    scrollToElement(element) {
        let targetElement = element;
        
        if (typeof element === 'string') {
            targetElement = document.getElementById(element);
        }
        
        if (targetElement && targetElement.scrollIntoView) {
            targetElement.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    /**
     * Generate random ID
     * @param {number} length - Length of ID
     * @returns {string} Random ID string
     */
    generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Sanitize HTML string
     * @param {string} html - HTML string to sanitize
     * @returns {string} Sanitized HTML string
     */
    sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }

    /**
     * Format number with commas
     * @param {number} num - Number to format
     * @returns {string} Formatted number string
     */
    formatNumber(num) {
        try {
            return num.toLocaleString();
        } catch (error) {
            console.error('[Trilogy] Error formatting number:', error);
            return num.toString();
        }
    }

    /**
     * Calculate percentage
     * @param {number} value - Current value
     * @param {number} total - Total value
     * @returns {number} Percentage (0-100)
     */
    calculatePercentage(value, total) {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substr(0, maxLength - 3) + '...';
    }

    /**
     * Check if string is valid JSON
     * @param {string} str - String to validate
     * @returns {boolean} True if valid JSON
     */
    isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get URL parameters as object
     * @returns {Object} URL parameters object
     */
    getUrlParameters() {
        const params = {};
        const urlParams = new URLSearchParams(window.location.search);
        for (const [key, value] of urlParams) {
            params[key] = value;
        }
        return params;
    }

    /**
     * Set URL parameter without page reload
     * @param {string} key - Parameter key
     * @param {string} value - Parameter value
     */
    setUrlParameter(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.pushState({}, '', url);
    }

    /**
     * Remove URL parameter without page reload
     * @param {string} key - Parameter key to remove
     */
    removeUrlParameter(key) {
        const url = new URL(window.location);
        url.searchParams.delete(key);
        window.history.pushState({}, '', url);
    }

    /**
     * Log with timestamp
     * @param {string} message - Message to log
     * @param {string} level - Log level (info, warn, error)
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [Trilogy] ${message}`;
        
        switch (level) {
            case 'warn':
                console.warn(logMessage);
                break;
            case 'error':
                console.error(logMessage);
                break;
            default:
                console.log(logMessage);
        }
    }
}

// Create global instance
window.DashboardUtils = new DashboardUtils();