const languageToggle = document.getElementById('languageToggle');
const themeToggle = document.getElementById('themeToggle');
const bookingForm = document.getElementById('bookingForm');
const dateInput = document.getElementById('appointmentDate');
const timeSelect = document.getElementById('appointmentTime');
const calendarGrid = document.getElementById('calendarGrid');
const formMessage = document.getElementById('formMessage');
const storageKey = 'mohamedGalalAppointments';
let currentLanguage = 'ar';
let currentStep = 1;
let currentBooking = null;
let editingBooking = null;

const steps = [...document.querySelectorAll('.booking-step')];
const progressSteps = [...document.querySelectorAll('.progress-step')];
const confirmationPanel = document.getElementById('bookingConfirmation');
const bookingReview = document.getElementById('bookingReview');

function text(ar, en) {
  return currentLanguage === 'ar' ? ar : en;
}

function getBookings() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem(storageKey, JSON.stringify(bookings));
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = isDark ? '☀' : '☾';
  const label = text(isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  themeToggle.setAttribute('aria-label', label);
  themeToggle.title = label;
  try {
    localStorage.setItem('mohamedGalalTheme', theme);
  } catch {
    // Theme still works for this visit if storage is unavailable.
  }
}

function setLanguage(language) {
  currentLanguage = language;
  const isArabic = language === 'ar';
  const bookingMessage = isArabic
    ? 'مرحبًا، أود حجز موعد في عيادة د. محمد جلال.'
    : "Hello, I'd like to book an appointment at Dr. Mohamed Galal's clinic.";
  const whatsappBookingLink = document.getElementById('whatsappBookingLink');
  if (whatsappBookingLink) {
    whatsappBookingLink.href = `https://wa.me/201030028499?text=${encodeURIComponent(bookingMessage)}`;
  }
  document.documentElement.lang = language;
  document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  document.body.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
  document.body.setAttribute('lang', language);
  languageToggle.textContent = isArabic ? 'EN' : 'عربي';
  languageToggle.setAttribute('aria-label', isArabic ? 'Switch to English' : 'التبديل إلى العربية');
  document.querySelectorAll('[data-ar-label][data-en-label]').forEach((element) => {
    element.setAttribute('aria-label', element.dataset[isArabic ? 'arLabel' : 'enLabel']);
  });

  document.querySelectorAll('[data-ar][data-en]').forEach((element) => {
    element.innerHTML = element.dataset[language];
  });
  document.querySelectorAll('[data-placeholder-ar][data-placeholder-en]').forEach((element) => {
    element.placeholder = element.dataset[`placeholder${isArabic ? 'Ar' : 'En'}`];
  });
  applyTheme(document.documentElement.dataset.theme || 'light');
  renderCalendar();
  updateAvailableTimes();
  if (currentStep === 4 && confirmationPanel.hidden) renderReview();
  if (currentBooking && !confirmationPanel.hidden) showConfirmation(currentBooking);
}

function formatTime(hour) {
  const displayHour = hour > 12 ? hour - 12 : hour;
  if (currentLanguage === 'en') return `${displayHour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
  return `${new Intl.NumberFormat('ar-EG').format(displayHour)}:٠٠ ${hour >= 12 ? 'م' : 'ص'}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(date);
}

function dateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isEditingSlot(booking) {
  return editingBooking && booking.date === editingBooking.date && booking.time === editingBooking.time && booking.name === editingBooking.name;
}

function getAvailableTimes(selectedDate) {
  const bookedTimes = getBookings()
    .filter((booking) => booking.date === selectedDate && !isEditingSlot(booking))
    .map((booking) => booking.time);
  const today = getToday();
  const currentHour = new Date().getHours();
  return Array.from({ length: 7 }, (_, index) => index + 16)
    .filter((hour) => !(selectedDate === today && hour <= currentHour))
    .map((hour) => `${String(hour).padStart(2, '0')}:00`)
    .filter((time) => !bookedTimes.includes(time));
}

