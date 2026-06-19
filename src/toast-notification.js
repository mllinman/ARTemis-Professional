/**
 * ARTemis Professional — Toast Notification System
 * 
 * Replaces alert()/prompt() with modern, non-blocking toast notifications.
 * Provides info, success, warning, and error notifications with auto-dismiss.
 */

class ToastNotification {
    constructor() {
        this.container = null;
        this.queue = [];
        this.maxVisible = 5;
        this.defaultDuration = 4000;
        this._init();
    }

    _init() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.setAttribute('role', 'alert');
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(this.container);

        // Inject styles
        const style = document.createElement('style');
        style.textContent = `
            #toast-container {
                position: fixed;
                top: 60px;
                right: 16px;
                z-index: 100000;
                display: flex;
                flex-direction: column;
                gap: 8px;
                pointer-events: none;
                max-width: 420px;
            }

            .toast {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 12px 16px;
                border-radius: 8px;
                color: #fff;
                font-size: 13px;
                line-height: 1.4;
                pointer-events: auto;
                cursor: pointer;
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.1);
                transform: translateX(120%);
                opacity: 0;
                transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
                border: 1px solid rgba(255, 255, 255, 0.08);
                max-width: 100%;
                word-wrap: break-word;
            }

            .toast.visible {
                transform: translateX(0);
                opacity: 1;
            }

            .toast.removing {
                transform: translateX(120%);
                opacity: 0;
                transition: transform 0.3s ease-in, opacity 0.2s ease;
            }

            .toast-info {
                background: rgba(14, 99, 156, 0.92);
                border-color: rgba(14, 99, 156, 0.3);
            }

            .toast-success {
                background: rgba(34, 139, 34, 0.92);
                border-color: rgba(34, 139, 34, 0.3);
            }

            .toast-warning {
                background: rgba(204, 136, 0, 0.92);
                border-color: rgba(204, 136, 0, 0.3);
            }

            .toast-error {
                background: rgba(204, 51, 51, 0.92);
                border-color: rgba(204, 51, 51, 0.3);
            }

            .toast-icon {
                font-size: 18px;
                flex-shrink: 0;
                margin-top: 1px;
            }

            .toast-content {
                flex: 1;
                min-width: 0;
            }

            .toast-title {
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 2px;
            }

            .toast-message {
                font-size: 12px;
                opacity: 0.9;
            }

            .toast-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.6);
                cursor: pointer;
                font-size: 16px;
                padding: 0 2px;
                flex-shrink: 0;
                transition: color 0.15s;
                line-height: 1;
            }

            .toast-close:hover {
                color: #fff;
            }

            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 0 0 8px 8px;
                transition: width linear;
            }

            @media (prefers-reduced-motion: reduce) {
                .toast {
                    transform: none;
                    transition: opacity 0.01ms;
                }
                .toast.removing {
                    transform: none;
                    transition: opacity 0.01ms;
                }
                .toast-progress {
                    transition: none;
                }
            }

            @media (max-width: 480px) {
                #toast-container {
                    right: 8px;
                    left: 8px;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Show a toast notification
     * @param {string} message - Main message text
     * @param {Object} options - Configuration options
     * @param {'info'|'success'|'warning'|'error'} options.type - Toast type
     * @param {string} options.title - Optional title
     * @param {number} options.duration - Auto-dismiss duration in ms (0 = persistent)
     * @param {Function} options.onClick - Click callback
     * @returns {HTMLElement} The toast element
     */
    show(message, options = {}) {
        const {
            type = 'info',
            title = '',
            duration = this.defaultDuration,
            onClick = null,
        } = options;

        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.position = 'relative';
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${this._escapeHtml(title)}</div>` : ''}
                <div class="toast-message">${this._escapeHtml(message)}</div>
            </div>
            <button class="toast-close" aria-label="Dismiss notification">&times;</button>
            ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
        `;

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this._dismiss(toast);
        });

        // Click handler
        if (onClick) {
            toast.addEventListener('click', onClick);
            toast.style.cursor = 'pointer';
        } else {
            toast.addEventListener('click', () => this._dismiss(toast));
        }

        // Add to container
        this.container.appendChild(toast);

        // Animate in (next frame for CSS transition)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('visible');
            });
        });

        // Progress bar and auto-dismiss
        if (duration > 0) {
            const progress = toast.querySelector('.toast-progress');
            if (progress) {
                progress.style.width = '100%';
                requestAnimationFrame(() => {
                    progress.style.transitionDuration = `${duration}ms`;
                    progress.style.width = '0%';
                });
            }
            toast._timeout = setTimeout(() => this._dismiss(toast), duration);
        }

        // Limit visible toasts
        const toasts = this.container.querySelectorAll('.toast:not(.removing)');
        if (toasts.length > this.maxVisible) {
            this._dismiss(toasts[0]);
        }

        return toast;
    }

    _dismiss(toast) {
        if (toast._dismissed) return;
        toast._dismissed = true;

        if (toast._timeout) {
            clearTimeout(toast._timeout);
        }

        toast.classList.remove('visible');
        toast.classList.add('removing');

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 350);
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Convenience methods
    info(message, title = '') { return this.show(message, { type: 'info', title }); }
    success(message, title = '') { return this.show(message, { type: 'success', title }); }
    warning(message, title = '') { return this.show(message, { type: 'warning', title }); }
    error(message, title = '') { return this.show(message, { type: 'error', title, duration: 6000 }); }
}

// Create global instance
const toast = new ToastNotification();
window.toast = toast;
