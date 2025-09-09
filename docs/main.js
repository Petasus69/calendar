import { Calendar } from 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js';

const alertBox = document.getElementById('alert');
const calendarEl = document.getElementById('calendar');
const newBtn = document.getElementById('btn-new');
const copyBtn = document.getElementById('btn-copy');

function generateCalendarId() {
  const random = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(random, (b) => b.toString(16).padStart(2, '0')).join('');
}

function getCalendarIdFromUrl() {
  const url = new URL(window.location.href);
  const id = url.searchParams.get('id');
  return id && id.trim().length > 0 ? id.trim() : null;
}

function setCalendarIdToUrl(id) {
  const url = new URL(window.location.href);
  url.searchParams.set('id', id);
  history.replaceState({}, '', url.toString());
}

function showInfo(message) {
  alertBox.textContent = message;
  alertBox.classList.remove('d-none', 'alert-danger');
  alertBox.classList.add('alert-info');
}

function showError(message) {
  alertBox.textContent = message;
  alertBox.classList.remove('d-none', 'alert-info');
  alertBox.classList.add('alert-danger');
}

function initCalendar() {
  const calendar = new Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    navLinks: true,
    selectable: true,
    editable: true,
    selectMirror: true,
    nowIndicator: true,
    eventClick: (info) => {
      const title = prompt('Изменить название события:', info.event.title || '');
      if (title === null) return; // cancel
      if (title === '') {
        if (confirm('Удалить событие?')) {
          info.event.remove();
          persist();
        }
        return;
      }
      info.event.setProp('title', title);
      persist();
    },
    select: (selection) => {
      const title = prompt('Название события:');
      if (title && title.trim()) {
        calendar.addEvent({
          title: title.trim(),
          start: selection.start,
          end: selection.end,
          allDay: selection.allDay
        });
        persist();
      }
      calendar.unselect();
    },
    eventDrop: () => persist(),
    eventResize: () => persist(),
    events: []
  });
  calendar.render();
  return calendar;
}

function loadFromStorage(id) {
  try {
    const raw = localStorage.getItem(`calendar:${id}`);
    return raw ? JSON.parse(raw) : { events: [] };
  } catch (e) {
    showError('Ошибка чтения локального хранилища');
    return { events: [] };
  }
}

function saveToStorage(id, data) {
  try {
    localStorage.setItem(`calendar:${id}`, JSON.stringify(data));
  } catch (e) {
    showError('Ошибка записи в локальное хранилище');
  }
}

let currentCalendarId = null;
let calendar = initCalendar();

function persist() {
  const events = calendar.getEvents().map((ev) => ({
    id: ev.id,
    title: ev.title,
    start: ev.startStr || ev.start?.toISOString(),
    end: ev.endStr || ev.end?.toISOString(),
    allDay: ev.allDay
  }));
  saveToStorage(currentCalendarId, { events });
}

function load(id) {
  calendar.getEvents().forEach((e) => e.remove());
  const data = loadFromStorage(id);
  for (const ev of data.events) {
    calendar.addEvent(ev);
  }
  currentCalendarId = id;
  showInfo(`Текущий календарь: ${id.slice(0, 8)}…`);
}

newBtn.addEventListener('click', () => {
  const id = generateCalendarId();
  setCalendarIdToUrl(id);
  load(id);
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showInfo('Ссылка скопирована в буфер обмена');
  } catch (e) {
    showError('Не удалось скопировать ссылку');
  }
});

// Bootstrap
const initialId = getCalendarIdFromUrl() || generateCalendarId();
setCalendarIdToUrl(initialId);
load(initialId);

// TODO: Later replace localStorage with Firestore realtime sync


