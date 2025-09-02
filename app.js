/**
 * Todo List Application
 * A complete task management application with CRUD operations, validation, and error handling
 */

// Utils will be loaded from utils.js

class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.nextId = 1;
        this.isLoading = false;
        
        // DOM elements
        this.elements = {
            taskForm: null,
            taskInput: null,
            tasksList: null,
            emptyState: null,
            loadingState: null,
            taskCount: null,
            completedCount: null,
            pendingCount: null,
            filterBtns: null,
            clearCompleted: null,
            clearAll: null,
            modal: null,
            toastContainer: null,
            errorMessage: null
        };
        
        // Initialize app
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.showLoading(true);
            this.bindElements();
            this.attachEventListeners();
            await this.loadTasks();
            this.render();
            this.showLoading(false);
            this.showToast('Todo app loaded successfully', 'success');
        } catch (error) {
            this.handleError('Failed to initialize app', error);
            this.showLoading(false);
        }
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.elements.taskForm = document.getElementById('task-form');
        this.elements.taskInput = document.getElementById('task-input');
        this.elements.tasksList = document.getElementById('tasks-list');
        this.elements.emptyState = document.getElementById('empty-state');
        this.elements.loadingState = document.getElementById('loading-state');
        this.elements.taskCount = document.getElementById('task-count');
        this.elements.completedCount = document.getElementById('completed-count');
        this.elements.pendingCount = document.getElementById('pending-count');
        this.elements.filterBtns = document.querySelectorAll('.filter-btn');
        this.elements.clearCompleted = document.getElementById('clear-completed');
        this.elements.clearAll = document.getElementById('clear-all');
        this.elements.modal = document.getElementById('confirmation-modal');
        this.elements.toastContainer = document.getElementById('toast-container');
        this.elements.errorMessage = document.getElementById('task-input-error');

        // Validate critical elements exist
        if (!this.elements.taskForm || !this.elements.taskInput || !this.elements.tasksList) {
            throw new Error('Critical DOM elements not found');
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Task form submission
        this.elements.taskForm.addEventListener('submit', (e) => this.handleAddTask(e));
        
        // Task input validation
        this.elements.taskInput.addEventListener('input', () => this.validateTaskInput());
        this.elements.taskInput.addEventListener('blur', () => this.validateTaskInput());
        
        // Filter buttons
        this.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleFilterChange(btn.dataset.filter));
        });
        
        // Clear actions
        this.elements.clearCompleted.addEventListener('click', () => this.handleClearCompleted());
        this.elements.clearAll.addEventListener('click', () => this.handleClearAll());
        
        // Tasks list delegation
        this.elements.tasksList.addEventListener('click', (e) => this.handleTaskAction(e));
        this.elements.tasksList.addEventListener('keydown', (e) => this.handleTaskKeydown(e));
        
        // Modal events
        if (this.elements.modal) {
            this.elements.modal.addEventListener('click', (e) => this.handleModalClick(e));
            document.addEventListener('keydown', (e) => this.handleModalKeydown(e));
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Auto-save on page unload
        window.addEventListener('beforeunload', () => this.saveTasks());
    }

    /**
     * Handle adding a new task
     */
    async handleAddTask(e) {
        e.preventDefault();
        
        const text = this.sanitizeInput(this.elements.taskInput.value.trim());
        
        if (!this.validateTaskInput(text)) {
            this.elements.taskInput.focus();
            return;
        }

        try {
            const task = this.createTask(text);
            this.tasks.unshift(task); // Add to beginning for better UX
            this.elements.taskInput.value = '';
            this.clearError();
            await this.saveTasks();
            this.render();
            this.showToast(`Task "${Utils.truncateText(text, 30)}" added successfully`, 'success');
        } catch (error) {
            this.handleError('Failed to add task', error);
        }
    }

    /**
     * Create a new task object
     */
    createTask(text) {
        return {
            id: this.nextId++,
            text: text,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Validate task input
     */
    validateTaskInput(text = null) {
        const value = text !== null ? text : this.elements.taskInput.value.trim();
        
        // Clear previous error
        this.clearError();
        
        // Check if empty
        if (!value) {
            if (text !== null) { // Only show error if validating on submit
                this.showError('Task cannot be empty');
                return false;
            }
            return true; // Don't show error while typing
        }
        
        // Check length
        if (value.length > 500) {
            this.showError('Task cannot exceed 500 characters');
            return false;
        }
        
        // Check for duplicate
        const isDuplicate = this.tasks.some(task => 
            task.text.toLowerCase() === value.toLowerCase() && !task.completed
        );
        
        if (isDuplicate) {
            this.showError('A similar pending task already exists');
            return false;
        }
        
        return true;
    }

    /**
     * Sanitize user input to prevent XSS
     */
    sanitizeInput(text) {
        return Utils.sanitizeInput(text);
    }

    /**
     * Handle task actions (toggle, edit, delete)
     */
    async handleTaskAction(e) {
        const button = e.target.closest('button');
        if (!button) return;
        
        const taskItem = button.closest('.task-item');
        if (!taskItem) return;
        
        const taskId = parseInt(taskItem.dataset.taskId);
        const action = button.dataset.action;
        
        try {
            switch (action) {
                case 'toggle':
                    await this.toggleTask(taskId);
                    break;
                case 'edit':
                    this.editTask(taskId);
                    break;
                case 'delete':
                    this.confirmDeleteTask(taskId);
                    break;
                case 'save-edit':
                    await this.saveTaskEdit(taskId, button);
                    break;
                case 'cancel-edit':
                    this.cancelTaskEdit(taskId);
                    break;
            }
        } catch (error) {
            this.handleError('Task action failed', error);
        }
    }

    /**
     * Handle keyboard navigation for tasks
     */
    handleTaskKeydown(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        const taskId = parseInt(taskItem.dataset.taskId);
        
        switch (e.key) {
            case 'Enter':
            case ' ':
                if (e.target.classList.contains('task-toggle')) {
                    e.preventDefault();
                    this.toggleTask(taskId);
                }
                break;
            case 'Delete':
            case 'Backspace':
                if (!e.target.classList.contains('task-input')) {
                    e.preventDefault();
                    this.confirmDeleteTask(taskId);
                }
                break;
            case 'Escape':
                this.cancelTaskEdit(taskId);
                break;
        }
    }

    /**
     * Toggle task completion status
     */
    async toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        task.completed = !task.completed;
        task.updatedAt = new Date().toISOString();
        
        await this.saveTasks();
        this.render();
        
        const status = task.completed ? 'completed' : 'pending';
        this.showToast(`Task marked as ${status}`, 'success');
    }

    /**
     * Enter edit mode for a task
     */
    editTask(taskId) {
        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskItem) return;
        
        taskItem.classList.add('editing');
        const input = taskItem.querySelector('.task-input');
        const span = taskItem.querySelector('.task-text');
        
        if (input && span) {
            input.value = span.textContent;
            input.focus();
            input.select();
        }
    }

    /**
     * Save task edit
     */
    async saveTaskEdit(taskId, button) {
        const taskItem = button.closest('.task-item');
        const input = taskItem.querySelector('.task-input');
        const newText = this.sanitizeInput(input.value.trim());
        
        if (!newText) {
            this.showError('Task cannot be empty');
            return;
        }
        
        if (newText.length > 500) {
            this.showError('Task cannot exceed 500 characters');
            return;
        }
        
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.text = newText;
            task.updatedAt = new Date().toISOString();
            taskItem.classList.remove('editing');
            await this.saveTasks();
            this.render();
            this.showToast('Task updated successfully', 'success');
        }
    }

    /**
     * Cancel task edit
     */
    cancelTaskEdit(taskId) {
        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskItem) {
            taskItem.classList.remove('editing');
        }
    }

    /**
     * Confirm task deletion
     */
    confirmDeleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        this.showModal(
            'Delete Task',
            `Are you sure you want to delete "${Utils.truncateText(task.text, 50)}"?`,
            () => this.deleteTask(taskId)
        );
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        const task = this.tasks[taskIndex];
        this.tasks.splice(taskIndex, 1);
        
        await this.saveTasks();
        this.render();
        this.showToast(`Task "${Utils.truncateText(task.text, 30)}" deleted`, 'success');
    }

    /**
     * Handle filter change
     */
    handleFilterChange(filter) {
        this.currentFilter = filter;
        
        // Update button states
        this.elements.filterBtns.forEach(btn => {
            const isActive = btn.dataset.filter === filter;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive.toString());
        });
        
        this.render();
    }

    /**
     * Handle clear completed tasks
     */
    handleClearCompleted() {
        const completedCount = this.tasks.filter(t => t.completed).length;
        if (completedCount === 0) {
            this.showToast('No completed tasks to clear', 'info');
            return;
        }
        
        this.showModal(
            'Clear Completed Tasks',
            `Are you sure you want to delete all ${completedCount} completed tasks?`,
            () => this.clearCompleted()
        );
    }

    /**
     * Clear completed tasks
     */
    async clearCompleted() {
        const initialCount = this.tasks.length;
        this.tasks = this.tasks.filter(t => !t.completed);
        const removedCount = initialCount - this.tasks.length;
        
        await this.saveTasks();
        this.render();
        this.showToast(`${removedCount} completed tasks cleared`, 'success');
    }

    /**
     * Handle clear all tasks
     */
    handleClearAll() {
        if (this.tasks.length === 0) {
            this.showToast('No tasks to clear', 'info');
            return;
        }
        
        this.showModal(
            'Clear All Tasks',
            `Are you sure you want to delete all ${this.tasks.length} tasks? This action cannot be undone.`,
            () => this.clearAll()
        );
    }

    /**
     * Clear all tasks
     */
    async clearAll() {
        const count = this.tasks.length;
        this.tasks = [];
        this.nextId = 1;
        
        await this.saveTasks();
        this.render();
        this.showToast(`All ${count} tasks cleared`, 'success');
    }

    /**
     * Render the application
     */
    render() {
        this.renderTasks();
        this.renderStats();
        this.renderEmptyState();
    }

    /**
     * Render tasks list
     */
    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        
        this.elements.tasksList.innerHTML = '';
        
        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            this.elements.tasksList.appendChild(taskElement);
        });
        
        // Update ARIA attributes
        this.elements.tasksList.setAttribute('aria-label', 
            `${filteredTasks.length} ${this.currentFilter} tasks`);
    }

    /**
     * Create task element
     */
    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : 'pending'}`;
        li.dataset.taskId = task.id;
        li.setAttribute('role', 'listitem');
        
        li.innerHTML = `
            <div class="task-content">
                <button class="task-toggle" data-action="toggle" 
                        aria-label="${task.completed ? 'Mark as pending' : 'Mark as completed'}"
                        aria-pressed="${task.completed}">
                    <svg class="check-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                
                <div class="task-text-container">
                    <span class="task-text">${this.escapeHtml(task.text)}</span>
                    <input type="text" class="task-input" maxlength="500" style="display: none;">
                    <div class="task-meta">
                        <time class="task-time" datetime="${task.createdAt}">
                            ${Utils.formatDate(task.createdAt)}
                        </time>
                        ${task.updatedAt !== task.createdAt ? `
                            <span class="task-updated">Updated ${Utils.formatDate(task.updatedAt)}</span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="task-actions">
                    <div class="edit-actions" style="display: none;">
                        <button class="save-btn" data-action="save-edit" aria-label="Save changes">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button class="cancel-btn" data-action="cancel-edit" aria-label="Cancel editing">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="normal-actions">
                        <button class="edit-btn" data-action="edit" aria-label="Edit task">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button class="delete-btn" data-action="delete" aria-label="Delete task">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return li;
    }

    /**
     * Render statistics
     */
    renderStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        
        this.elements.taskCount.textContent = `${total} ${total === 1 ? 'task' : 'tasks'}`;
        this.elements.completedCount.textContent = `${completed} completed`;
        this.elements.pendingCount.textContent = `${pending} pending`;
        
        // Update button states
        this.elements.clearCompleted.disabled = completed === 0;
        this.elements.clearAll.disabled = total === 0;
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const filteredTasks = this.getFilteredTasks();
        const isEmpty = filteredTasks.length === 0;
        
        this.elements.emptyState.style.display = isEmpty ? 'block' : 'none';
        this.elements.emptyState.setAttribute('aria-hidden', (!isEmpty).toString());
        
        if (isEmpty && this.tasks.length > 0) {
            // Update empty state for filtered view
            const emptyTitle = this.elements.emptyState.querySelector('.empty-title');
            const emptyMessage = this.elements.emptyState.querySelector('.empty-message');
            
            switch (this.currentFilter) {
                case 'pending':
                    emptyTitle.textContent = 'No pending tasks';
                    emptyMessage.textContent = 'All tasks are completed! Great job!';
                    break;
                case 'completed':
                    emptyTitle.textContent = 'No completed tasks';
                    emptyMessage.textContent = 'Complete some tasks to see them here.';
                    break;
            }
        } else if (isEmpty) {
            // Reset to default empty state
            const emptyTitle = this.elements.emptyState.querySelector('.empty-title');
            const emptyMessage = this.elements.emptyState.querySelector('.empty-message');
            emptyTitle.textContent = 'No tasks yet';
            emptyMessage.textContent = 'Add your first task to get started organizing your day!';
        }
    }

    /**
     * Get filtered tasks based on current filter
     */
    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'pending':
                return this.tasks.filter(t => !t.completed);
            case 'completed':
                return this.tasks.filter(t => t.completed);
            default:
                return this.tasks;
        }
    }

    /**
     * Load tasks from localStorage
     */
    async loadTasks() {
        const { tasks, nextId } = await StorageManager.loadTasks();
        this.tasks = tasks;
        this.nextId = nextId;
    }

    /**
     * Save tasks to localStorage
     */
    async saveTasks() {
        const success = await StorageManager.saveTasks(this.tasks, this.nextId);
        if (!success) {
            this.showToast('Failed to save tasks. Storage might be full.', 'error');
        }
    }

    /**
     * Show/hide loading state
     */
    showLoading(show) {
        this.isLoading = show;
        UIComponents.showLoading(this.elements, show);
    }

    /**
     * Show confirmation modal
     */
    showModal(title, message, onConfirm) {
        UIComponents.showModal(this.elements, title, message, onConfirm);
    }

    /**
     * Hide confirmation modal
     */
    hideModal() {
        UIComponents.hideModal(this.elements);
    }

    /**
     * Handle modal clicks (close on overlay click)
     */
    handleModalClick(e) {
        if (e.target.classList.contains('modal-overlay') || 
            e.target.classList.contains('modal-close')) {
            this.hideModal();
        }
    }

    /**
     * Handle modal keyboard navigation
     */
    handleModalKeydown(e) {
        const modal = this.elements.modal;
        if (modal.style.display !== 'block') return;
        
        if (e.key === 'Escape') {
            this.hideModal();
        }
        
        // Trap focus within modal
        if (e.key === 'Tab') {
            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        UIComponents.showToast(this.elements, message, type, duration);
    }


    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Don't handle shortcuts when modal is open or user is typing
        if (this.elements.modal.style.display === 'block' || 
            e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'k':
                    e.preventDefault();
                    this.elements.taskInput.focus();
                    break;
                case 'a':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.handleFilterChange('all');
                    }
                    break;
                case 'p':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.handleFilterChange('pending');
                    }
                    break;
                case 'c':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.handleFilterChange('completed');
                    }
                    break;
            }
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        UIComponents.showError(this.elements, message);
    }

    /**
     * Clear error message
     */
    clearError() {
        UIComponents.clearError(this.elements);
    }

    /**
     * Handle application errors
     */
    handleError(message, error) {
        console.error(message, error);
        this.showToast(`${message}: ${error.message}`, 'error', 5000);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        return Utils.escapeHtml(text);
    }

    /**
     * Truncate text for display
     */
    truncateText(text, maxLength) {
        return Utils.truncateText(text, maxLength);
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        return Utils.formatDate(dateString);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.todoApp = new TodoApp();
    } catch (error) {
        console.error('Failed to initialize Todo App:', error);
        
        // Show fallback error message
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center; font-family: system-ui;">
                <h1 style="color: #dc2626;">Failed to Load Todo App</h1>
                <p>Please refresh the page to try again.</p>
                <p style="font-size: 0.875rem; color: #6b7280;">Error: ${error.message}</p>
            </div>
        `;
    }
});