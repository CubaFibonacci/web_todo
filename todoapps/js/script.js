/**
 * TaskFlow - Modern Todo Apps
 * Dicoding Submission Compliant with Enhanced UI/UX
 */

const todos = [];
const RENDER_EVENT = 'render-todo';
const SAVED_EVENT = 'saved-todo';
const STORAGE_KEY = 'TODO_APPS';
const THEME_KEY = 'TODO_THEME';

// Search and Filter State
let searchQuery = '';
let activeFilter = 'all'; // 'all' | 'uncompleted' | 'completed'
let pendingDeleteId = null;

document.addEventListener('DOMContentLoaded', function () {
    // 1. Form Submission Handler
    const submitForm = document.getElementById('form');
    submitForm.addEventListener('submit', function (event) {
        event.preventDefault();
        addTodo();
    });

    // 2. Initialize Theme
    initTheme();

    // 3. Initialize Live Date
    initLiveDate();

    // 4. Initialize Search & Filter Listeners
    initSearchAndFilters();

    // 5. Initialize Delete Modal Listeners
    initDeleteModal();

    // 6. Set minimum date for input to today
    setMinDateInput();

    // 7. Load Data from Local Storage
    if (isStorageExist()) {
        loadDataFromStorage();
    }
});

/* ==========================================================================
   Core Todo Operations (Dicoding Standard)
   ========================================================================== */

function addTodo() {
    const textTodo = document.getElementById('title').value.trim();
    const timestamp = document.getElementById('date').value;

    if (!textTodo || !timestamp) return;

    const generatedID = generateId();
    const todoObject = generateTodoObject(generatedID, textTodo, timestamp, false);
    todos.unshift(todoObject); // Add to beginning for better UX

    // Reset input fields
    document.getElementById('title').value = '';
    document.getElementById('date').value = '';
    setMinDateInput();

    document.dispatchEvent(new Event(RENDER_EVENT));
    saveData();

    showToast('Tugas baru berhasil ditambahkan! 🚀', 'success');
}

function generateId() {
    return +new Date();
}

function generateTodoObject(id, task, timestamp, isCompleted) {
    return {
        id,
        task,
        timestamp,
        isCompleted
    };
}

function makeTodo(todoObject) {
    const textTitle = document.createElement('h2');
    textTitle.innerText = todoObject.task;

    const textTimestamp = document.createElement('p');
    const formattedDate = formatHumanDate(todoObject.timestamp);
    const dateStatusClass = getDateStatusClass(todoObject.timestamp, todoObject.isCompleted);
    
    textTimestamp.innerHTML = `
        <span class="date-chip ${dateStatusClass}">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>${formattedDate}</span>
        </span>
    `;

    const textContainer = document.createElement('div');
    textContainer.classList.add('inner');
    textContainer.append(textTitle, textTimestamp);

    const container = document.createElement('div');
    container.classList.add('item', 'shadow');
    if (todoObject.isCompleted) {
        container.classList.add('item-completed');
    }
    container.append(textContainer);
    container.setAttribute('id', `todo-${todoObject.id}`);

    const actionsContainer = document.createElement('div');
    actionsContainer.classList.add('item-actions');

    if (todoObject.isCompleted) {
        const undoButton = document.createElement('button');
        undoButton.classList.add('undo-button');
        undoButton.setAttribute('title', 'Kembalikan ke belum selesai');
        undoButton.setAttribute('aria-label', 'Kembalikan tugas');

        undoButton.addEventListener('click', function () {
            undoTaskFromCompleted(todoObject.id);
        });

        const trashButton = document.createElement('button');
        trashButton.classList.add('trash-button');
        trashButton.setAttribute('title', 'Hapus tugas');
        trashButton.setAttribute('aria-label', 'Hapus tugas');

        trashButton.addEventListener('click', function () {
            openDeleteModal(todoObject.id);
        });

        actionsContainer.append(undoButton, trashButton);
        container.append(actionsContainer);
    } else {
        const checkButton = document.createElement('button');
        checkButton.classList.add('check-button');
        checkButton.setAttribute('title', 'Tandai sebagai selesai');
        checkButton.setAttribute('aria-label', 'Selesaikan tugas');

        checkButton.addEventListener('click', function () {
            addTaskToCompleted(todoObject.id);
        });

        actionsContainer.append(checkButton);
        container.append(actionsContainer);
    }

    return container;
}

