/**
 * charts.js - Interactive Analytics & Visualizations using Chart.js
 */

class AnalyticsCharts {
  constructor() {
    this.instances = {};
  }

  renderAll() {
    // Render dashboard charts if present
    this.renderCategoryChart('dash-category-chart');
    this.renderTrendChart('dash-trend-chart');

    // Render analytics tab charts if present
    this.renderCategoryChart('category-chart');
    this.renderTrendChart('trend-chart');
    this.renderRoutineCostChart('routine-cost-chart');
    this.renderMonthlyTrendChart('monthly-trend-chart');
  }

  getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      textColor: isDark ? '#cbd5e1' : '#475569',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      tooltipBg: isDark ? '#1f2937' : '#ffffff',
      tooltipText: isDark ? '#f9fafb' : '#0f172a'
    };
  }

  // 1. Category Breakdown Doughnut Chart
  renderCategoryChart(canvasId = 'category-chart') {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const expenses = window.storage.getExpenses();
    const currency = window.storage.getCurrencySymbol();
    const theme = this.getThemeColors();

    const categoryMap = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + (parseFloat(e.amount) || 0);
    });

    const labels = Object.keys(categoryMap);
    const data = Object.values(categoryMap);

    const palette = [
      '#4f46e5', '#10b981', '#f59e0b', '#ef4444', 
      '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'
    ];

    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    if (labels.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    this.instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: palette.slice(0, labels.length),
          borderWidth: 2,
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: theme.textColor,
              boxWidth: 12,
              padding: 12,
              font: { family: 'Inter', size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const val = ctx.raw || 0;
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const percent = Math.round((val / total) * 100);
                return ` ${ctx.label}: ${currency}${val.toLocaleString()} (${percent}%)`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // 2. 7-Day Spending Trend Line Chart
  renderTrendChart(canvasId = 'trend-chart') {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const expenses = window.storage.getExpenses();
    const settings = window.storage.getSettings();
    const currency = settings.currency || '₹';
    const dailyLimit = parseFloat(settings.dailyBudget) || 1500;
    const theme = this.getThemeColors();

    // Generate last 7 dates
    const labels = [];
    const dateKeys = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      dateKeys.push(iso);
      labels.push(d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
    }

    const dailyTotals = dateKeys.map(dateStr => {
      return expenses
        .filter(e => e.date === dateStr)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    });

    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    this.instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Daily Spent',
            data: dailyTotals,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.15)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 5,
            pointBackgroundColor: '#4f46e5'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: theme.textColor, font: { family: 'Inter', size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Spent: ${currency}${ctx.raw.toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: theme.gridColor },
            ticks: { color: theme.textColor, font: { size: 10 } }
          },
          y: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textColor,
              font: { size: 10 },
              callback: (v) => `${currency}${v}`
            }
          }
        }
      }
    });
  }

  // 3. Routine vs Standalone Cost Breakdown Bar Chart
  renderRoutineCostChart(canvasId = 'routine-cost-chart') {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const expenses = window.storage.getExpenses();
    const currency = window.storage.getCurrencySymbol();
    const theme = this.getThemeColors();

    const routineTotal = expenses
      .filter(e => e.isRoutineLinked || e.taskId)
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const standaloneTotal = expenses
      .filter(e => !e.isRoutineLinked && !e.taskId)
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Routine-Linked Costs', 'Standalone Expenses'],
        datasets: [{
          label: 'Total Amount',
          data: [routineTotal, standaloneTotal],
          backgroundColor: ['#6366f1', '#f59e0b'],
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Spent: ${currency}${ctx.raw.toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.textColor, font: { size: 11, weight: '600' } }
          },
          y: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textColor,
              callback: (v) => `${currency}${v}`
            }
          }
        }
      }
    });
  }

  // 4. Task Completion Rate vs Spending Heat
  renderMonthlyTrendChart(canvasId = 'monthly-trend-chart') {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const tasks = window.storage.getTasks();
    const expenses = window.storage.getExpenses();
    const currency = window.storage.getCurrencySymbol();
    const theme = this.getThemeColors();

    // 5 day comparison
    const labels = [];
    const dateKeys = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      dateKeys.push(iso);
      labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    }

    const taskRates = dateKeys.map(d => {
      const dayTasks = tasks.filter(t => t.date === d);
      if (dayTasks.length === 0) return 100;
      return Math.round((dayTasks.filter(t => t.completed).length / dayTasks.length) * 100);
    });

    const dayCosts = dateKeys.map(d => {
      return expenses.filter(e => e.date === d).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    });

    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar',
            label: 'Cost Spent',
            data: dayCosts,
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            yAxisID: 'y',
            borderRadius: 6
          },
          {
            type: 'line',
            label: 'Task Completion (%)',
            data: taskRates,
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            borderWidth: 2.5,
            yAxisID: 'y1',
            tension: 0.3,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: theme.textColor, font: { size: 11 } }
          }
        },
        scales: {
          x: {
            grid: { color: theme.gridColor },
            ticks: { color: theme.textColor }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textColor,
              callback: (v) => `${currency}${v}`
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { display: false },
            min: 0,
            max: 100,
            ticks: {
              color: '#10b981',
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  }
}

window.charts = new AnalyticsCharts();