function renderCalendar() {
  if (!calendarGrid) return;
  const previousDate = dateInput.value;
  calendarGrid.innerHTML = '';
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const value = dateValue(date);
    const friday = date.getDay() === 5;
    const available = !friday && getAvailableTimes(value).length > 0;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    button.disabled = !available;
    button.dataset.date = value;
    button.setAttribute('aria-pressed', String(value === previousDate));
    if (value === previousDate) button.classList.add('is-selected');

    const weekday = new Intl.DateTimeFormat(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' }).format(date);
    const dayNumber = new Intl.NumberFormat(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric' }).format(date);
    button.innerHTML = `<span>${weekday}</span><strong>${dayNumber}</strong><small>${friday ? text('إجازة', 'Closed') : available ? text('متاح', 'Available') : text('مكتمل', 'Full')}</small>`;
    button.addEventListener('click', () => {
      dateInput.value = value;
      calendarGrid.querySelectorAll('.calendar-day').forEach((day) => {
        const selected = day.dataset.date === value;
        day.classList.toggle('is-selected', selected);
        day.setAttribute('aria-pressed', String(selected));
      });
      updateAvailableTimes();
      showMessage('');
    });
    calendarGrid.appendChild(button);
  }

  if (previousDate && [...calendarGrid.children].some((day) => day.dataset.date === previousDate && !day.disabled)) {
    dateInput.value = previousDate;
  } else if (previousDate) {
    dateInput.value = '';
  }
}

function updateAvailableTimes() {
  const selectedDate = dateInput.value;
  const previousTime = timeSelect.value;
  timeSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = selectedDate ? text('اختار الموعد المناسب', 'Choose an available time') : text('اختار اليوم الأول', 'Choose a day first');
  timeSelect.appendChild(placeholder);
  if (!selectedDate) return;

  getAvailableTimes(selectedDate).forEach((time) => {
    const option = document.createElement('option');
    option.value = time;
    option.textContent = formatTime(Number(time.slice(0, 2)));
    timeSelect.appendChild(option);
  });
  if (timeSelect.options.length === 1) {
    placeholder.textContent = text('لا توجد مواعيد متاحة في هذا اليوم', 'No times available that day');
  } else if ([...timeSelect.options].some((option) => option.value === previousTime)) {
    timeSelect.value = previousTime;
  }
}

function selectedServiceLabel() {
  const selected = bookingForm.querySelector('input[name="service"]:checked');
  if (!selected) return '';
  return currentLanguage === 'ar' ? selected.value : selected.dataset.serviceEn;
}

function renderReview() {
  const formData = new FormData(bookingForm);
  const selectedDate = dateInput.value ? new Date(`${dateInput.value}T12:00:00`) : null;
  const selectedTime = formData.get('time');
  const rows = [
    [text('الاسم', 'Name'), formData.get('name') || ''],
    [text('رقم الهاتف', 'Phone'), formData.get('phone') || ''],
    [text('العمر', 'Age'), formData.get('age') || ''],
    [text('الخدمة', 'Service'), selectedServiceLabel()],
    [text('اليوم', 'Day'), selectedDate ? formatDate(selectedDate) : ''],
    [text('الوقت', 'Time'), selectedTime ? formatTime(Number(String(selectedTime).slice(0, 2))) : ''],
    [text('ملاحظات', 'Notes'), formData.get('notes') || text('لا توجد', 'None')]
  ];
  bookingReview.innerHTML = rows.map(([label, value]) => `<div class="review-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`).join('');
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function showStep(step) {
  currentStep = step;
  steps.forEach((panel) => {
    const active = Number(panel.dataset.step) === step;
    panel.hidden = !active;
    panel.classList.toggle('is-visible', active);
  });
  progressSteps.forEach((item) => {
    const number = Number(item.dataset.progress);
    item.classList.toggle('is-active', number === step);
    item.classList.toggle('is-complete', number < step);
  });
  document.getElementById('bookingBack').hidden = step === 1;
  document.getElementById('bookingNext').hidden = step === 4;
  document.getElementById('bookingConfirm').hidden = step !== 4;
  if (step === 3) {
    renderCalendar();
    updateAvailableTimes();
  }
  if (step === 4) renderReview();
  showMessage('');
}

function validateStep(step) {
  if (step === 1) {
    const fields = [...document.querySelectorAll('[data-step="1"] input[required]')];
    const invalid = fields.find((field) => !field.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
  }
  if (step === 2 && !bookingForm.querySelector('input[name="service"]:checked')) {
    showMessage(text('اختار الخدمة المطلوبة للمتابعة.', 'Please choose a service to continue.'), true);
    return false;
  }
  if (step === 3) {
    if (!dateInput.value || !timeSelect.value) {
      showMessage(text('اختار اليوم والموعد المناسبين للمتابعة.', 'Choose an available day and time to continue.'), true);
      return false;
    }
    if (!getAvailableTimes(dateInput.value).includes(timeSelect.value)) {
      renderCalendar();
      updateAvailableTimes();
      showMessage(text('الموعد لم يعد متاحًا؛ اختار موعدًا آخر.', 'That slot is no longer available. Please choose another.'), true);
      return false;
    }
  }
  return true;
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle('error', isError);
}

function makeCalendarFile(booking) {
  const start = `${booking.date.replaceAll('-', '')}T${booking.time.replace(':', '')}00`;
  const endHour = Number(booking.time.slice(0, 2)) + 1;
  const end = `${booking.date.replaceAll('-', '')}T${String(endHour).padStart(2, '0')}0000`;
  const details = `${booking.service} · ${booking.name}`.replace(/[\\,;]/g, '\\$&');
  const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dental Clinic//Appointment//EN', 'BEGIN:VEVENT', `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${text('موعد عيادة الأسنان', 'Dental clinic appointment')}`, `DESCRIPTION:${details}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
}

function showConfirmation(booking) {
  currentBooking = booking;
  bookingForm.querySelector('.booking-progress').hidden = true;
  steps.forEach((panel) => {
    panel.hidden = true;
    panel.classList.remove('is-visible');
  });
  document.querySelector('.wizard-actions').hidden = true;
  confirmationPanel.hidden = false;
  const date = formatDate(new Date(`${booking.date}T12:00:00`));
  const hour = formatTime(Number(booking.time.slice(0, 2)));
  const service = currentLanguage === 'ar' ? booking.service : (booking.serviceEn || booking.service);
  document.getElementById('confirmationDetails').textContent = text(
    `موعد ${service} باسم ${booking.name} يوم ${date} الساعة ${hour}.`,
    `${service} for ${booking.name} on ${date} at ${hour}.`
  );
  document.getElementById('calendarDownload').href = makeCalendarFile(booking);
  const message = text(
    `مرحبًا، أود تأكيد موعدي بعيادة د. محمد جلال. الاسم: ${booking.name}، الخدمة: ${booking.service}، التاريخ: ${booking.date}، الوقت: ${hour}.`,
    `Hello, I'd like to confirm my appointment at Dr. Mohamed Galal's clinic. Name: ${booking.name}, service: ${booking.serviceEn || booking.service}, date: ${booking.date}, time: ${hour}.`
  );
  document.getElementById('confirmationWhatsapp').href = `https://wa.me/201030028499?text=${encodeURIComponent(message)}`;
}

function resetConfirmationView() {
  confirmationPanel.hidden = true;
  bookingForm.querySelector('.booking-progress').hidden = false;
  document.querySelector('.wizard-actions').hidden = false;
}

function getToday() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

let savedTheme = 'light';
try {
  savedTheme = localStorage.getItem('mohamedGalalTheme') || 'light';
} catch {
  savedTheme = 'light';
}
applyTheme(savedTheme);

languageToggle.addEventListener('click', () => setLanguage(currentLanguage === 'ar' ? 'en' : 'ar'));
themeToggle.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
document.getElementById('bookingNext').addEventListener('click', () => {
  if (validateStep(currentStep)) showStep(currentStep + 1);
});
document.getElementById('bookingBack').addEventListener('click', () => showStep(currentStep - 1));
timeSelect.addEventListener('change', () => showMessage(''));

bookingForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!validateStep(3)) return;
  const formData = new FormData(bookingForm);
  const serviceInput = bookingForm.querySelector('input[name="service"]:checked');
  const nextBooking = {
    name: String(formData.get('name')).trim(),
    phone: String(formData.get('phone')).trim(),
    age: String(formData.get('age')).trim(),
    service: String(formData.get('service')),
    serviceEn: serviceInput.dataset.serviceEn,
    notes: String(formData.get('notes') || '').trim(),
    date: dateInput.value,
    time: timeSelect.value
  };
  let bookings = getBookings();
  const slotTaken = bookings.some((booking) => booking.date === nextBooking.date && booking.time === nextBooking.time && !isEditingSlot(booking));
  if (slotTaken || !getAvailableTimes(nextBooking.date).includes(nextBooking.time)) {
    showStep(3);
    renderCalendar();
    updateAvailableTimes();
    showMessage(text('الموعد ده لم يعد متاحًا. اختار يومًا أو موعدًا آخر.', 'That slot is no longer available. Please choose another day or time.'), true);
    return;
  }

  if (editingBooking) {
    bookings = bookings.filter((booking) => !(booking.date === editingBooking.date && booking.time === editingBooking.time && booking.name === editingBooking.name));
  }
  try {
    saveBookings([...bookings, nextBooking]);
  } catch {
    showMessage(text('تعذر حفظ الحجز على هذا الجهاز. حاول مرة أخرى أو اتصل بالعيادة.', 'Could not save the booking on this device. Please try again or call the clinic.'), true);
    return;
  }
  editingBooking = null;
  showConfirmation(nextBooking);
});

