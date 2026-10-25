/**
 * tasks.js - Routine & Task Management Module with Side-by-Side Cost Aggregations
 */

class TaskManager {
  constructor() {
    this.currentDate = new Date().toISOString().split('T')[0];
    this.searchQuery = '';
    this.categoryFilter = 'all';
    this.priorityFilter = 'all';
    this.statusFilter = 'all';
  }

  setDate(dateStr) {
    this.currentDate = dateStr;
    this.render();
  }

  setFilters({ search, category, priority, status }) {
    if (search !== undefined) this.searchQuery = search.toLowerCase();
    if (category !== undefined) this.categoryFilter = category;
    if (priority !== undefined) this.priorityFilter = priority;
    if (status !== undefined) this.statusFilter = status;
    this.render();
  }

  getFilteredTasks() {
    let tasks = window.storage.getTasksByDate(this.currentDate);

    if (this.searchQuery) {
      tasks = tasks.filter(t => 
        (t.title && t.title.toLowerCase().includes(this.searchQuery)) ||
        (t.notes && t.notes.toLowerCase().includes(this.searchQuery)) ||
        (t.category && t.category.toLowerCase().includes(this.searchQuery))
      );
    }

    if (this.categoryFilter && this.categoryFilter !== 'all') {
      tasks = tasks.filter(t => t.category === this.categoryFilter);
    }

    if (this.priorityFilter && this.priorityFilter !== 'all') {
      tasks = tasks.filter(t => t.priority === this.priorityFilter);
    }

    if (this.statusFilter && this.statusFilter !== 'all') {
      if (this.statusFilter === 'completed') tasks = tasks.filter(t => t.completed);
      if (this.statusFilter === 'pending') tasks = tasks.filter(t => !t.completed);
    }

    // Sort by scheduled time if available
    return tasks.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  }

  render() {
    this.renderFullTimeBlocks();
    this.renderDashboardSnippet();
    this.renderCostBreakdownStrip();

    // Update app-wide stats
    if (window.app) {
      window.app.updateSummaryMetrics();
    }
  }

  renderFullTimeBlocks() {
    const timeBlocks = {
      morning: document.getElementById('list-morning'),
      afternoon: document.getElementById('list-afternoon'),
      evening: document.getElementById('list-evening'),
      night: document.getElementById('list-night')
    };

    const counts = {
      morning: document.getElementById('count-morning'),
      afternoon: document.getElementById('count-afternoon'),
      evening: document.getElementById('count-evening'),
      night: document.getElementById('count-night')
    };

    const costBadges = {
      morning: document.getElementById('cost-morning'),
      afternoon: document.getElementById('cost-afternoon'),
      evening: document.getElementById('cost-evening'),
      night: document.getElementById('cost-night')
    };

    if (!timeBlocks.morning) return;

    const filtered = this.getFilteredTasks();
    const currency = window.storage.getCurrencySymbol();

    // Reset container contents
    Object.keys(timeBlocks).forEach(block => {
      if (timeBlocks[block]) timeBlocks[block].innerHTML = '';
    });

    const blockTasks = { morning: [], afternoon: [], evening: [], night: [] };

    filtered.forEach(task => {
      let block = task.timeBlock || 'morning';
      if (!blockTasks[block]) block = 'morning';
      blockTasks[block].push(task);
    });

    // Populate each time block with tasks and side-by-side cost subtotals
    Object.keys(blockTasks).forEach(block => {
      const listEl = timeBlocks[block];
      const countEl = counts[block];
      const costBadgeEl = costBadges[block];
      const tasksInBlock = blockTasks[block];

      // Side-by-side task count & subtotal cost calculation
      const blockCostTotal = tasksInBlock.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
      const completedInBlock = tasksInBlock.filter(t => t.completed).length;

      if (countEl) {
        countEl.textContent = `${completedInBlock}/${tasksInBlock.length}`;
      }

      if (costBadgeEl) {
        costBadgeEl.innerHTML = `<i class="fa-solid fa-tag"></i> ${currency}${blockCostTotal.toLocaleString()}`;
        costBadgeEl.style.display = blockCostTotal > 0 ? 'inline-flex' : 'none';
      }

      if (tasksInBlock.length === 0) {
        listEl.innerHTML = `
          <div class="task-empty-state">
            <i class="fa-regular fa-calendar-plus" style="font-size: 1.5rem; opacity: 0.5;"></i>
            <span>No tasks in this block</span>
          </div>
        `;
        return;
      }

      tasksInBlock.forEach(task => {
        listEl.appendChild(this.createTaskCardElement(task, currency));
      });
    });
  }