function addTaskToCompleted(todoId) {
    const todoTarget = findTodo(todoId);

    if (todoTarget == null) return;

    todoTarget.isCompleted = true;
    document.dispatchEvent(new Event(RENDER_EVENT));
    saveData();
    showToast('Tugas selesai! Kerja bagus 🎉', 'success');
}

function undoTaskFromCompleted(todoId) {
    const todoTarget = findTodo(todoId);

    if (todoTarget == null) return;

    todoTarget.isCompleted = false;
    document.dispatchEvent(new Event(RENDER_EVENT));
    saveData();
    showToast('Tugas dipindahkan ke belum selesai ↩️', 'info');
}

function removeTaskFromCompleted(todoId) {
    const todoTarget = findTodoIndex(todoId);

    if (todoTarget === -1) return;

    todos.splice(todoTarget, 1);
    document.dispatchEvent(new Event(RENDER_EVENT));
    saveData();
    showToast('Tugas berhasil dihapus 🗑️', 'danger');
}

function findTodo(id) {
    for (const todo of todos) {
        if (todo.id === id) {
            return todo;
        }
    }
    return null;
}

function findTodoIndex(todoId) {
    for (const index in todos) {
        if (todos[index].id === todoId) {
            return index;
        }
    }
    return -1;
}

/* ==========================================================================
   Render & UI Updates
   ========================================================================== */

document.addEventListener(RENDER_EVENT, function () {
    const uncompletedTODOList = document.getElementById('todos');
    uncompletedTODOList.innerHTML = '';

    const completedTODOList = document.getElementById('completed-todos');
    completedTODOList.innerHTML = '';

    const uncompletedGroup = document.getElementById('uncompleted-group');
    const completedGroup = document.getElementById('completed-group');

    // Filter by Search Query
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredTodos = todos.filter(todo => {
        if (!normalizedQuery) return true;
        return todo.task.toLowerCase().includes(normalizedQuery);
    });

    let uncompletedCount = 0;
    let completedCount = 0;

    for (const todoItem of filteredTodos) {
        const todoElement = makeTodo(todoItem);
        if (!todoItem.isCompleted) {
            uncompletedTODOList.append(todoElement);
            uncompletedCount++;
        } else {
            completedTODOList.append(todoElement);
            completedCount++;
        }
    }

    // Handle Empty States
    if (uncompletedCount === 0) {
        uncompletedTODOList.append(createEmptyState(
            normalizedQuery ? 'Tugas Tidak Ditemukan' : 'Semua Tugas Selesai!',
            normalizedQuery ? 'Coba cari dengan kata kunci lain.' : 'Bagus sekali! Tidak ada tugas tertunda saat ini.'
        ));
    }

    if (completedCount === 0) {
        completedTODOList.append(createEmptyState(
            normalizedQuery ? 'Tugas Tidak Ditemukan' : 'Belum Ada Tugas Selesai',
            normalizedQuery ? 'Coba cari dengan kata kunci lain.' : 'Selesaikan tugas dari daftar di atas untuk melihatnya di sini.'
        ));
    }

    // Handle Tab Visibility
    if (activeFilter === 'uncompleted') {
        uncompletedGroup.style.display = 'block';
        completedGroup.style.display = 'none';
    } else if (activeFilter === 'completed') {
        uncompletedGroup.style.display = 'none';
        completedGroup.style.display = 'block';
    } else {
        uncompletedGroup.style.display = 'block';
        completedGroup.style.display = 'block';
    }

    // Update Counts & Badges
    updateStatistics();
});

function createEmptyState(title, description) {
    const emptyWrapper = document.createElement('div');
    emptyWrapper.classList.add('empty-state');
    emptyWrapper.innerHTML = `
        <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 12h8"></path>
            </svg>
        </div>
        <div class="empty-state-title">${title}</div>
        <div class="empty-state-desc">${description}</div>
    `;
    return emptyWrapper;
}

