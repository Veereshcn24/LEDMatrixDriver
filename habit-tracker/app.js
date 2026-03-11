const DAYS_IN_MONTH = 30;
const STORAGE_KEY = 'habit-hero-tracker';

const defaultHabits = ['Wake up at 6AM', 'Read 10 pages', 'Workout', 'Drink Water'];

const state = loadState();

const habitForm = document.getElementById('habit-form');
const habitNameInput = document.getElementById('habit-name');
const trackerGrid = document.getElementById('tracker-grid');
const completionRate = document.getElementById('completion-rate');
const currentStreak = document.getElementById('current-streak');
const bestStreak = document.getElementById('best-streak');

const pieCtx = document.getElementById('progress-pie');
const barCtx = document.getElementById('habit-bars');

const pieChart = new Chart(pieCtx, {
  type: 'doughnut',
  data: {
    labels: ['Completed', 'Pending'],
    datasets: [{ data: [0, 100], backgroundColor: ['#4de2c6', '#2a3157'], borderWidth: 0 }],
  },
  options: { plugins: { legend: { labels: { color: '#e8edff' } } } },
});

const barChart = new Chart(barCtx, {
  type: 'bar',
  data: { labels: [], datasets: [{ label: 'Completion %', data: [], backgroundColor: '#5c8dff' }] },
  options: {
    scales: {
      x: { ticks: { color: '#e8edff' } },
      y: { beginAtZero: true, max: 100, ticks: { color: '#e8edff' } },
    },
    plugins: { legend: { labels: { color: '#e8edff' } } },
  },
});

habitForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = habitNameInput.value.trim();
  if (!name) return;
  state.habits.push({ id: crypto.randomUUID(), name, days: Array(DAYS_IN_MONTH).fill(false) });
  habitNameInput.value = '';
  saveAndRender();
});

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return {
    habits: defaultHabits.map((name) => ({
      id: crypto.randomUUID(),
      name,
      days: Array(DAYS_IN_MONTH).fill(false),
    })),
  };
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function render() {
  renderTrackerGrid();
  renderStatsAndCharts();
}

function renderTrackerGrid() {
  if (!state.habits.length) {
    trackerGrid.innerHTML = '<p>No habits yet. Add one above to get started.</p>';
    return;
  }

  const dayHeaders = Array.from({ length: DAYS_IN_MONTH }, (_, i) => `<th>${i + 1}</th>`).join('');
  const rows = state.habits
    .map((habit) => {
      const completion = habit.days.filter(Boolean).length / DAYS_IN_MONTH;
      const gradeClass = completion > 0.75 ? 'grade-high' : completion > 0.4 ? 'grade-mid' : 'grade-low';
      const dayCells = habit.days
        .map(
          (done, dayIndex) =>
            `<td class="${gradeClass}"><input data-habit-id="${habit.id}" data-day-index="${dayIndex}" type="checkbox" ${done ? 'checked' : ''}></td>`,
        )
        .join('');

      return `<tr>
        <td>
          <div class="habit-name">
            <span>${habit.name}</span>
            <button class="delete" data-delete-id="${habit.id}">✕</button>
          </div>
        </td>
        ${dayCells}
      </tr>`;
    })
    .join('');

  trackerGrid.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Habit</th>
          ${dayHeaders}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  trackerGrid.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const habit = state.habits.find((item) => item.id === event.target.dataset.habitId);
      habit.days[Number(event.target.dataset.dayIndex)] = event.target.checked;
      saveAndRender();
    });
  });

  trackerGrid.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', (event) => {
      state.habits = state.habits.filter((habit) => habit.id !== event.target.dataset.deleteId);
      saveAndRender();
    });
  });
}

function renderStatsAndCharts() {
  const totalSlots = state.habits.length * DAYS_IN_MONTH;
  const totalDone = state.habits.reduce((sum, habit) => sum + habit.days.filter(Boolean).length, 0);
  const completion = totalSlots ? Math.round((totalDone / totalSlots) * 100) : 0;

  completionRate.textContent = `${completion}%`;

  const dailyTotals = Array.from({ length: DAYS_IN_MONTH }, (_, i) =>
    state.habits.reduce((sum, habit) => sum + Number(habit.days[i]), 0),
  );

  let running = 0;
  let best = 0;
  for (const total of dailyTotals) {
    if (total > 0) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }
  currentStreak.textContent = `${running} days`;
  bestStreak.textContent = `${best} days`;

  pieChart.data.datasets[0].data = [completion, 100 - completion];
  pieChart.update();

  barChart.data.labels = state.habits.map((habit) => habit.name);
  barChart.data.datasets[0].data = state.habits.map((habit) =>
    Math.round((habit.days.filter(Boolean).length / DAYS_IN_MONTH) * 100),
  );
  barChart.update();
}

render();