  renderDashboardSnippet() {
    const dashList = document.getElementById('dash-task-list');
    if (!dashList) return;

    const tasks = window.storage.getTasksByDate(this.currentDate);
    const currency = window.storage.getCurrencySymbol();
    dashList.innerHTML = '';

    if (tasks.length === 0) {
      dashList.innerHTML = `
        <div class="task-empty-state">
          <i class="fa-regular fa-calendar-check" style="font-size: 1.75rem; opacity: 0.5;"></i>
          <span>No routines scheduled for today. Click "+ Add Task" to begin.</span>
        </div>
      `;
      return;
    }

    // Sort: pending tasks first, then by time
    const sorted = [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.time || '99:99').localeCompare(b.time || '99:99');
    });

    // Render up to 5 prioritized tasks in dashboard
    sorted.slice(0, 5).forEach(task => {
      dashList.appendChild(this.createTaskCardElement(task, currency));
    });
  }

  // Render Side-by-Side Cost Breakdown Strip
  renderCostBreakdownStrip() {
    const tasks = window.storage.getTasksByDate(this.currentDate);
    const expenses = window.storage.getExpenses().filter(e => e.date === this.currentDate);
    const currency = window.storage.getCurrencySymbol();

    const morningCost = tasks.filter(t => (t.timeBlock || 'morning') === 'morning').reduce((s, t) => s + (parseFloat(t.cost) || 0), 0);
    const afternoonCost = tasks.filter(t => t.timeBlock === 'afternoon').reduce((s, t) => s + (parseFloat(t.cost) || 0), 0);
    const eveningCost = tasks.filter(t => t.timeBlock === 'evening').reduce((s, t) => s + (parseFloat(t.cost) || 0), 0);
    const nightCost = tasks.filter(t => t.timeBlock === 'night').reduce((s, t) => s + (parseFloat(t.cost) || 0), 0);

    const routineTotal = morningCost + afternoonCost + eveningCost + nightCost;
    const allExpensesTotal = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const standaloneCost = Math.max(allExpensesTotal - routineTotal, 0);

    const setVal = (id, amount) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `${currency}${amount.toLocaleString()}`;
    };

    setVal('strip-cost-morning', morningCost);
    setVal('strip-cost-afternoon', afternoonCost);
    setVal('strip-cost-evening', eveningCost);
    setVal('strip-cost-night', nightCost);
    setVal('strip-cost-standalone', standaloneCost);
    setVal('strip-cost-total', allExpensesTotal);

    // Calculate Total Added Expenses & Overall Net Balance
    const allIncomes = window.storage.getIncomes();
    const totalAllIncomes = allIncomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const totalAllExpenses = window.storage.getExpenses().reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const netBalance = totalAllIncomes - totalAllExpenses;
    
    const totalAllExpenseEl = document.getElementById('strip-total-all-expense');
    if (totalAllExpenseEl) {
      totalAllExpenseEl.textContent = `${currency}${totalAllExpenses.toLocaleString()}`;
    }

    const netEl = document.getElementById('strip-net-balance');
    if (netEl) {
      netEl.textContent = `${netBalance >= 0 ? '+' : ''}${currency}${netBalance.toLocaleString()}`;
      netEl.style.color = netBalance >= 0 ? 'var(--success)' : 'var(--danger)';
    }
  }

  createTaskCardElement(task, currency) {
    const taskCard = document.createElement('div');
    taskCard.className = `task-card ${task.completed ? 'completed' : ''}`;
    taskCard.setAttribute('data-id', task.id);
    if (taskCard.dataset) taskCard.dataset.id = task.id;
    taskCard.style.cursor = 'pointer';

    const priorityBadgeClass = `badge-priority-${task.priority || 'medium'}`;
    const costBadge = task.cost > 0 ? `
      <span class="badge badge-cost" onclick="event.stopPropagation(); window.tasks.promptQuickCost('${task.id}')" style="cursor: pointer;" title="Click to edit task cost">
        <i class="fa-solid fa-coins"></i> ${currency}${task.cost}
      </span>
    ` : `
      <button class="badge" onclick="event.stopPropagation(); window.tasks.promptQuickCost('${task.id}')" style="background: var(--bg-main); color: var(--text-muted); border: 1px dashed var(--border-color); cursor: pointer;" title="Add expense to this task">
        <i class="fa-solid fa-plus"></i> Add Cost
      </button>
    `;

    const routineBadge = task.isRoutine ? `
      <span class="badge badge-routine" title="Daily Recurring Routine">
        <i class="fa-solid fa-arrows-rotate"></i> Routine
      </span>
    ` : '';

    taskCard.innerHTML = `
      <div class="custom-checkbox ${task.completed ? 'checked' : ''}" onclick="event.stopPropagation(); window.tasks.handleToggleComplete('${task.id}')" title="Mark done">
        ${task.completed ? '<i class="fa-solid fa-check" style="font-size: 11px;"></i>' : ''}
      </div>
      <div class="task-main">
        <div class="task-header-row">
          <span class="task-title">${this.escapeHtml(task.title)}</span>
          <div class="task-actions" onclick="event.stopPropagation()">
            <button class="task-action-btn" onclick="window.tasks.promptQuickCost('${task.id}')" title="Quick edit expense for this task">
              <i class="fa-solid fa-coins"></i>
            </button>
            <button class="task-action-btn" onclick="window.tasks.openEditModal('${task.id}')" title="Edit Task">
              <i class="fa-solid fa-pencil"></i>
            </button>
            <button class="task-action-btn delete" onclick="window.tasks.handleDeleteTask('${task.id}')" title="Delete Task">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
        <div class="task-badges">
          <span class="badge ${priorityBadgeClass}">${this.capitalize(task.priority || 'medium')}</span>
          <span class="badge badge-category">${this.escapeHtml(task.category || 'General')}</span>
          ${costBadge}
          ${routineBadge}
        </div>
        ${task.notes ? `<div class="task-meta"><i class="fa-regular fa-note-sticky"></i> ${this.escapeHtml(task.notes)}</div>` : ''}
        ${task.time ? `<div class="task-meta"><i class="fa-regular fa-clock"></i> Scheduled: ${task.time}</div>` : ''}
      </div>
    `;

    // Touching or clicking anywhere on the card opens the full details modal!
    taskCard.addEventListener('click', (e) => {
      // Don't trigger if clicked checkbox or action buttons
      if (e.target.closest('.custom-checkbox') || e.target.closest('.task-actions') || e.target.closest('.badge-cost')) {
        return;
      }
      this.openDetailsModal(task.id);
    });

    return taskCard;
  }

  // Open Full Task Details Modal on touch/click
  openDetailsModal(taskId) {
    const tasks = window.storage.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById('task-details-modal');
    const titleEl = document.getElementById('td-modal-title');
    const bodyEl = document.getElementById('td-modal-body');
    const btnToggle = document.getElementById('td-btn-toggle');
    const btnEdit = document.getElementById('td-btn-edit');
    const btnCost = document.getElementById('td-btn-cost');
    const btnDelete = document.getElementById('td-btn-delete');
    const currency = window.storage.getCurrencySymbol();

    if (!modal || !bodyEl) return;

    if (titleEl) titleEl.textContent = 'Task Details';

    const priorityColors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#3b82f6'
    };

    const statusBadge = task.completed 
      ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success); font-size: 0.85rem; padding: 4px 10px;"><i class="fa-solid fa-circle-check"></i> Completed</span>`
      : `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: var(--warning-text); font-size: 0.85rem; padding: 4px 10px;"><i class="fa-solid fa-clock"></i> Pending</span>`;

    const costBadge = task.cost > 0
      ? `<span style="font-size: 1.3rem; font-weight: 700; color: var(--danger);">${currency}${parseFloat(task.cost).toLocaleString()}</span>`
      : `<span style="font-size: 0.9rem; color: var(--text-muted); font-weight: 600;">₹0 (Free / No Cost)</span>`;

    bodyEl.innerHTML = `
      <div style="background: var(--bg-surface); padding: 1.15rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.85rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
          <h2 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.35;">${this.escapeHtml(task.title)}</h2>
          ${statusBadge}
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span class="badge badge-category" style="font-size: 0.8rem; padding: 3px 8px;">
            <i class="fa-solid fa-tag"></i> ${this.escapeHtml(task.category || 'General')}
          </span>
          <span class="badge" style="background: rgba(99, 102, 241, 0.1); color: var(--primary); font-size: 0.8rem; padding: 3px 8px;">
            <i class="fa-solid fa-clock"></i> ${this.capitalize(task.timeBlock || 'morning')} ${task.time ? `• ${task.time}` : ''}
          </span>
          <span class="badge" style="background: ${priorityColors[task.priority] || '#f59e0b'}20; color: ${priorityColors[task.priority] || '#f59e0b'}; font-size: 0.8rem; padding: 3px 8px;">
            <i class="fa-solid fa-flag"></i> ${this.capitalize(task.priority || 'medium')} Priority
          </span>
          ${task.isRoutine ? `<span class="badge badge-routine" style="font-size: 0.8rem; padding: 3px 8px;"><i class="fa-solid fa-arrows-rotate"></i> Daily Routine Habit</span>` : ''}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
        <div style="background: var(--bg-surface); padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Associated Cost</div>
          <div style="margin-top: 4px;">${costBadge}</div>
        </div>
        <div style="background: var(--bg-surface); padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Scheduled Date</div>
          <div style="margin-top: 4px; font-weight: 600; font-size: 0.95rem; color: var(--text-primary);"><i class="fa-regular fa-calendar" style="color: var(--primary); margin-right: 4px;"></i> ${task.date || this.currentDate}</div>
        </div>
      </div>

      <div style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">
          <i class="fa-regular fa-note-sticky" style="color: var(--primary); margin-right: 4px;"></i> Notes & Guidelines
        </div>
        <div style="font-size: 0.9rem; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap;">${task.notes ? this.escapeHtml(task.notes) : '<span style="color: var(--text-muted); font-style: italic;">No extra notes provided for this task.</span>'}</div>
      </div>
    `;

    // Configure Action Buttons
    if (btnToggle) {
      btnToggle.innerHTML = task.completed 
        ? `<i class="fa-solid fa-rotate-left"></i> Mark Incomplete` 
        : `<i class="fa-solid fa-check"></i> Mark Complete`;
      btnToggle.className = task.completed ? 'action-btn btn-secondary' : 'action-btn btn-primary';
      btnToggle.onclick = () => {
        this.handleToggleComplete(task.id);
        this.openDetailsModal(task.id);
      };
    }

    if (btnEdit) {
      btnEdit.onclick = () => {
        this.closeDetailsModal();
        this.openEditModal(task.id);
      };
    }

    if (btnCost) {
      btnCost.onclick = () => {
        this.promptQuickCost(task.id);
        this.openDetailsModal(task.id);
      };
    }

    if (btnDelete) {
      btnDelete.onclick = () => {
        this.closeDetailsModal();
        this.handleDeleteTask(task.id);
      };
    }

    modal.classList.add('active');
  }

  closeDetailsModal() {
    const modal = document.getElementById('task-details-modal');
    if (modal) modal.classList.remove('active');
  }

  // One-click quick cost prompt
  promptQuickCost(taskId) {
    const tasks = window.storage.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currency = window.storage.getCurrencySymbol();
    const currentCost = task.cost || 0;
    const input = prompt(`Enter expense amount (${currency}) for "${task.title}":`, currentCost);
    
    if (input !== null) {
      const newCost = parseFloat(input);
      if (!isNaN(newCost) && newCost >= 0) {
        window.storage.updateTask({ ...task, cost: newCost });
        this.render();
        if (window.expenses) window.expenses.render();
        if (window.charts) window.charts.renderAll();
        if (window.app && window.app.showToast) {
          window.app.showToast(`Updated expense for "${task.title}": ${currency}${newCost}`, 'success');
        }
      } else {
        alert('Please enter a valid positive number for the expense amount.');
      }
    }
  }

  handleToggleComplete(taskId) {
    const updated = window.storage.toggleTaskCompletion(taskId);
    if (updated) {
      this.render();
      if (updated.completed) {
        if (window.app && window.app.showToast) {
          window.app.showToast(`Completed: ${updated.title}`, 'success');
        }
      }
    }
  }

  handleDeleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task and its linked cost?')) {
      window.storage.deleteTask(taskId);
      this.render();
      if (window.app && window.app.showToast) {
        window.app.showToast('Task removed', 'info');
      }
      if (window.expenses) window.expenses.render();
      if (window.charts) window.charts.renderAll();
    }
  }

  openAddModal(presetTimeBlock = 'morning') {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('task-id').value = '';
    document.getElementById('task-modal-title').textContent = 'Add Daily Routine / Task';
    document.getElementById('task-date').value = this.currentDate;
    document.getElementById('task-time-block').value = presetTimeBlock;
    
    modal.classList.add('active');
  }

  openEditModal(taskId) {
    const tasks = window.storage.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    if (!modal || !form) return;

    document.getElementById('task-id').value = task.id;
    document.getElementById('task-modal-title').textContent = 'Edit Task / Routine';
    document.getElementById('task-title').value = task.title || '';
    document.getElementById('task-category').value = task.category || 'Learning & Work';
    document.getElementById('task-time-block').value = task.timeBlock || 'morning';
    document.getElementById('task-time').value = task.time || '';
    document.getElementById('task-priority').value = task.priority || 'medium';
    document.getElementById('task-cost').value = task.cost || 0;
    document.getElementById('task-is-routine').checked = !!task.isRoutine;
    document.getElementById('task-notes').value = task.notes || '';
    document.getElementById('task-date').value = task.date || this.currentDate;

    modal.classList.add('active');
  }

  handleSaveTask(formData) {
    const taskId = formData.get('taskId');
    const taskData = {
      title: formData.get('title').trim(),
      category: formData.get('category'),
      timeBlock: formData.get('timeBlock'),
      time: formData.get('time'),
      priority: formData.get('priority'),
      cost: parseFloat(formData.get('cost')) || 0,
      isRoutine: formData.get('isRoutine') === 'on',
      notes: formData.get('notes').trim(),
      date: formData.get('date') || this.currentDate
    };

    if (!taskData.title) {
      alert('Please enter a task title');
      return false;
    }

    if (taskId) {
      window.storage.updateTask({ id: taskId, ...taskData });
      if (window.app && window.app.showToast) {
        window.app.showToast('Task updated successfully!', 'success');
      }
    } else {
      window.storage.addTask(taskData);
      if (window.app && window.app.showToast) {
        window.app.showToast('New task added to daily schedule!', 'success');
      }
    }

    this.render();
    if (window.expenses) window.expenses.render();
    if (window.charts) window.charts.renderAll();
    return true;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

window.tasks = new TaskManager();