document.getElementById('editBooking').addEventListener('click', () => {
  if (!currentBooking) return;
  editingBooking = currentBooking;
  const booking = currentBooking;
  document.getElementById('visitorName').value = booking.name;
  document.getElementById('visitorPhone').value = booking.phone;
  document.getElementById('visitorAge').value = booking.age;
  document.getElementById('bookingNotes').value = booking.notes || '';
  const serviceRadio = [...bookingForm.querySelectorAll('input[name="service"]')].find((radio) => radio.value === booking.service);
  if (serviceRadio) serviceRadio.checked = true;
  dateInput.value = booking.date;
  resetConfirmationView();
  showStep(1);
});

document.getElementById('cancelBooking').addEventListener('click', () => {
  if (!currentBooking) return;
  const confirmed = window.confirm(text('هل تريد إلغاء هذا الحجز؟', 'Would you like to cancel this booking?'));
  if (!confirmed) return;
  try {
    saveBookings(getBookings().filter((booking) => !(booking.date === currentBooking.date && booking.time === currentBooking.time && booking.name === currentBooking.name)));
  } catch {
    showMessage(text('تعذر إلغاء الحجز على هذا الجهاز.', 'Could not cancel the booking on this device.'), true);
    return;
  }
  currentBooking = null;
  editingBooking = null;
  bookingForm.reset();
  dateInput.value = '';
  resetConfirmationView();
  showStep(1);
  renderCalendar();
});

setLanguage('ar');