function updateStatistics() {
    const total = todos.length;
    const pending = todos.filter(t => !t.isCompleted).length;
    const completed = todos.filter(t => t.isCompleted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Stats Cards
    const statTotal = document.getElementById('stat-total');
    const statPending = document.getElementById('stat-pending');
    const statCompleted = document.getElementById('stat-completed');
    const progressPercent = document.getElementById('progress-percent');
    const progressBarFill = document.getElementById('progress-bar-fill');

    if (statTotal) statTotal.innerText = total;
    if (statPending) statPending.innerText = pending;
    if (statCompleted) statCompleted.innerText = completed;
    if (progressPercent) progressPercent.innerText = `${percentage}%`;
    if (progressBarFill) progressBarFill.style.width = `${percentage}%`;

    // Group Badges
    const badgeUncompleted = document.getElementById('badge-uncompleted');
    const badgeCompleted = document.getElementById('badge-completed');

    if (badgeUncompleted) badgeUncompleted.innerText = pending;
    if (badgeCompleted) badgeCompleted.innerText = completed;
}

/* ==========================================================================
   Storage Operations
   ========================================================================== */

function isStorageExist() /* boolean */ {
    if (typeof (Storage) === 'undefined') {
        alert('Browser kamu tidak mendukung local storage');
        return false;
    }
    return true;
}

function saveData() {
    if (isStorageExist()) {
        const parsed = JSON.stringify(todos);
        localStorage.setItem(STORAGE_KEY, parsed);
        document.dispatchEvent(new Event(SAVED_EVENT));
    }
}

document.addEventListener(SAVED_EVENT, function () {
    console.log('Data tersimpan di localStorage:', localStorage.getItem(STORAGE_KEY));
});

function loadDataFromStorage() {
    const serializedData = localStorage.getItem(STORAGE_KEY);
    let data = JSON.parse(serializedData);

    if (data !== null) {
        todos.length = 0; // Clear existing array
        for (const todo of data) {
            todos.push(todo);
        }
    }

    document.dispatchEvent(new Event(RENDER_EVENT));
}

/* ==========================================================================
   Theme & Custom Interactions
   ========================================================================== */

function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';

    setTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function () {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
}

function initLiveDate() {
    const liveDateText = document.getElementById('live-date-text');
    if (!liveDateText) return;

    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
    liveDateText.innerText = now.toLocaleDateString('id-ID', options);
}

function setMinDateInput() {
    const dateInput = document.getElementById('date');
    if (!dateInput) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
}

function formatHumanDate(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
            return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        return dateStr;
    } catch {
        return dateStr;
    }
}

function getDateStatusClass(dateStr, isCompleted) {
    if (isCompleted || !dateStr) return '';
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);

        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'overdue';
        if (diffDays === 0) return 'today';
        return '';
    } catch {
        return '';
    }
}

function initSearchAndFilters() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear-btn');
    const filterTabs = document.querySelectorAll('.filter-tab');

    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            searchQuery = e.target.value;
            if (clearBtn) {
                clearBtn.style.display = searchQuery ? 'flex' : 'none';
            }
            document.dispatchEvent(new Event(RENDER_EVENT));
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            if (searchInput) {
                searchInput.value = '';
                searchQuery = '';
                clearBtn.style.display = 'none';
                searchInput.focus();
                document.dispatchEvent(new Event(RENDER_EVENT));
            }
        });
    }

    filterTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            activeFilter = this.getAttribute('data-filter') || 'all';
            document.dispatchEvent(new Event(RENDER_EVENT));
        });
    });
}

function initDeleteModal() {
    const modal = document.getElementById('delete-modal');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const confirmBtn = document.getElementById('modal-confirm-btn');

    if (!modal) return;

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeDeleteModal);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
            if (pendingDeleteId !== null) {
                removeTaskFromCompleted(pendingDeleteId);
                pendingDeleteId = null;
            }
            closeDeleteModal();
        });
    }

    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeDeleteModal();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeDeleteModal();
        }
    });
}

function openDeleteModal(id) {
    pendingDeleteId = id;
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
    pendingDeleteId = null;
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.classList.add('toast', `toast-${type}`);

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'danger') {
        iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    } else {
        iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-text">${message}</div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hiding');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3200);
}