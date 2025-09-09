function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

onReady(() => {
  if (!window.FullCalendar || !window.FullCalendar.Calendar) {
    console.error('FullCalendar not loaded');
    const box = document.getElementById('alert');
    if (box) {
      box.textContent = 'Ошибка: не удалось загрузить библиотеку календаря.';
      box.classList.remove('d-none');
      box.classList.add('alert-danger');
    }
    return;
  }

  const { Calendar } = window.FullCalendar;
  const alertBox = document.getElementById('alert');
  const calendarEl = document.getElementById('calendar');
  const newBtn = document.getElementById('btn-new');
  const copyBtn = document.getElementById('btn-copy');
  const db = window.db; // Firestore или undefined

  function generateCalendarId() {
    if (window.crypto && window.crypto.getRandomValues) {
      const random = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(random, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    const chars = 'abcdef0123456789';
    let s = '';
    for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
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

  async function loadFromFirestore(id) {
    const ref = db.collection('calendars').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({ events: [], updatedAt: Date.now() });
      return { events: [] };
    }
    const data = snap.data();
    return { events: Array.isArray(data.events) ? data.events : [] };
  }

  async function saveToFirestore(id, data) {
    const ref = db.collection('calendars').doc(id);
    await ref.set({ events: data.events || [], updatedAt: Date.now() }, { merge: true });
  }

  let currentCalendarId = null;
  let calendar = initCalendar();
  let unsubscribe = null;
  let isApplyingRemote = false;

  async function persist() {
    const events = calendar.getEvents().map((ev) => ({
      id: ev.id,
      title: ev.title,
      start: ev.startStr || ev.start?.toISOString(),
      end: ev.endStr || ev.end?.toISOString(),
      allDay: ev.allDay
    }));
    if (!currentCalendarId) return;
    if (db) {
      try { await saveToFirestore(currentCalendarId, { events }); } catch (e) { showError('Не удалось сохранить в облако'); }
    } else {
      saveToStorage(currentCalendarId, { events });
    }
  }

  async function applyEvents(events) {
    isApplyingRemote = true;
    try {
      calendar.getEvents().forEach((e) => e.remove());
      for (const ev of events) {
        calendar.addEvent(ev);
      }
    } finally {
      isApplyingRemote = false;
    }
  }

  async function load(id) {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    currentCalendarId = id;
    showInfo(`Текущий календарь: ${id.slice(0, 8)}…`);
    if (db) {
      try {
        const initial = await loadFromFirestore(id);
        await applyEvents(initial.events);
        const ref = db.collection('calendars').doc(id);
        unsubscribe = ref.onSnapshot((snap) => {
          if (!snap.exists) return;
          const data = snap.data();
          if (!data) return;
          const events = Array.isArray(data.events) ? data.events : [];
          applyEvents(events);
        });
      } catch (e) {
        showError('Не удалось загрузить из облака, использую локальные данные');
        const local = loadFromStorage(id);
        await applyEvents(local.events);
      }
    } else {
      const local = loadFromStorage(id);
      await applyEvents(local.events);
    }
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

  const initialId = getCalendarIdFromUrl() || generateCalendarId();
  setCalendarIdToUrl(initialId);
  load(initialId);
});


