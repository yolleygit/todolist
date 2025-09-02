/**
 * Storage Manager for Todo App
 * Handles localStorage operations
 */

const StorageManager = {
    /**
     * Load tasks from localStorage
     */
    async loadTasks() {
        try {
            const savedTasks = localStorage.getItem('todoapp_tasks');
            const savedNextId = localStorage.getItem('todoapp_nextId');
            
            let tasks = [];
            let nextId = 1;
            
            if (savedTasks) {
                tasks = JSON.parse(savedTasks);
                
                // Validate and sanitize loaded tasks
                tasks = tasks.filter(task => 
                    task && 
                    typeof task.text === 'string' && 
                    task.text.trim().length > 0 &&
                    typeof task.id === 'number'
                );
            }
            
            if (savedNextId) {
                nextId = Math.max(parseInt(savedNextId), 1);
            }
            
            // Ensure nextId is higher than any existing task ID
            if (tasks.length > 0) {
                const maxId = Math.max(...tasks.map(t => t.id));
                nextId = Math.max(nextId, maxId + 1);
            }
            
            return { tasks, nextId };
        } catch (error) {
            console.error('Failed to load tasks from storage:', error);
            return { tasks: [], nextId: 1 };
        }
    },

    /**
     * Save tasks to localStorage
     */
    async saveTasks(tasks, nextId) {
        try {
            localStorage.setItem('todoapp_tasks', JSON.stringify(tasks));
            localStorage.setItem('todoapp_nextId', nextId.toString());
            return true;
        } catch (error) {
            console.error('Failed to save tasks to storage:', error);
            return false;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
} else if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}