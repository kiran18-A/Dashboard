document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/context');
        if (response.ok) {
            const data = await response.json();

            const elements = {
                'user-name-display': data.name,
                'user-role-display': data.role.charAt(0).toUpperCase() + data.role.slice(1),
                'ctxDesignation': data.designation,
                'ctxEmpId': data.employee_id,
                'ctxDepartment': data.department,
                'ctxEmail': data.email,
                'ctxPhone': data.phone,
                'ctxJoiningDate': data.joining_date,
                'ctxStatus': data.status,
                'ctxCurrentProject': data.current_project,
                'ctxEmerName': data.emergency_contact_name,
                'ctxEmerNum': data.emergency_number,
                'ctxDaysWorked': data.days_worked_month
            };

            for (const [key, value] of Object.entries(elements)) {
                if (value !== undefined) {
                    if (key.startsWith('ctx')) {
                        const el = document.getElementById(key);
                        if (el) el.textContent = value;
                    } else {
                        const els = document.querySelectorAll('.' + key);
                        els.forEach(el => el.textContent = value);
                    }
                }
            }

            const profileImg = document.getElementById('headerProfilePhoto');
            if (profileImg && data.profile_photo) {
                profileImg.src = data.profile_photo;
            } else if (profileImg) {
                profileImg.src = "/static/assets/img/default-avatar.png";
            }
        }
    } catch (e) {
        console.error('Error fetching context:', e);
    }
});
