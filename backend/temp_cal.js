
// Global Calendar Initialization
document.addEventListener('DOMContentLoaded', () => {
    const calendarModal = document.getElementById('globalCalendarModal');
    if (calendarModal) {
        let calendar;
        calendarModal.addEventListener('shown.bs.modal', () => {
            const calendarEl = document.getElementById('globalCalendar');
            if (calendarEl && !calendar) {
                calendar = new FullCalendar.Calendar(calendarEl, {
                    initialView: 'dayGridMonth',
                    height: 500,
                    headerToolbar: {
                        left: 'prev,next',
                        center: 'title',
                        right: 'today'
                    },
                    dayCellDidMount: function(info) {
                        // Color Sundays
                        if (info.date.getDay() === 0) {
                            info.el.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                        } else {
                            info.el.style.backgroundColor = 'rgba(25, 135, 84, 0.05)';
                        }
                    },
                    events: async function(info, successCallback, failureCallback) {
                        try {
                            const response = await fetch('/api/holidays');
                            const holidays = await response.json();
                            let events = [];
                            
                            holidays.forEach(h => {
                                const isHoliday = (h.type === 'Holiday');
                                const bgColor = isHoliday ? 'rgba(220, 53, 69, 0.2)' : 'rgba(25, 135, 84, 0.2)';
                                const eventColor = isHoliday ? '#dc3545' : '#198754';
                                const title = h.name || (isHoliday ? 'Holiday' : 'Working Day');
                                
                                // Add visible event
                                events.push({
                                    id: h.id,
                                    title: title,
                                    start: h.date,
                                    color: eventColor,
                                    allDay: true,
                                    extendedProps: { type: h.type }
                                });
                                // Add background color for that day
                                events.push({
                                    id: 'bg-' + h.id,
                                    start: h.date,
                                    display: 'background',
                                    color: bgColor
                                });
                            });
                            successCallback(events);
                        } catch(e) {
                            console.error(e);
                            failureCallback(e);
                        }
                    },
                    dateClick: function(info) {
                        const dateInput = document.getElementById('editDayDate');
                        if (dateInput) {
                            dateInput.value = info.dateStr;
                            document.getElementById('editDayDateDisplay').value = info.dateStr;
                            document.getElementById('editDayType').value = 'Holiday';
                            document.getElementById('editDayName').value = '';
                            document.getElementById('editDayNameContainer').style.display = 'block';
                            
                            const modalEl = document.getElementById('editDayModal');
                            if (modalEl) {
                                new bootstrap.Modal(modalEl).show();
                            }
                        }
                    },
                    eventClick: function(info) {
                        if (info.event.display === 'background') return;
                        
                        const dateInput = document.getElementById('editDayDate');
                        if (dateInput) {
                            dateInput.value = info.event.startStr;
                            document.getElementById('editDayDateDisplay').value = info.event.startStr;
                            document.getElementById('editDayType').value = info.event.extendedProps.type || 'Holiday';
                            document.getElementById('editDayName').value = info.event.title === 'Working Day' ? '' : info.event.title;
                            document.getElementById('editDayNameContainer').style.display = (info.event.extendedProps.type === 'Working Day') ? 'none' : 'block';
                            
                            const modalEl = document.getElementById('editDayModal');
                            if (modalEl) {
                                new bootstrap.Modal(modalEl).show();
                            }
                        }
                    }
                });
                calendar.render();
            }
        });
        
        // Listen to Type Change
        const editDayType = document.getElementById('editDayType');
        if (editDayType) {
            editDayType.addEventListener('change', (e) => {
                document.getElementById('editDayNameContainer').style.display = (e.target.value === 'Holiday') ? 'block' : 'none';
            });
        }
        
        // Handle Form Submission
        const editDayForm = document.getElementById('editDayForm');
        if (editDayForm) {
            editDayForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const date = document.getElementById('editDayDate').value;
                const type = document.getElementById('editDayType').value;
                const name = document.getElementById('editDayName').value;
                
                try {
                    if (type === 'Default') {
                        // We need to delete any custom rules for this date.
                        // First find the event ID from the calendar
                        let eventId = null;
                        const events = calendar.getEvents();
                        for(let ev of events) {
                            if (ev.startStr === date && ev.id && !ev.id.toString().startsWith('bg-')) {
                                eventId = ev.id;
                                break;
                            }
                        }
                        if (eventId) {
                            await fetch(`/api/holidays/${eventId}`, { method: 'DELETE' });
                        }
                    } else {
                        // POST to save
                        await fetch('/api/holidays', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ date, name, type })
                        });
                    }
                    
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editDayModal'));
                    if (modal) modal.hide();
                    calendar.refetchEvents();
                } catch(err) {
                    console.error('Error saving calendar day status', err);
                    alert("Error saving. Make sure you are an admin.");
                }
            });
        }
    }
});

// Fix FullCalendar Title Color
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.innerHTML = '.fc .fc-toolbar-title { color: #212529 !important; font-weight: bold; } .fc-daygrid-day-number { color: #0d6efd !important; text-decoration: none; }';
    document.head.appendChild(style);
});
