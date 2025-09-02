/**
 * UI Components for Todo App
 * Handles modal, toast, and other UI components
 */

const UIComponents = {
    /**
     * Show confirmation modal
     */
    showModal(elements, title, message, onConfirm) {
        const modal = elements.modal;
        const overlay = modal.querySelector('.modal-overlay');
        const titleEl = modal.querySelector('#modal-title');
        const descEl = modal.querySelector('#modal-description');
        const cancelBtn = modal.querySelector('#modal-cancel');
        const confirmBtn = modal.querySelector('#modal-confirm');
        
        titleEl.textContent = title;
        descEl.textContent = message;
        
        // Remove old event listeners
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newConfirmBtn = confirmBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Add new event listeners
        newCancelBtn.addEventListener('click', () => this.hideModal(elements));
        newConfirmBtn.addEventListener('click', () => {
            onConfirm();
            this.hideModal(elements);
        });
        
        // Show modal
        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');
        newConfirmBtn.focus();
        
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
    },

    /**
     * Hide confirmation modal
     */
    hideModal(elements) {
        const modal = elements.modal;
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    },

    /**
     * Show toast notification
     */
    showToast(elements, message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        const icon = Utils.getToastIcon(type);
        toast.innerHTML = `
            <div class="toast-content">
                ${icon}
                <span class="toast-message">${Utils.escapeHtml(message)}</span>
                <button class="toast-close" aria-label="Close notification">×</button>
            </div>
        `;
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        // Add to container
        elements.toastContainer.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Auto remove
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
    },

    /**
     * Remove toast notification
     */
    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    },

    /**
     * Show/hide loading state
     */
    showLoading(elements, show) {
        elements.loadingState.style.display = show ? 'flex' : 'none';
        elements.loadingState.setAttribute('aria-hidden', (!show).toString());
    },

    /**
     * Show error message
     */
    showError(elements, message) {
        elements.errorMessage.textContent = message;
        elements.errorMessage.style.display = 'block';
        elements.taskInput.setAttribute('aria-invalid', 'true');
    },

    /**
     * Clear error message
     */
    clearError(elements) {
        elements.errorMessage.textContent = '';
        elements.errorMessage.style.display = 'none';
        elements.taskInput.setAttribute('aria-invalid', 'false');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIComponents;
} else if (typeof window !== 'undefined') {
    window.UIComponents = UIComponents;
}