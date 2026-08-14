document.addEventListener('DOMContentLoaded', () => {
    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebarToggle && sidebar && mainContent) {
        sidebarToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('mobile-open');
            } else {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            }
        });
    }

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    htmlElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = htmlElement.getAttribute('data-theme');
            const target = current === 'light' ? 'dark' : 'light';
            htmlElement.setAttribute('data-theme', target);
            localStorage.setItem('theme', target);
            updateThemeIcon(target);
            
            // Re-render charts if they exist
            if (typeof renderCharts === 'function') {
                renderCharts();
            }
        });
    }

    function updateThemeIcon(theme) {
        if (!themeToggle) return;
        const icon = themeToggle.querySelector('i');
        if (theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    // Login Form logic
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value; // Using correct ID
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalContent = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Loading...';
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                
                if (data.success) {
                    if (data.role === 'admin') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        window.location.href = 'employee-dashboard.html';
                    }
                } else {
                    alert(data.message || 'Login failed');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalContent;
                }
            } catch (err) {
                alert('Error connecting to server');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
            }
        });
    }

    // Attendance Logic (Employee Dashboard)
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    
    if (checkInBtn) {
        // Just checking if we can check-in based on a local flag or API would be better
        // We'll just hook up the button to the API for now
        checkInBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/checkin', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    checkInBtn.disabled = true;
                    checkInBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Checked In Today';
                    checkInBtn.classList.replace('btn-primary', 'btn-secondary');
                    alert(`Checked in successfully at ${data.time}`);
                    
                } else {
                    alert(data.message || 'Check-in failed');
                }
            } catch (err) {
                alert('Error checking in');
            }
        });
    }

    if (checkOutBtn) {
        checkOutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/checkout', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    checkOutBtn.disabled = true;
                    checkOutBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Checked Out Today';
                    checkOutBtn.classList.replace('btn-danger', 'btn-secondary');
                    alert(`Checked out successfully at ${data.time}`);
                } else {
                    alert(data.message || 'Checkout failed. Make sure you are checked in first.');
                }
            } catch (err) {
                alert('Error checking out');
            }
        });
    }

    // Attendance Overview Logic
    const attendanceTableBody = document.getElementById('attendanceTableBody');
    if (attendanceTableBody) {
        async function loadAttendance() {
            try {
                const response = await fetch('/api/attendance');
                const records = await response.json();
                
                attendanceTableBody.innerHTML = '';
                
                let presentCount = 0;
                let absentCount = 0;
                let lateCount = 0;
                let leaveCount = 0;
                
                // Assuming today's date is what we want to count stats for, or overall.
                // The provided HTML shows overall counts like 142. We'll just count all for now.
                records.forEach(record => {
                    if (record.status === 'Present') presentCount++;
                    else if (record.status === 'Absent') absentCount++;
                    else if (record.status === 'Late') lateCount++;
                    else if (record.status === 'On Leave') leaveCount++;
                    
                    let badgeClass = 'bg-secondary';
                    if (record.status === 'Present') badgeClass = 'bg-success';
                    else if (record.status === 'Absent') badgeClass = 'bg-danger';
                    else if (record.status === 'Late') badgeClass = 'bg-warning text-dark';
                    else if (record.status === 'On Leave') badgeClass = 'bg-info text-dark';
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(record.employee_name)}&background=random" class="profile-img-sm me-3">
                                <span class="fw-semibold">${record.employee_name}</span>
                            </div>
                        </td>
                        <td>${record.date}</td>
                        <td>${record.login_time}</td>
                        <td>${record.logout_time}</td>
                        <td>${record.working_hours}</td>
                        <td>${generateStatusSelect('attendance', record.id, record.status, ['Present', 'Absent', 'Late', 'On Leave'], badgeClass)}</td>
                    `;
                    attendanceTableBody.appendChild(tr);
                });
                
                // Update stats
                if (document.getElementById('statPresent')) document.getElementById('statPresent').innerText = presentCount;
                if (document.getElementById('statAbsent')) document.getElementById('statAbsent').innerText = absentCount;
                if (document.getElementById('statLate')) document.getElementById('statLate').innerText = lateCount;
                if (document.getElementById('statLeave')) document.getElementById('statLeave').innerText = leaveCount;
                
            } catch (err) {
                console.error("Error fetching attendance", err);
            }
        }
        
        loadAttendance();
    }
    
    // Salary Management Logic
    const salaryTableBody = document.getElementById('salaryTableBody');
    if (salaryTableBody) {
        async function loadSalaries() {
            try {
                const response = await fetch('/api/salary');
                const records = await response.json();
                
                salaryTableBody.innerHTML = '';
                if (records.length === 0) {
                    salaryTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No salary records found.</td></tr>';
                    return;
                }
                
                let paidTotal = 0;
                let pendingTotal = 0;
                let totalTotal = 0;
                
                records.forEach(sal => {
                    const amount = parseFloat(sal.amount) || 0;
                    
                    if (amount === 0) return; // Hide records with 0 salary
                    
                    totalTotal += amount;
                    if (sal.status === 'Paid') {
                        paidTotal += amount;
                    } else {
                        pendingTotal += amount;
                    }
                    
                    const isPaid = sal.status === 'Paid';
                    const badgeClass = isPaid ? 'bg-success' : 'bg-warning text-dark';
                    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(sal.name || sal.employee_id)}&background=random`;
                    
                    let formattedDate = '';
                    if (sal.paid_date && sal.paid_date !== '--') {
                        const d = new Date(sal.paid_date);
                        if (!isNaN(d.getTime())) {
                            formattedDate = d.toISOString().split('T')[0];
                        }
                    }
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${avatarUrl}" class="profile-img-sm me-2">
                                <span class="fw-semibold">${sal.name || sal.employee_id}</span>
                            </div>
                        </td>
                        <td>${sal.month}</td>
                        <td>₹${amount.toLocaleString()}</td>
                        <td><span class="badge ${badgeClass}">${sal.status}</span></td>
                        <td>${sal.paid_date || '--'}</td>
                        <td>
                            ${!isPaid ? `<button class="btn btn-sm btn-success text-white me-1 mark-paid-btn" data-id="${sal.id}"><i class="fas fa-check"></i> Mark Paid</button>` : ''}
                            <button class="btn btn-sm btn-light text-primary view-salary-btn" data-empid="${sal.employee_id}" data-name="${sal.name || sal.employee_id}"><i class="fas fa-eye"></i> View</button>
                            <button class="btn btn-sm btn-light text-primary edit-salary-btn ms-1" data-id="${sal.id}" data-amount="${amount}" data-status="${sal.status}" data-date="${formattedDate}"><i class="fas fa-edit"></i> Edit</button>
                        </td>
                    `;
                    salaryTableBody.appendChild(tr);
                });
                
                // Update stats
                if (document.getElementById('statSalaryPaid')) document.getElementById('statSalaryPaid').innerText = `₹${paidTotal.toLocaleString()}`;
                if (document.getElementById('statSalaryPending')) document.getElementById('statSalaryPending').innerText = `₹${pendingTotal.toLocaleString()}`;
                if (document.getElementById('statSalaryTotal')) document.getElementById('statSalaryTotal').innerText = `₹${totalTotal.toLocaleString()}`;
                
                // Attach event listeners for mark paid
                document.querySelectorAll('.mark-paid-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const salaryId = e.currentTarget.getAttribute('data-id');
                        try {
                            const res = await fetch(`/api/salary/${salaryId}/pay`, { method: 'POST' });
                            const data = await res.json();
                            if (data.success) {
                                loadSalaries(); // reload
                            } else {
                                alert(data.message || 'Error marking salary paid');
                            }
                        } catch (err) {
                            alert('Error updating salary');
                        }
                    });
                });
                
                // Attach event listeners for edit buttons
                document.querySelectorAll('.edit-salary-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const salaryId = e.currentTarget.getAttribute('data-id');
                        const amount = e.currentTarget.getAttribute('data-amount');
                        const status = e.currentTarget.getAttribute('data-status');
                        const date = e.currentTarget.getAttribute('data-date');
                        
                        document.getElementById('editSalaryId').value = salaryId;
                        document.getElementById('editSalaryAmount').value = amount;
                        document.getElementById('editSalaryStatus').value = status;
                        document.getElementById('editSalaryDate').value = date || '';
                        
                        const modal = new bootstrap.Modal(document.getElementById('editSalaryModal'));
                        modal.show();
                    });
                });
                
                // Attach event listeners for view buttons
                document.querySelectorAll('.view-salary-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const empId = e.currentTarget.getAttribute('data-empid');
                        const empName = e.currentTarget.getAttribute('data-name');
                        
                        try {
                            const res = await fetch(`/api/salary/employee/${encodeURIComponent(empId)}`);
                            const data = await res.json();
                            if (data.success) {
                                document.getElementById('viewSalaryHistoryTitle').innerText = `Payment History - ${empName}`;
                                const tbody = document.getElementById('salaryHistoryTableBody');
                                tbody.innerHTML = '';
                                
                                data.history.forEach(record => {
                                    const amount = parseFloat(record.amount) || 0;
                                    const isPaid = record.status === 'Paid';
                                    const badgeClass = isPaid ? 'bg-success' : 'bg-warning text-dark';
                                    
                                    const tr = document.createElement('tr');
                                    tr.innerHTML = `
                                        <td class="px-4">${record.month}</td>
                                        <td class="px-4 fw-semibold">₹${amount.toLocaleString()}</td>
                                        <td class="px-4"><span class="badge ${badgeClass}">${record.status}</span></td>
                                        <td class="px-4 text-end text-muted">${record.paid_date || '--'}</td>
                                    `;
                                    tbody.appendChild(tr);
                                });
                                
                                const modal = new bootstrap.Modal(document.getElementById('viewSalaryHistoryModal'));
                                modal.show();
                            } else {
                                alert('Error fetching history: ' + (data.error || ''));
                            }
                        } catch (err) {
                            alert('Error fetching salary history');
                        }
                    });
                });
                
            } catch (err) {
                console.error("Error fetching salaries", err);
            }
        }
        
        loadSalaries();
        
        const editSalaryForm = document.getElementById('editSalaryForm');
        if (editSalaryForm) {
            editSalaryForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const salaryId = document.getElementById('editSalaryId').value;
                const updateData = {
                    amount: parseFloat(document.getElementById('editSalaryAmount').value),
                    status: document.getElementById('editSalaryStatus').value,
                    paid_date: document.getElementById('editSalaryDate').value
                };
                
                try {
                    const response = await fetch(`/api/salary/${salaryId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        const modalEl = document.getElementById('editSalaryModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        modal.hide();
                        loadSalaries();
                    } else {
                        alert("Error updating salary: " + (data.message || ''));
                    }
                } catch (err) {
                    alert("Error saving salary");
                }
            });
        }
    }

    // Today's Work Form
    const workForm = document.getElementById('workForm');
    if (workForm) {
        workForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const textarea = workForm.querySelector('textarea');
            
            try {
                const response = await fetch('/api/save_work', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description: textarea.value })
                });
                const data = await response.json();
                
                if (data.success) {
                    const successMsg = document.getElementById('workSuccessMessage');
                    successMsg.classList.remove('d-none');
                    setTimeout(() => {
                        successMsg.classList.add('d-none');
                        workForm.reset();
                    }, 3000);
                } else {
                    alert(data.message || 'Failed to save work');
                }
            } catch (err) {
                alert('Error saving work');
            }
        });
    }

    // Employee Management API Logic
    const employeeTableBody = document.getElementById('employeeTableBody');
    if (employeeTableBody) {
        let allEmployees = [];
        
        async function loadEmployees() {
            try {
                const response = await fetch('/api/employees');
                allEmployees = await response.json();
                renderEmployees();
            } catch (err) {
                console.error("Error fetching employees", err);
            }
        }
        
        function renderEmployees() {
            employeeTableBody.innerHTML = '';
            
            let filteredEmployees = allEmployees;
            const searchInput = document.getElementById('empSearchInput');
            const deptSelect = document.getElementById('deptFilterSelect');
            
            if (searchInput && searchInput.value) {
                const q = searchInput.value.toLowerCase();
                filteredEmployees = filteredEmployees.filter(emp => emp.name.toLowerCase().includes(q) || emp.employee_id.toLowerCase().includes(q));
            }
            
            if (deptSelect && deptSelect.value && deptSelect.value !== "All Departments") {
                filteredEmployees = filteredEmployees.filter(emp => emp.department === deptSelect.value);
            }
            
            if (filteredEmployees.length === 0) {
                employeeTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No employees found.</td></tr>';
                return;
            }
            
            filteredEmployees.forEach(emp => {
                const statusBadge = emp.status === 'Active' ? 'bg-success' : 'bg-danger';
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`;
                const presenceColor = emp.is_present_today ? 'bg-success' : 'bg-danger';
                const presenceTitle = emp.is_present_today ? 'Logged in today' : 'Not logged in today';
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="position-relative me-3">
                                <img src="${avatarUrl}" class="profile-img-sm" alt="${emp.name}">
                                <span class="position-absolute bottom-0 end-0 p-1 border border-2 border-white rounded-circle ${presenceColor}" title="${presenceTitle}" style="width: 12px; height: 12px;"></span>
                            </div>
                            <div>
                                <h6 class="mb-0 fw-semibold"><a href="#" class="text-decoration-none view-emp-details text-primary" data-id="${emp.id}">${emp.name}</a></h6>
                                <small class="text-muted">${emp.employee_id}</small>
                            </div>
                        </div>
                    </td>
                    <td>${emp.department}</td>
                    <td>${emp.email || 'Not set'}</td>
                    <td>${emp.username || 'Not set'}</td>
                    <td><span class="badge bg-secondary rounded-pill px-3 py-2">${emp.project_count || 0}</span></td>
                    <td>${generateStatusSelect('employees', emp.id, emp.status, ['Active', 'Inactive'], statusBadge)}</td>
                    <td>
                        <button class="btn btn-sm btn-light text-danger delete-emp-btn" data-id="${emp.id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                employeeTableBody.appendChild(tr);
            });
            
            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-emp-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (confirm('Are you sure you want to delete this employee?')) {
                        const empId = e.currentTarget.getAttribute('data-id');
                        await fetch(`/api/employees/${empId}`, { method: 'DELETE' });
                        loadEmployees();
                    }
                });
            });

            // Add event listeners for view details
            document.querySelectorAll('.view-emp-details').forEach(link => {
                link.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const empId = e.currentTarget.getAttribute('data-id');
                    await showEmployeeDetails(empId);
                });
            });
        }
        
        const empSearchInput = document.getElementById('empSearchInput');
        if (empSearchInput) {
            empSearchInput.addEventListener('input', renderEmployees);
        }
        
        const deptFilterSelect = document.getElementById('deptFilterSelect');
        if (deptFilterSelect) {
            deptFilterSelect.addEventListener('change', renderEmployees);
        }
        
        loadEmployees();
        
        window.currentViewEmployeeId = null;

        window.downloadSalaryStatement = function(event, months) {
            event.preventDefault();
            if (window.currentViewEmployeeId) {
                window.open(`/api/employees/${window.currentViewEmployeeId}/salary_slip?months=${months}`, '_blank');
            } else {
                alert("Please select an employee first.");
            }
        };
        
        window.updateLeaveStatus = async function(leaveId, status) {
            try {
                const response = await fetch(`/api/leaves/${leaveId}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ status })
                });
                if (response.ok) {
                    // Refresh current employee details to show updated status
                    if (window.currentViewEmployeeId) {
                        await window.showEmployeeDetails(window.currentViewEmployeeId);
                    }
                } else {
                    alert('Failed to update leave status');
                }
            } catch (err) {
                console.error(err);
                alert('Error updating leave status');
            }
        };

        window.showEmployeeDetails = async function(empId) {
            window.currentViewEmployeeId = empId;
            try {
                const response = await fetch(`/api/employees/${empId}/details`);
                if (!response.ok) throw new Error("Failed to fetch details");
                const data = await response.json();
                
                // Populate Profile
                const profileDiv = document.getElementById('detailProfileContent');
                const p = data.profile;
                document.getElementById('detailEmpTitle').innerText = `${p.name} - Details`;
                const renderProfile = () => {
                    profileDiv.innerHTML = `
                        <div class="col-md-6"><p class="mb-1 text-muted small">Employee ID</p><h6 class="fw-bold">${p.employee_id}</h6></div>
                        <div class="col-md-6"><p class="mb-1 text-muted small">Name</p><h6 class="fw-bold">${p.name}</h6></div>
                        <div class="col-md-6"><p class="mb-1 text-muted small">Department</p><h6 class="fw-bold">${p.department}</h6></div>
                        <div class="col-md-6"><p class="mb-1 text-muted small">Designation</p><h6 class="fw-bold">${p.designation}</h6></div>
                        <div class="col-md-6"><p class="mb-1 text-muted small">Email</p><h6 class="fw-bold">${p.email}</h6></div>
                        <div class="col-md-6"><p class="mb-1 text-muted small">Phone</p><h6 class="fw-bold">${p.phone}</h6></div>
                        <div class="col-md-6"><p class="mb-1 text-muted small">Joining Date</p><h6 class="fw-bold">${p.joining_date}</h6></div>
                        <div class="col-md-6"><p class="mb-1 text-muted small">Status</p><h6 class="fw-bold">${p.status}</h6></div>
                        <div class="col-md-6"><p class="mb-1 text-muted small">Base Salary</p><h6 class="fw-bold">₹${parseFloat(p.salary || 0).toLocaleString()}</h6></div>
                        <div class="col-md-12"><p class="mb-1 text-muted small">Current Project Working On</p><h6 class="fw-bold text-primary">${p.current_project || 'None'}</h6></div>
                        <div class="col-md-12 mt-3 text-end">
                            <button class="btn btn-primary btn-sm" id="editProfileBtn"><i class="fas fa-edit"></i> Edit Profile</button>
                        </div>
                    `;
                    
                    document.getElementById('editProfileBtn').addEventListener('click', () => {
                        profileDiv.innerHTML = `
                            <form id="editProfileForm" class="row g-4 w-100 m-0 p-2">
                                <div class="col-md-6">
                                    <label class="form-label text-muted small fw-semibold mb-2">Employee ID</label>
                                    <input type="text" class="form-control glass-input py-2" id="editEmpId" value="${p.employee_id}">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label text-muted small fw-semibold mb-2">Name</label>
                                    <input type="text" class="form-control glass-input py-2" id="editEmpName" value="${p.name}">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label text-muted small fw-semibold mb-2">Department</label>
                                    <input type="text" class="form-control glass-input py-2" id="editEmpDept" value="${p.department}">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label text-muted small fw-semibold mb-2">Designation</label>
                                    <input type="text" class="form-control glass-input py-2" id="editEmpDesig" value="${p.designation}">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label text-muted small fw-semibold mb-2">Email</label>
                                    <input type="email" class="form-control glass-input py-2" id="editEmpEmail" value="${p.email}">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label text-muted small fw-semibold mb-2">Phone</label>
                                    <input type="text" class="form-control glass-input py-2" id="editEmpPhone" value="${p.phone}">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label text-muted small fw-semibold mb-2">Joining Date</label>
                                    <input type="date" class="form-control glass-input py-2" id="editEmpDate" value="${p.joining_date}">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label text-muted small fw-semibold mb-2">Status</label>
                                    <select class="form-select glass-input py-2" id="editEmpStatus">
                                        <option value="Active" ${p.status === 'Active' ? 'selected' : ''}>Active</option>
                                        <option value="Inactive" ${p.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label text-muted small fw-semibold mb-2">Base Salary</label>
                                    <input type="number" class="form-control glass-input py-2" id="editEmpSalary" value="${p.salary}">
                                </div>
                                <div class="col-12"><h6 class="fw-bold text-primary border-bottom pb-2 mt-3">Login Details</h6></div>
                                <div class="col-md-6">
                                    <label class="form-label text-muted small fw-semibold mb-2">Username</label>
                                    <input type="text" class="form-control glass-input py-2" id="editEmpUsername" value="${p.username || ''}">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label text-muted small fw-semibold mb-2">New Password (leave blank to keep current)</label>
                                    <input type="password" class="form-control glass-input py-2" id="editEmpPassword" placeholder="••••••••">
                                </div>
                                <div class="col-md-12 mt-4 pt-3 border-top border-secondary text-end">
                                    <button type="button" class="btn btn-light px-4 me-2" id="cancelEditBtn">Cancel</button>
                                    <button type="submit" class="btn btn-success px-4"><i class="fas fa-save me-1"></i> Save Changes</button>
                                </div>
                            </form>
                        `;
                        
                        document.getElementById('cancelEditBtn').addEventListener('click', renderProfile);
                        document.getElementById('editProfileForm').addEventListener('submit', async (ev) => {
                            ev.preventDefault();
                            const updatedData = {
                                  employee_id: document.getElementById('editEmpId').value,
                                  name: document.getElementById('editEmpName').value,
                                  department: document.getElementById('editEmpDept').value,
                                  designation: document.getElementById('editEmpDesig').value,
                                  email: document.getElementById('editEmpEmail').value,
                                  phone: document.getElementById('editEmpPhone') ? document.getElementById('editEmpPhone').value : '',
                                  joining_date: document.getElementById('editEmpDate') ? document.getElementById('editEmpDate').value : '',
                                  status: document.getElementById('editEmpStatus') ? document.getElementById('editEmpStatus').value : 'Active',
                                  salary: document.getElementById('editEmpSalary') ? parseFloat(document.getElementById('editEmpSalary').value || 0) : 0,
                                  username: document.getElementById('editEmpUsername') ? document.getElementById('editEmpUsername').value : '',
                                  password: document.getElementById('editEmpPassword') ? document.getElementById('editEmpPassword').value : ''
                              };
                            
                            try {
                                const updateRes = await fetch(`/api/employees/${p.id}`, {
                                    method: 'PUT',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify(updatedData)
                                });
                                if (updateRes.ok) {
                                    Object.assign(p, updatedData);
                                    renderProfile();
                                    loadEmployees(); // refresh main table
                                } else {
                                    alert('Failed to update employee.');
                                }
                            } catch (e) {
                                console.error(e);
                                alert('Error updating employee.');
                            }
                        });
                    });
                };
                
                renderProfile();
                
                // Populate Attendance
                const attSummary = document.getElementById('detailAttendanceSummary');
                const attTab = document.getElementById('attendance-tab');
                if (data.profile && data.profile.days_worked_month) {
                    if (attSummary) attSummary.textContent = `${data.profile.days_worked_month} Days Worked`;
                    if (attTab) attTab.textContent = `Attendance (${data.profile.days_worked_month})`;
                } else if (attTab) {
                    attTab.textContent = 'Attendance';
                }
                const attBody = document.getElementById('detailAttendanceBody');
                attBody.innerHTML = '';
                if (data.attendance.length === 0) {
                    attBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No attendance records found.</td></tr>';
                } else {
                    data.attendance.forEach(att => {
                        let statusBadge = att.status === 'Present' ? 'bg-success' : (att.status === 'Late' ? 'bg-warning' : 'bg-danger');
                        
                        let checkInStr = att.check_in || '';
                        let checkOutStr = att.check_out || '';
                        let workingHoursHtml = att.working_hours || '--:--';
                        
                        if (checkInStr && checkInStr !== 'nan' && (!checkOutStr || checkOutStr === 'nan' || checkOutStr === '--:--')) {
                            workingHoursHtml = `<span class="live-modal-timer" data-checkin="${checkInStr}">00:00:00</span> <i class="fas fa-circle text-success small ms-1" style="animation: pulse 1.5s infinite"></i>`;
                        } else if (checkInStr && checkInStr !== 'nan' && checkOutStr && checkOutStr !== 'nan' && !att.working_hours) {
                            const ci = new Date(checkInStr.replace(' ', 'T'));
                            const co = new Date(checkOutStr.replace(' ', 'T'));
                            const diffMs = co - ci;
                            if (diffMs > 0) {
                                const h = Math.floor(diffMs / 3600000);
                                const m = Math.floor((diffMs % 3600000) / 60000);
                                const s = Math.floor((diffMs % 60000) / 1000);
                                workingHoursHtml = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
                            }
                        }

                        attBody.innerHTML += `
                            <tr>
                                <td>${att.date}</td>
                                <td>${checkInStr && checkInStr !== 'nan' ? checkInStr : '--:--'}</td>
                                <td>${checkOutStr && checkOutStr !== 'nan' ? checkOutStr : '--:--'}</td>
                                <td>${workingHoursHtml}</td>
                                <td><span class="badge ${statusBadge}">${att.status}</span></td>
                            </tr>
                        `;
                    });
                    
                    // Start live timer for modal if any elements exist
                    if (window.modalTimerInterval) clearInterval(window.modalTimerInterval);
                    window.modalTimerInterval = setInterval(() => {
                        const timers = document.querySelectorAll('.live-modal-timer');
                        if (timers.length === 0) return;
                        
                        const now = new Date();
                        timers.forEach(timer => {
                            const ci = new Date(timer.getAttribute('data-checkin').replace(' ', 'T'));
                            const diffMs = now - ci;
                            if (diffMs > 0) {
                                const hrs = Math.floor(diffMs / 3600000);
                                const mins = Math.floor((diffMs % 3600000) / 60000);
                                const secs = Math.floor((diffMs % 60000) / 1000);
                                timer.textContent = 
                                    String(hrs).padStart(2, '0') + ':' + 
                                    String(mins).padStart(2, '0') + ':' + 
                                    String(secs).padStart(2, '0');
                            }
                        });
                    }, 1000);
                }
                
                // Populate Documents
                const docsBody = document.getElementById('detailDocumentsBody');
                docsBody.innerHTML = '';
                if (!data.documents || data.documents.length === 0) {
                    docsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No documents uploaded.</td></tr>';
                } else {
                    data.documents.forEach(doc => {
                        docsBody.innerHTML += `
                            <tr>
                                <td class="fw-semibold">${doc.doc_type || 'Unknown'}</td>
                                <td>${doc.filename || ''}</td>
                                <td>${doc.upload_date || ''}</td>
                                <td>
                                    <a href="/static/uploads/${doc.filename}" target="_blank" class="btn btn-sm btn-outline-primary shadow-sm rounded-pill px-3">
                                        <i class="fas fa-eye me-1"></i> View
                                    </a>
                                </td>
                            </tr>
                        `;
                    });
                }
                
                // Populate Leaves
                const leavesBody = document.getElementById('detailLeavesContent');
                if (leavesBody) {
                    leavesBody.innerHTML = '';
                    if (!data.leaves || data.leaves.length === 0) {
                        leavesBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No leave requests found.</td></tr>';
                    } else {
                        data.leaves.forEach(leave => {
                            let statusBadge = leave.status === 'Approved' ? 'bg-success' : (leave.status === 'Rejected' ? 'bg-danger' : 'bg-warning');
                            let actionBtns = '';
                            if (leave.status === 'Pending') {
                                actionBtns = `
                                    <button class="btn btn-sm btn-success me-1 approve-leave-btn" data-id="${leave.id}" title="Approve">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger reject-leave-btn" data-id="${leave.id}" title="Reject">
                                        <i class="fas fa-times"></i>
                                    </button>
                                `;
                            }
                            leavesBody.innerHTML += `
                                <tr>
                                    <td>${leave.start_date || ''}</td>
                                    <td>${leave.end_date || ''}</td>
                                    <td>${leave.reason || ''}</td>
                                    <td><span class="badge ${statusBadge}">${leave.status || 'Pending'}</span></td>
                                    <td>${actionBtns}</td>
                                </tr>
                            `;
                        });
                        
                        // Add event listeners for approve/reject
                        document.querySelectorAll('.approve-leave-btn').forEach(btn => {
                            btn.addEventListener('click', async (e) => {
                                const id = e.currentTarget.getAttribute('data-id');
                                await updateLeaveStatus(id, 'Approved');
                            });
                        });
                        document.querySelectorAll('.reject-leave-btn').forEach(btn => {
                            btn.addEventListener('click', async (e) => {
                                const id = e.currentTarget.getAttribute('data-id');
                                await updateLeaveStatus(id, 'Rejected');
                            });
                        });
                    }
                }
                
                // Reset tabs to show profile first
                const profileTab = new bootstrap.Tab(document.getElementById('profile-tab'));
                profileTab.show();
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('employeeDetailsModal'));
                modal.show();
                
            } catch (err) {
                console.error(err);
                alert("Failed to load employee details.");
            }
        }
        
        // Add Employee Form Submission
        const addEmployeeForm = document.getElementById('addEmployeeForm');
        if (addEmployeeForm) {
            addEmployeeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newEmp = {
                    name: document.getElementById('empName').value,
                    employee_id: document.getElementById('empId').value,
                    department: document.getElementById('empDepartment').value,
                    designation: document.getElementById('empDesignation').value,
                    email: document.getElementById('empEmail').value,
                    phone: document.getElementById('empPhone').value,
                    joining_date: document.getElementById('empJoinDate').value,
                    status: document.getElementById('empStatus').value,
                    salary: document.getElementById('empSalary') ? document.getElementById('empSalary').value : 0,
                    username: document.getElementById('empUsername') ? document.getElementById('empUsername').value : '',
                    password: document.getElementById('empPassword') ? document.getElementById('empPassword').value : ''
                };
                
                try {
                    const response = await fetch('/api/employees', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newEmp)
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        // Close modal using Bootstrap API
                        const modalEl = document.getElementById('addEmployeeModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        modal.hide();
                        
                        addEmployeeForm.reset();
                        loadEmployees();
                    } else {
                        alert("Error adding employee");
                    }
                } catch (err) {
                    alert("Error saving employee");
                }
            });
        }
    }
    
    // Expenses Management Logic
    const expenseTableBody = document.getElementById('expenseTableBody');
    if (expenseTableBody) {
        async function loadExpenses() {
            try {
                const response = await fetch('/api/expenses');
                const records = await response.json();
                
                expenseTableBody.innerHTML = '';
                if (records.length === 0) {
                    expenseTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No expenses found.</td></tr>';
                    return;
                }
                let totalExpenses = 0;
                
                if (records.length === 0) {
                    expenseTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4">No expenses found.</td></tr>';
                } else {
                    records.forEach(exp => {
                        const amount = parseFloat(exp.amount) || 0;
                        totalExpenses += amount;
                        
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td class="fw-semibold">${exp.name || 'Expense'}</td>
                            <td>₹${amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td>${exp.date || '--'}</td>
                            <td>
                                <button class="btn btn-sm btn-light text-primary edit-expense-btn" data-id="${exp.id}" data-name="${exp.name || ''}" data-amount="${exp.amount || ''}" data-date="${exp.date || ''}"><i class="fas fa-edit"></i> Edit</button>
                            </td>
                        `;
                        expenseTableBody.appendChild(tr);
                    });
                    
                    if (document.getElementById('statExpenseTotal')) document.getElementById('statExpenseTotal').innerText = `₹${totalExpenses.toLocaleString()}`;
                    
                    // Attach edit listeners
                    document.querySelectorAll('.edit-expense-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            document.getElementById('editExpId').value = e.currentTarget.getAttribute('data-id');
                            document.getElementById('editExpName').value = e.currentTarget.getAttribute('data-name');
                            document.getElementById('editExpAmount').value = e.currentTarget.getAttribute('data-amount');
                            document.getElementById('editExpDate').value = e.currentTarget.getAttribute('data-date');
                            
                            const modal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
                            modal.show();
                        });
                    });
                }
                
            } catch (err) {
                console.error("Error fetching expenses", err);
            }
        }
        
        loadExpenses();
        
        const addExpenseForm = document.getElementById('addExpenseForm');
        if (addExpenseForm) {
            addExpenseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newExp = {
                    name: document.getElementById('expName').value,
                    amount: document.getElementById('expAmount').value,
                    date: document.getElementById('expDate').value
                };
                
                try {
                    const response = await fetch('/api/expenses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newExp)
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        const modalEl = document.getElementById('addExpenseModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        modal.hide();
                        
                        addExpenseForm.reset();
                        loadExpenses();
                    } else {
                        alert("Error adding expense");
                    }
                } catch (err) {
                    alert("Error saving expense");
                }
            });
        }
        
        const editExpenseForm = document.getElementById('editExpenseForm');
        if (editExpenseForm) {
            editExpenseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const expId = document.getElementById('editExpId').value;
                const updateData = {
                    name: document.getElementById('editExpName').value,
                    amount: document.getElementById('editExpAmount').value,
                    date: document.getElementById('editExpDate').value
                };
                
                try {
                    const response = await fetch(`/api/expenses/${expId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        const modalEl = document.getElementById('editExpenseModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        modal.hide();
                        loadExpenses();
                    } else {
                        alert("Error updating expense");
                    }
                } catch (err) {
                    alert("Error saving expense");
                }
            });
        }
    }
    
    // Incomes Management Logic
    const incomeTableBody = document.getElementById('incomeTableBody');
    if (incomeTableBody) {
        async function loadIncomes() {
            try {
                const response = await fetch('/api/incomes');
                const records = await response.json();
                
                incomeTableBody.innerHTML = '';
                let totalIncomes = 0;
                
                if (records.length === 0) {
                    incomeTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4">No incomes found.</td></tr>';
                } else {
                    records.forEach(inc => {
                        const amount = parseFloat(inc.amount) || 0;
                        totalIncomes += amount;
                        
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td class="fw-semibold">${inc.name || 'Income'}</td>
                            <td>₹${amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td>${inc.date || '--'}</td>
                            <td>
                                <button class="btn btn-sm btn-light text-primary edit-income-btn" data-id="${inc.id}" data-name="${inc.name || ''}" data-amount="${inc.amount || ''}" data-date="${inc.date || ''}"><i class="fas fa-edit"></i> Edit</button>
                            </td>
                        `;
                        incomeTableBody.appendChild(tr);
                    });
                    
                    if (document.getElementById('statIncomeTotal')) document.getElementById('statIncomeTotal').innerText = `₹${totalIncomes.toLocaleString()}`;
                    
                    // Attach edit listeners
                    document.querySelectorAll('.edit-income-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            document.getElementById('editIncId').value = e.currentTarget.getAttribute('data-id');
                            document.getElementById('editIncName').value = e.currentTarget.getAttribute('data-name');
                            document.getElementById('editIncAmount').value = e.currentTarget.getAttribute('data-amount');
                            document.getElementById('editIncDate').value = e.currentTarget.getAttribute('data-date');
                            
                            const modal = new bootstrap.Modal(document.getElementById('editIncomeModal'));
                            modal.show();
                        });
                    });
                }
                
            } catch (err) {
                console.error("Error fetching incomes", err);
            }
        }
        
        loadIncomes();
        
        const addIncomeForm = document.getElementById('addIncomeForm');
        if (addIncomeForm) {
            addIncomeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newInc = {
                    name: document.getElementById('incName').value,
                    amount: document.getElementById('incAmount').value,
                    date: document.getElementById('incDate').value
                };
                
                try {
                    const response = await fetch('/api/incomes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newInc)
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        const modalEl = document.getElementById('addIncomeModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        modal.hide();
                        
                        addIncomeForm.reset();
                        loadIncomes();
                    } else {
                        alert("Error adding income");
                    }
                } catch (err) {
                    alert("Error saving income");
                }
            });
        }
        
        const editIncomeForm = document.getElementById('editIncomeForm');
        if (editIncomeForm) {
            editIncomeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const incId = document.getElementById('editIncId').value;
                const updateData = {
                    name: document.getElementById('editIncName').value,
                    amount: document.getElementById('editIncAmount').value,
                    date: document.getElementById('editIncDate').value
                };
                
                try {
                    const response = await fetch(`/api/incomes/${incId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        const modalEl = document.getElementById('editIncomeModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        modal.hide();
                        loadIncomes();
                    } else {
                        alert("Error updating income");
                    }
                } catch (err) {
                    alert("Error saving income");
                }
            });
        }
    }
    
    // Projects Management Logic
    const projectTableBody = document.getElementById('projectTableBody');
    if (projectTableBody) {
        async function loadClientsForDropdown() {
            try {
                const response = await fetch('/api/clients');
                const data = await response.json();
                const clientsList = data.clients || [];
                const projClientSelect = document.getElementById('projClient');
                if (projClientSelect && clientsList.length > 0) {
                    projClientSelect.innerHTML = '<option value="" disabled selected>Select a client...</option><option value="Renovora Tech">Renovora Tech</option>';
                    clientsList.forEach(c => {
                        const option = document.createElement('option');
                        option.value = c.name;
                        option.textContent = c.name + (c.company ? ` (${c.company})` : '');
                        projClientSelect.appendChild(option);
                    });
                }
            } catch (err) {
                console.error("Error fetching clients for dropdown", err);
            }
        }
        
        async function loadEmployeesForDropdown() {
            try {
                const response = await fetch('/api/employees');
                const employees = await response.json();
                const projTeamContainer = document.getElementById('projTeamContainer');
                if (projTeamContainer && employees.length > 0) {
                    projTeamContainer.innerHTML = '';
                    // Filter to only include active employees (case insensitive)
                    const activeEmployees = employees.filter(e => e.status && e.status.trim().toLowerCase() === 'active');
                    
                    if (activeEmployees.length === 0) {
                        projTeamContainer.innerHTML = '<span class="text-muted small">No active employees found.</span>';
                    } else {
                        activeEmployees.forEach((e, idx) => {
                            const value = e.initials || e.name;
                            const labelText = e.name + (e.department ? ` (${e.department})` : '');
                            
                            const div = document.createElement('div');
                            div.className = 'form-check';
                            
                            const input = document.createElement('input');
                            input.className = 'form-check-input team-checkbox';
                            input.type = 'checkbox';
                            input.value = value;
                            input.id = `teamCheck${idx}`;
                            
                            const label = document.createElement('label');
                            label.className = 'form-check-label';
                            label.htmlFor = `teamCheck${idx}`;
                            label.textContent = labelText;
                            
                            div.appendChild(input);
                            div.appendChild(label);
                            projTeamContainer.appendChild(div);
                        });
                    }
                }
            } catch (err) {
                console.error("Error fetching employees for dropdown", err);
            }
        }
        
        loadClientsForDropdown();
        loadEmployeesForDropdown();

        let allProjectsData = [];
        
        async function loadProjects() {
            try {
                const response = await fetch('/api/projects');
                const records = await response.json();
                allProjectsData = records;
                
                projectTableBody.innerHTML = '';
                if (records.length === 0) {
                    projectTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No projects found.</td></tr>';
                    return;
                }
                
                let runningTotal = 0;
                let completedTotal = 0;
                let pendingTotal = 0;
                let testingTotal = 0;
                
                records.forEach(proj => {
                    if (proj.status === 'Running') runningTotal++;
                    else if (proj.status === 'Completed') completedTotal++;
                    else if (proj.status === 'Onboarding') pendingTotal++;
                    else if (proj.status === 'Testing') testingTotal++;
                    
                    let badgeClass = 'bg-primary';
                    if (proj.status === 'Completed') badgeClass = 'bg-info text-dark';
                    else if (proj.status === 'Onboarding') badgeClass = 'bg-warning text-dark';
                    else if (proj.status === 'Testing') badgeClass = 'bg-secondary';
                    
                    // Parse Team Initials
                    const teamStr = proj.team || '';
                    const initials = teamStr.split(',').map(s => s.trim()).filter(s => s);
                    
                    let teamHtml = '<div class="d-flex">';
                    initials.forEach((initial, idx) => {
                        const mLeft = idx === 0 ? '0' : '-15px';
                        teamHtml += `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=random" class="profile-img-sm border border-white rounded-circle shadow-sm" style="margin-left: ${mLeft};">`;
                    });
                    teamHtml += '</div>';
                    if (initials.length === 0) teamHtml = '--';
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><a href="#" class="text-decoration-none view-project-details text-primary fw-semibold" data-id="${proj.id}">${proj.name || 'Project'}</a></td>
                        <td>${proj.client || '--'}</td>
                        <td>${teamHtml}</td>
                        <td>${proj.start_date || '--'}</td>
                        <td class="fw-semibold text-success">${proj.costing ? '₹' + Number(proj.costing).toLocaleString('en-IN') : '--'}</td>
                        <td>${proj.deadline || '--'}</td>
                        <td>${generateStatusSelect('projects', proj.id, proj.status, ['Running', 'Completed', 'Onboarding', 'Testing'], badgeClass)}</td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-light btn-action" onclick='openEditProjectModal(${JSON.stringify(proj).replace(/'/g, "\\'")})'>
                                <i class="fas fa-edit text-primary"></i>
                            </button>
                            <button class="btn btn-sm btn-light btn-action text-danger" onclick="deleteProject(${proj.id})">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    `;
                    projectTableBody.appendChild(tr);
                });
                
                if (document.getElementById('statTotalProjects')) document.getElementById('statTotalProjects').innerText = records.length;
                if (document.getElementById('statRunningProjects')) document.getElementById('statRunningProjects').innerText = runningTotal;
                if (document.getElementById('statCompletedProjects')) document.getElementById('statCompletedProjects').innerText = completedTotal;
                if (document.getElementById('statPendingProjects')) document.getElementById('statPendingProjects').innerText = pendingTotal;
                if (document.getElementById('statTestingProjects')) {
                    document.getElementById('statTestingProjects').innerText = testingTotal;
                }
                
            } catch (err) {
                console.error("Error fetching projects", err);
            }
            
            document.querySelectorAll('.view-project-details').forEach(el => {
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    const projectId = parseInt(this.getAttribute('data-id'));
                    const proj = allProjectsData.find(p => p.id === projectId);
                    if (proj) {
                        document.getElementById('detailProjectName').innerText = proj.name || 'Project';
                        document.getElementById('detailProjectClient').innerText = proj.client || '--';
                        document.getElementById('detailProjectDeadline').innerText = proj.deadline || '--';
                        
                        let badgeClass = 'bg-primary';
                        if (proj.status === 'Completed') badgeClass = 'bg-info text-dark';
                        else if (proj.status === 'Onboarding') badgeClass = 'bg-warning text-dark';
                        else if (proj.status === 'Testing') badgeClass = 'bg-secondary';
                        
                        const statusEl = document.getElementById('detailProjectStatus');
                        statusEl.innerText = proj.status || 'Unknown';
                        statusEl.className = 'badge ' + badgeClass;
                        
                        const teamStr = proj.team || '';
                        const initials = teamStr.split(',').map(s => s.trim()).filter(s => s);
                        let teamHtml = '';
                        if (initials.length === 0) {
                            teamHtml = '<span class="text-muted">No team assigned</span>';
                        } else {
                            initials.forEach(initial => {
                                teamHtml += `<span class="badge bg-secondary text-white"><i class="fas fa-user-circle me-1"></i>${initial}</span>`;
                            });
                        }
                        document.getElementById('detailProjectTeam').innerHTML = teamHtml;
                        
                        const modal = new bootstrap.Modal(document.getElementById('projectDetailsModal'));
                        modal.show();
                    }
                });
            });
        }
        
        loadProjects();
        
        const addProjectForm = document.getElementById('addProjectForm');
        if (addProjectForm) {
            addProjectForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Get all checked team members
                const teamCheckboxes = document.querySelectorAll('.team-checkbox:checked');
                const selectedTeam = Array.from(teamCheckboxes).map(cb => cb.value).join(', ');

                if (!selectedTeam) {
                    alert("Please select at least one team member.");
                    return;
                }

                const newProj = {
                    name: document.getElementById('projName').value,
                    client: document.getElementById('projClient').value,
                    team: selectedTeam,
                    start_date: document.getElementById('projStartDate').value,
                    costing: document.getElementById('projCosting').value,
                    deadline: document.getElementById('projDeadline').value,
                    status: document.getElementById('projStatus').value
                };
                
                try {
                    const response = await fetch('/api/projects', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newProj)
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        const modalEl = document.getElementById('addProjectModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        modal.hide();
                        
                        addProjectForm.reset();
                        loadProjects();
                    } else {
                        alert("Error adding project");
                    }
                } catch (err) {
                    alert("Error saving project");
                }
            });
        }
    }

        window.openEditProjectModal = function(proj) {
            document.getElementById('editProjId').value = proj.id;
            document.getElementById('editProjName').value = proj.name;
            if(document.getElementById('editProjClient').querySelector(`option[value="${proj.client}"]`)) {
                document.getElementById('editProjClient').value = proj.client;
            } else if (proj.client) {
                const opt = document.createElement('option');
                opt.value = proj.client;
                opt.text = proj.client;
                document.getElementById('editProjClient').appendChild(opt);
                document.getElementById('editProjClient').value = proj.client;
            }
            
            // Clone team checkboxes
            const addContainer = document.getElementById('projTeamContainer');
            const editContainer = document.getElementById('editProjTeamContainer');
            if(addContainer && editContainer) {
                editContainer.innerHTML = addContainer.innerHTML;
                const teamArr = (proj.team || '').split(',').map(s=>s.trim());
                editContainer.querySelectorAll('.team-checkbox').forEach(cb => {
                    cb.checked = teamArr.includes(cb.value);
                    cb.className = 'form-check-input edit-team-checkbox';
                });
            }

            document.getElementById('editProjStartDate').value = proj.start_date || '';
            document.getElementById('editProjCosting').value = proj.costing || '';
            document.getElementById('editProjDeadline').value = proj.deadline || '';
            document.getElementById('editProjStatus').value = proj.status || 'Running';
            
            var modal = new bootstrap.Modal(document.getElementById('editProjectModal'));
            modal.show();
        };

        window.deleteProject = async function(id) {
            if(confirm('Are you sure you want to delete this project?')) {
                try {
                    const res = await fetch('/api/delete_project/' + id, { method: 'DELETE' });
                    const data = await res.json();
                    if(data.success) {
                        loadProjects();
                    } else {
                        alert('Error deleting project');
                    }
                } catch(e) { console.error(e); }
            }
        };

        const editProjectForm = document.getElementById('editProjectForm');
        if (editProjectForm) {
            editProjectForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('editProjId').value;
                const teamCheckboxes = document.querySelectorAll('.edit-team-checkbox:checked');
                const selectedTeam = Array.from(teamCheckboxes).map(cb => cb.value).join(', ');
                
                const payload = {
                    name: document.getElementById('editProjName').value,
                    client: document.getElementById('editProjClient').value,
                    team: selectedTeam,
                    start_date: document.getElementById('editProjStartDate').value,
                    costing: document.getElementById('editProjCosting').value,
                    deadline: document.getElementById('editProjDeadline').value,
                    status: document.getElementById('editProjStatus').value
                };
                try {
                    const res = await fetch('/api/edit_project/' + id, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if(data.success) {
                        bootstrap.Modal.getInstance(document.getElementById('editProjectModal')).hide();
                        loadProjects();
                    } else {
                        alert('Error updating project');
                    }
                } catch(err) {
                    console.error(err);
                }
            });
        }
    
    // Daily Work Management Logic
    const workTableBody = document.getElementById('workTableBody');
    if (workTableBody) {
        let allWorkRecords = [];

        function renderWorkReports(records) {
            workTableBody.innerHTML = '';
            if (records.length === 0) {
                workTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No daily work reports found.</td></tr>';
                return;
            }
            
            records.forEach(report => {
                    let badgeClass = 'bg-secondary';
                    if (report.status === 'Done') badgeClass = 'bg-success';
                    else if (report.status === 'To Do') badgeClass = 'bg-warning text-dark';
                    else if (report.status === 'In Progress') badgeClass = 'bg-danger';
                    else if (report.status === 'Review') badgeClass = 'bg-info text-dark';
                    
                    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(report.name || report.emp_id)}&background=random`;
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${avatarUrl}" class="profile-img-sm me-3">
                                <span class="fw-semibold">${report.name || report.emp_id}</span>
                            </div>
                        </td>
                        <td>${report.date || '--'}</td>
                        <td><span class="text-muted small">${report.time || '--'}</span></td>
                        <td><span class="badge bg-light text-dark border">${report.project || 'N/A'}</span></td>
                          <td>
                              <div onclick="openReviewModal(${report.id}, \`${(report.description || '').replace(/`/g, '\\`')}\`, \`${(report.admin_review || '').replace(/`/g, '\\`')}\`)" style="cursor: pointer;" class="hover-opacity" title="Click to review">
                                  ${report.description || '--'}
                                  ${(report.admin_review && report.admin_review.trim() !== '') ? `<div class="mt-2 p-2 rounded border-start border-3 border-info" style="font-size: 0.85em; background-color: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color);"><i class="fas fa-reply fa-rotate-180 text-info me-2"></i><b>Admin:</b> ${report.admin_review}</div>` : ''}
                              </div>
                          </td>
                        <td>${report.hours ? report.hours + 'h' : '--'}</td>
                        <td>${generateStatusSelect('daily_work', report.id, report.status, ['To Do', 'Review', 'In Progress', 'Done'], badgeClass)}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditWorkModal(${JSON.stringify(report).replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;')})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteWork(${report.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                    `;
                    workTableBody.appendChild(tr);
                });
        }

        async function loadWorkReports() {
            try {
                const response = await fetch('/api/daily_work');
                allWorkRecords = await response.json();
                renderWorkReports(allWorkRecords);
            } catch (err) {
                console.error("Error fetching daily work reports", err);
            }
        }
        
        const filterBtn = document.getElementById('filterBtn');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => {
                const searchTxt = document.getElementById('searchEmployeeInput').value.toLowerCase();
                const filterDate = document.getElementById('filterDateInput').value;
                
                const filtered = allWorkRecords.filter(report => {
                    const empName = (report.name || report.emp_id || '').toLowerCase();
                    const matchesSearch = empName.includes(searchTxt);
                    const matchesDate = filterDate ? report.date === filterDate : true;
                    return matchesSearch && matchesDate;
                });
                
                renderWorkReports(filtered);
            });
        }
        
        async function loadEmployeesForWork() {
            try {
                const response = await fetch('/api/employees');
                const employees = await response.json();
                const select = document.getElementById('workEmployee');
                const editSelect = document.getElementById('editWorkEmployee');
                let optionsHtml = '<option value="">Select Employee</option>';
                employees.forEach(emp => {
                    if (emp.status === 'Active') {
                        optionsHtml += `<option value="${emp.employee_id}">${emp.name} (${emp.employee_id})</option>`;
                    }
                });
                if (select) select.innerHTML = optionsHtml;
                if (editSelect) editSelect.innerHTML = optionsHtml;
            } catch (err) {
                console.error("Error fetching employees for dropdown", err);
            }
        }
        
        loadWorkReports();
        loadEmployeesForWork();
        fetchAllProjectsForWork();
        
        const addWorkForm = document.getElementById('addWorkForm');
        if (addWorkForm) {
            addWorkForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newReport = {
                    emp_id: document.getElementById('workEmployee').value,
                    date: document.getElementById('workDate').value,
                    project: document.getElementById('workProject').value === 'Other' ? document.getElementById('workProjectOther').value : document.getElementById('workProject').value,
                    time: document.getElementById('workTime').value,
                    description: document.getElementById('workDescription').value,
                    status: document.getElementById('workStatus').value
                };
                
                try {
                    const response = await fetch('/api/save_work', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newReport)
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        const modalEl = document.getElementById('addWorkModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        modal.hide();
                        
                        addWorkForm.reset();
                        loadWorkReports();
                    } else {
                        alert("Error adding work report");
                    }
                } catch (err) {
                    alert("Error saving work report");
                }
            });
        }
    }
    
    // Clients Page logic
    const clientsTableBody = document.getElementById('clientsTableBody');
    if (clientsTableBody) {
        async function loadClients() {
            try {
                const res = await fetch('/api/clients');
                if (!res.ok) throw new Error("Failed to fetch clients");
                const data = await res.json();
                
                // Update stats
                if(document.getElementById('statTotalClients')) document.getElementById('statTotalClients').innerText = data.stats.total;
                if(document.getElementById('statLeadClients')) document.getElementById('statLeadClients').innerText = data.stats.leads || 0;
                if(document.getElementById('statActiveClients')) document.getElementById('statActiveClients').innerText = data.stats.active;
                if(document.getElementById('statCompletedProjects')) document.getElementById('statCompletedProjects').innerText = data.stats.completed_projects;
                
                // Render table
                clientsTableBody.innerHTML = '';
                if (data.clients.length === 0) {
                    clientsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No clients found.</td></tr>';
                } else {
                    data.clients.forEach(c => {
                        let badgeClass = 'bg-secondary';
                        if (c.status === 'Active') badgeClass = 'bg-success';
                        else if (c.status === 'Leads') badgeClass = 'bg-warning text-dark';
                        else if (c.status === 'Ongoing') badgeClass = 'bg-success'; // Fallback
                        // Clean initials for avatar
                        let nameInitials = c.name.split(' ').map(n=>n[0]).join('');
                        clientsTableBody.innerHTML += `
                            <tr>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random" class="profile-img-sm me-3">
                                        <span class="fw-semibold">${c.name}</span>
                                    </div>
                                </td>
                                <td>${c.company || '-'}</td>
                                <td>${c.phone || '-'}</td>
                                <td>${c.email || '-'}</td>
                                <td>${generateStatusSelect('clients', c.id, c.status, ['Leads', 'Active', 'Completed', 'Inactive'], badgeClass)}</td>
                                <td class="text-end">
                                    <button class="btn btn-sm btn-light btn-action" onclick='openEditClientModal(${JSON.stringify(c).replace(/'/g, "\\'")})'>
                                        <i class="fas fa-edit text-primary"></i>
                                    </button>
                                    <button class="btn btn-sm btn-light btn-action text-danger" onclick="deleteClient(${c.id})">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                }
            } catch (err) {
                console.error("Error loading clients:", err);
                clientsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Error loading clients</td></tr>';
            }
        }
        
        loadClients();
        
        const addClientForm = document.getElementById('addClientForm');
        if (addClientForm) {
            addClientForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newClient = {
                    name: document.getElementById('clientName').value,
                    company: document.getElementById('clientCompany').value,
                    phone: document.getElementById('clientPhone').value,
                    email: document.getElementById('clientEmail').value,
                    status: document.getElementById('clientStatus').value
                };
                
                try {
                    const response = await fetch('/api/clients', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newClient)
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        const modalEl = document.getElementById('addClientModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();
                        
                        addClientForm.reset();
                        loadClients();
                    } else {
                        alert("Error adding client: " + (data.error || "Unknown error"));
                    }
                } catch (err) {
                    console.error("Error saving client:", err);
                    alert("Error saving client.");
                }
            });
        }
    }

        window.openEditClientModal = function(client) {
            document.getElementById('editClientId').value = client.id;
            document.getElementById('editClientName').value = client.name;
            document.getElementById('editClientCompany').value = client.company;
            document.getElementById('editClientPhone').value = client.phone;
            document.getElementById('editClientEmail').value = client.email;
            var modal = new bootstrap.Modal(document.getElementById('editClientModal'));
            modal.show();
        };

        window.deleteClient = async function(id) {
            if(confirm('Are you sure you want to delete this client?')) {
                try {
                    const res = await fetch('/api/delete_client/' + id, { method: 'DELETE' });
                    const data = await res.json();
                    if(data.success) {
                        loadClients();
                    } else {
                        alert('Error deleting client');
                    }
                } catch(e) { console.error(e); }
            }
        };

        const editClientForm = document.getElementById('editClientForm');
        if (editClientForm) {
            editClientForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('editClientId').value;
                const payload = {
                    name: document.getElementById('editClientName').value,
                    company: document.getElementById('editClientCompany').value,
                    phone: document.getElementById('editClientPhone').value,
                    email: document.getElementById('editClientEmail').value
                };
                try {
                    const res = await fetch('/api/edit_client/' + id, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if(data.success) {
                        bootstrap.Modal.getInstance(document.getElementById('editClientModal')).hide();
                        loadClients();
                    } else {
                        alert('Error updating client');
                    }
                } catch(err) {
                    console.error(err);
                }
            });
        }
    
    // Attendance Page Leave Requests Logic
    const leaveTableBody = document.getElementById('leaveTableBody');
    if (leaveTableBody) {
        async function loadLeaves() {
            try {
                const res = await fetch('/api/leaves');
                if (!res.ok) throw new Error("Failed to fetch leaves");
                const leaves = await res.json();
                
                leaveTableBody.innerHTML = '';
                if (leaves.length === 0) {
                    leaveTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No leave requests found.</td></tr>';
                } else {
                    leaves.forEach(l => {
                        let badgeClass = 'bg-warning text-dark';
                        if (l.status === 'Approved') badgeClass = 'bg-success';
                        if (l.status === 'Rejected') badgeClass = 'bg-danger';
                        
                        leaveTableBody.innerHTML += `
                            <tr>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(l.name || l.emp_id)}&background=random" class="profile-img-sm me-3">
                                        <span class="fw-semibold">${l.name || l.emp_id}</span>
                                    </div>
                                </td>
                                <td>${l.start_date || '-'}</td>
                                <td>${l.end_date || '-'}</td>
                                <td>${l.reason || '-'}</td>
                                <td>${generateStatusSelect('leaves', l.id, l.status, ['Pending', 'Approved', 'Rejected'], badgeClass)}</td>
                            </tr>
                        `;
                    });
                }
            } catch (err) {
                console.error("Error loading leaves:", err);
                leaveTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error loading leaves</td></tr>';
            }
        }
        
        loadLeaves();
        
        // Populate the employee dropdown in leave form
        async function populateLeaveEmployees() {
            const select = document.getElementById('leaveEmployee');
            if (!select) return;
            try {
                const res = await fetch('/api/employees');
                const employees = await res.json();
                employees.forEach(emp => {
                    if (emp.status === 'Active') {
                        const opt = document.createElement('option');
                        opt.value = emp.employee_id;
                        opt.textContent = `${emp.name} (${emp.employee_id})`;
                        select.appendChild(opt);
                    }
                });
            } catch (err) {}
        }
        populateLeaveEmployees();
        
        const addLeaveForm = document.getElementById('addLeaveForm');
        if (addLeaveForm) {
            addLeaveForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newLeave = {
                    emp_id: document.getElementById('leaveEmployee').value,
                    start_date: document.getElementById('leaveStartDate').value,
                    end_date: document.getElementById('leaveEndDate').value,
                    reason: document.getElementById('leaveReason').value,
                    status: document.getElementById('leaveStatus').value
                };
                
                try {
                    const response = await fetch('/api/leaves', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLeave)
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        const modalEl = document.getElementById('addLeaveModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();
                        
                        addLeaveForm.reset();
                        loadLeaves();
                    } else {
                        alert("Error adding leave request: " + (data.error || "Unknown error"));
                    }
                } catch (err) {
                    console.error("Error saving leave:", err);
                    alert("Error saving leave.");
                }
            });
        }
    }
});
async function updateTableStatus(type, id, selectElement) {
    const newStatus = selectElement.value;
    try {
        const res = await fetch('/api/update_status', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ type: type, id: id, status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            let badgeClass = 'bg-secondary text-white';
            const ns = newStatus.toLowerCase();
            if (ns.includes('active') || ns.includes('approved') || ns.includes('running') || ns.includes('present') || ns.includes('paid')) badgeClass = 'bg-success text-white';
            else if (ns.includes('inactive') || ns.includes('rejected') || ns.includes('absent')) badgeClass = 'bg-danger text-white';
            else if (ns.includes('pending') || ns.includes('leads') || ns.includes('late')) badgeClass = 'bg-warning text-dark';
            else if (ns.includes('completed') || ns.includes('on leave') || ns.includes('changes')) badgeClass = 'bg-info text-dark';
            
            selectElement.className = `form-select form-select-sm fw-bold border-0 shadow-sm ${badgeClass}`;
        } else {
            alert('Failed to update status: ' + data.error);
        }
    } catch(err) {
        alert('Error updating status');
    }
}
function generateStatusSelect(type, id, currentStatus, options, badgeClass) {
    let isDarkText = badgeClass.includes('text-dark') || badgeClass.includes('bg-warning') || badgeClass.includes('bg-light');
    let textColorStyle = isDarkText ? 'color: #000 !important;' : 'color: #fff !important;';
    
    let html = `<select class="form-select form-select-sm fw-bold ${badgeClass} border-0 shadow-sm" onchange="updateTableStatus('${type}', ${id}, this)" style="width: auto; display: inline-block; cursor: pointer; border-radius: 20px; padding-right: 24px; padding-top: 4px; padding-bottom: 4px; ${textColorStyle}">`;
    options.forEach(opt => {
        const selected = opt === currentStatus ? 'selected' : '';
        html += `<option value="${opt}" ${selected} style="color: #000 !important; background-color: #fff !important;">${opt}</option>`;
    });
    html += `</select>`;
    return html;
}


// Admin Review Modal Logic
function openReviewModal(id, description, existingReview) {
    document.getElementById('reviewWorkId').value = id;
    document.getElementById('reviewOriginalDescription').innerText = description;
    document.getElementById('reviewWorkText').value = existingReview;
    const reviewModal = new bootstrap.Modal(document.getElementById('reviewWorkModal'));
    reviewModal.show();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('reviewWorkForm')) {
        document.getElementById('reviewWorkForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('reviewWorkId').value;
            const reviewText = document.getElementById('reviewWorkText').value;
            
            try {
                const res = await fetch('/api/review_work', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ id: id, review: reviewText })
                });
                const data = await res.json();
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById('reviewWorkModal')).hide();
                    loadDailyWork(); // Reload to show the review
                } else {
                    alert(data.error || 'Failed to save review');
                }
            } catch (err) {
                console.error('Error saving review:', err);
            }
        });
    }
});


document.addEventListener('DOMContentLoaded', () => {
    // Employee Dashboard specific logic
    const isEmployeeDashboard = document.getElementById('employeeTabs');
    if (isEmployeeDashboard) {
        
        async function loadMyWorkHistory() {
            try {
                const res = await fetch('/api/my_daily_work');
                const works = await res.json();
                const tbody = document.getElementById('myWorkTableBody');
                if (!tbody) return;
                
                tbody.innerHTML = '';
                if (works.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No work history found</td></tr>';
                    return;
                }
                
                works.forEach(w => {
                    let badgeClass = 'bg-secondary';
                    if (w.status === 'Done') badgeClass = 'bg-success';
                    else if (w.status === 'To Do') badgeClass = 'bg-warning text-dark';
                    else if (w.status === 'In Progress') badgeClass = 'bg-danger';
                    else if (w.status === 'Review') badgeClass = 'bg-info text-dark';
                    
                    let adminReviewHtml = '';
                    if (w.admin_review && w.admin_review.trim() !== '') {
                        adminReviewHtml = `<div class="mt-2 p-2 rounded border-start border-3 border-info" style="font-size: 0.85em; background-color: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color);"><i class="fas fa-reply fa-rotate-180 text-info me-2"></i><b>Admin:</b> ${w.admin_review}</div>`;
                    }
                    
                    tbody.innerHTML += `
                        <tr>
                            <td>${w.date || '--'}</td>
                            <td><span class="text-muted small">${w.time || '--'}</span></td>
                            <td><span class="badge bg-light text-dark border">${w.project || 'N/A'}</span></td>
                            <td>
                                ${w.description || '--'}
                                ${adminReviewHtml}
                            </td>
                            <td>${w.hours ? w.hours + 'h' : '--'}</td>
                            <td><span class="badge ${badgeClass}">${w.status}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary shadow-sm" onclick="openEditMyWorkModal(${w.id}, \`${(w.description || '').replace(/`/g, '\\`')}\`)">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </td>
                        </tr>
                    `;
                });
            } catch(e) {
                console.error("Error loading work history", e);
            }
        }
        
        async function loadMyLeaves() {
            try {
                const res = await fetch('/api/my_leaves');
                const leaves = await res.json();
                const tbody = document.getElementById('myLeavesTableBody');
                if (!tbody) return;
                
                tbody.innerHTML = '';
                if (leaves.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No leave requests found</td></tr>';
                    return;
                }
                
                leaves.forEach(l => {
                    let badgeClass = 'bg-warning text-dark';
                    if (l.status === 'Approved') badgeClass = 'bg-success';
                    if (l.status === 'Rejected') badgeClass = 'bg-danger';
                    
                    tbody.innerHTML += `
                        <tr>
                            <td>${l.start_date || '--'}</td>
                            <td>${l.end_date || '--'}</td>
                            <td>${l.reason || '--'}</td>
                            <td><span class="badge ${badgeClass}">${l.status}</span></td>
                        </tr>
                    `;
                });
            } catch(e) {
                console.error("Error loading leaves", e);
            }
        }
        
        loadMyWorkHistory();
        loadMyLeaves();
        
        window.openEditMyWorkModal = function(id, description) {
            document.getElementById('editMyWorkId').value = id;
            document.getElementById('editMyWorkText').value = description;
            const modal = new bootstrap.Modal(document.getElementById('editWorkModal'));
            modal.show();
        };
        
        const editMyWorkForm = document.getElementById('editMyWorkForm');
        if (editMyWorkForm) {
            editMyWorkForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('editMyWorkId').value;
                const desc = document.getElementById('editMyWorkText').value;
                
                try {
                    const res = await fetch('/api/edit_my_work', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({id: id, description: desc})
                    });
                    const data = await res.json();
                    if (data.success) {
                        bootstrap.Modal.getInstance(document.getElementById('editWorkModal')).hide();
                        loadMyWorkHistory();
                    } else {
                        alert(data.error || 'Failed to edit work');
                    }
                } catch(err) {
                    alert('Error editing work');
                }
            });
        }
        
        const requestLeaveForm = document.getElementById('requestLeaveForm');
        if (requestLeaveForm) {
            requestLeaveForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emp_id = document.body.getAttribute('data-emp-id');
                const newLeave = {
                    emp_id: emp_id,
                    start_date: document.getElementById('myLeaveStart').value,
                    end_date: document.getElementById('myLeaveEnd').value,
                    reason: document.getElementById('myLeaveReason').value,
                    status: 'Pending'
                };
                
                try {
                    const response = await fetch('/api/leaves', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newLeave)
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        bootstrap.Modal.getInstance(document.getElementById('requestLeaveModal')).hide();
                        requestLeaveForm.reset();
                        loadMyLeaves();
                    } else {
                        alert("Error adding leave request: " + (data.error || "Unknown error"));
                    }
                } catch (err) {
                    alert("Error saving leave.");
                }
            });
        }
    }
});


function editStatus() {
    const modalEl = document.getElementById('editStatusModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        // Fallback if modal doesn't exist for some reason
        const newStatus = prompt("Enter your new status (Active or Inactive):");
        if (newStatus === "Active" || newStatus === "Inactive") {
            saveStatusDirect(newStatus);
        } else if (newStatus) {
            alert("Only 'Active' or 'Inactive' are allowed.");
        }
    }
}

async function saveStatus() {
    const newStatus = document.getElementById('editStatusSelect').value;
    if (!newStatus) return;
    
    await saveStatusDirect(newStatus);
    const modalEl = document.getElementById('editStatusModal');
    if (modalEl) {
        bootstrap.Modal.getInstance(modalEl).hide();
    }
}

async function saveStatusDirect(newStatus) {
    try {
        const res = await fetch('/api/update_employee_status', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('display-status').textContent = newStatus;
        } else {
            alert(data.error || 'Failed to update status');
        }
    } catch(err) {
        console.error(err);
        alert('An error occurred');
    }
}

async function editProject() {
    const newProject = prompt("Enter your current project:");
    if (!newProject) return;
    
    try {
        const res = await fetch('/api/update_employee_status', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ project: newProject })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('display-project').textContent = newProject;
        } else {
            alert(data.error || 'Failed to update project');
        }
    } catch(err) {
        console.error(err);
        alert('An error occurred');
    }
}


// Override editProject to open modal instead of prompt
async function fetchPendingProjects() {
    try {
        const res = await fetch('/api/my_pending_projects');
        const projects = await res.json();
        
        const workSelect = document.getElementById('workProject');
        const modalSelect = document.getElementById('editProjectSelect');
        
        let optionsHtml = '<option value="" disabled selected>Select Project...</option>';
        projects.forEach(p => {
            optionsHtml += `<option value="${p.name}">${p.name} (${p.status})</option>`;
        });
        optionsHtml += '<option value="Other">Other</option>';
        
        if (workSelect) workSelect.innerHTML = optionsHtml;
        if (modalSelect) modalSelect.innerHTML = optionsHtml;
    } catch(err) {
        console.error("Failed to load projects", err);
    }
}

function editProject() {
    // Modal is opened via data-bs-toggle, but we might want to pre-select current
}

async function saveCurrentProject() {
    const select = document.getElementById('editProjectSelect');
    const newProject = select.value;
    if (!newProject) return alert("Please select a project");
    
    try {
        const res = await fetch('/api/update_employee_status', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ project: newProject })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('display-project').textContent = newProject;
            bootstrap.Modal.getInstance(document.getElementById('editProjectModal')).hide();
        } else {
            alert(data.error || 'Failed to update project');
        }
    } catch(err) {
        console.error(err);
        alert('An error occurred');
    }
}

// Modify workForm submission to include project
document.addEventListener('DOMContentLoaded', () => {
    fetchPendingProjects();
    
    // Also we can load today's submissions here
    loadTodaysSubmissions();
    
    const wf = document.getElementById('workForm');
    if (wf) {
        // Clone and replace to remove old listener
        const newWf = wf.cloneNode(true);
        wf.parentNode.replaceChild(newWf, wf);
        
        newWf.addEventListener('submit', async (e) => {
            e.preventDefault();
            const project = document.getElementById('workProject').value === 'Other' ? document.getElementById('workProjectOther').value : document.getElementById('workProject').value;
            const description = document.getElementById('workDescription').value;
            const time = document.getElementById('workTime').value;
            
            if(!project) return alert("Please select a project");
            
            try {
                const res = await fetch('/api/save_work', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project, description, time })
                });
                const data = await res.json();
                if (data.success) {
                    newWf.reset();
                    loadTodaysSubmissions();
                    // Also refresh the history table if it exists
                    if(typeof loadMyWork === 'function') loadMyWork();
                } else {
                    alert(data.error || 'Failed to save work');
                }
            } catch(error) {
                console.error(error);
                alert('An error occurred');
            }
        });
    }
});

async function loadTodaysSubmissions() {
    const list = document.getElementById('todaysSubmissionsList');
    if (!list) return;
    
    try {
        const res = await fetch('/api/my_daily_work');
        const data = await res.json();
        
        const today = new Date().toISOString().split('T')[0]; // Simple YYYY-MM-DD
        const todaysWork = data;
        
        if (todaysWork.length === 0) {
            list.innerHTML = '<div class="text-center text-muted small py-2">No recent submissions found.</div>';
            return;
        }
        
        let html = '';
        todaysWork.forEach(w => {
            html += `
                <div class="d-flex justify-content-between align-items-center p-2 mb-2 bg-white rounded border border-light shadow-sm">
                    <div>
                        <div class="fw-bold text-dark" style="font-size: 0.9rem;">${w.project} <span class="badge bg-secondary ms-2">${w.hours}h</span></div>
                        <div class="text-muted small text-truncate" style="max-width: 250px;">${w.description}</div>
                    </div>
                    <div class="text-end">
                        <div class="badge ${w.status === 'Done' ? 'bg-success' : w.status === 'Changes Requested' ? 'bg-danger' : 'bg-warning'}">${w.status}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">${w.time}</div>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
        
    } catch(err) {
        console.error("Failed to load today's submissions", err);
    }
}

// ==========================================
// RESTORED FEATURES
// ==========================================

// 1. Live Working Hours Timer
const liveTimerEl = document.getElementById('liveTimer');
let timerInterval = null;

async function initLiveTimer() {
    if (!liveTimerEl) return;
    try {
        const res = await fetch('/api/my_status');
        const data = await res.json();
        
        if (data.checked_in && data.check_in_time) {
            // Parse full date string e.g., "2026-08-10 13:41:23"
            const checkInTime = new Date(data.check_in_time.replace(' ', 'T'));

            if (timerInterval) clearInterval(timerInterval);
            
            const updateTimer = () => {
                const now = new Date();
                const diffMs = now - checkInTime;
                if (diffMs < 0) return;
                
                const hrs = Math.floor(diffMs / 3600000);
                const mins = Math.floor((diffMs % 3600000) / 60000);
                const secs = Math.floor((diffMs % 60000) / 1000);
                
                liveTimerEl.textContent = 
                    String(hrs).padStart(2, '0') + ':' + 
                    String(mins).padStart(2, '0') + ':' + 
                    String(secs).padStart(2, '0');
            };
            
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
        } else {
            if (timerInterval) clearInterval(timerInterval);
            liveTimerEl.textContent = '00:00:00';
        }
    } catch (err) {
        console.error("Timer error", err);
    }
}

// 2. Profile Photo Upload
document.addEventListener('DOMContentLoaded', () => {
    const photoInput = document.getElementById('profilePhotoInput');
    if (photoInput) {
        photoInput.addEventListener('change', async (e) => {
            if (!e.target.files || e.target.files.length === 0) return;
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('photo', file);
            
            try {
                const res = await fetch('/api/upload-profile-photo', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    location.reload();
                } else {
                    alert(data.message || 'Failed to upload photo');
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred during upload');
            }
        });
    }
});

async function removeProfilePhoto() {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;
    
    try {
        const res = await fetch('/api/remove-profile-photo', {
            method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
            location.reload();
        } else {
            alert(data.message || 'Failed to remove photo');
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred');
    }
}

// 3. Load My Documents
async function loadMyDocuments() {
    const tableBody = document.getElementById('myDocumentsTableBody');
    if (!tableBody) return;
    
    try {
        const res = await fetch('/api/my-documents');
        const data = await res.json();
        
        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No documents uploaded yet.</td></tr>';
            return;
        }
        
        let html = '';
        data.forEach(doc => {
            html += `
                <tr>
                    <td class="fw-semibold">${doc.doc_type || 'Unknown'}</td>
                    <td>${doc.filename || ''}</td>
                    <td>${doc.upload_date || ''}</td>
                    <td>
                        <a href="/static/uploads/${doc.filename}" target="_blank" class="btn btn-sm btn-outline-primary shadow-sm rounded-pill px-3">
                            <i class="fas fa-eye me-1"></i> View
                        </a>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
    } catch (err) {
        console.error("Failed to load documents", err);
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading documents.</td></tr>';
    }
}

// 4. Document Upload Handling
document.addEventListener('DOMContentLoaded', () => {
    initLiveTimer();
    loadMyDocuments();
    
    // Add hooks to checkin/checkout buttons to start/stop live timer without modifying their original callbacks heavily
    const checkInBtn = document.getElementById('checkInBtn');
    if (checkInBtn) {
        checkInBtn.addEventListener('click', () => {
            setTimeout(initLiveTimer, 1000); // Wait 1 sec for API to update
        });
    }
    
    const checkOutBtn = document.getElementById('checkOutBtn');
    if (checkOutBtn) {
        checkOutBtn.addEventListener('click', () => {
            setTimeout(initLiveTimer, 1000);
        });
    }
    
    const docForm = document.getElementById('documentUploadForm');
    if (docForm) {
        docForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fileInput = docForm.querySelector('input[type="file"]');
            const typeInput = docForm.querySelector('select');
            
            if (!fileInput.files.length) {
                alert('Please select a file');
                return;
            }
            
            const formData = new FormData();
            formData.append('document', fileInput.files[0]);
            formData.append('doc_type', typeInput.value);
            
            try {
                const res = await fetch('/api/upload-document', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                
                if (data.success) {
                    const successMsg = document.getElementById('docSuccessMessage');
                    if (successMsg) {
                        successMsg.classList.remove('d-none');
                        setTimeout(() => successMsg.classList.add('d-none'), 3000);
                    }
                    docForm.reset();
                    if (typeof loadMyDocuments === 'function') loadMyDocuments();
                } else {
                    alert(data.message || 'Upload failed');
                }
            } catch (err) {
                console.error(err);
                alert('Error uploading document');
            }
        });
    }
    
    // Forgot Password Logic
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fpBtnText = document.getElementById('fpBtnText');
            const fpBtnSpinner = document.getElementById('fpBtnSpinner');
            
            fpBtnText.classList.add('d-none');
            fpBtnSpinner.classList.remove('d-none');
            
            try {
                const res = await fetch('/api/forgot_password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: 'admin' })
                });
                const data = await res.json();
                
                if (data.success) {
                    alert(data.message);
                    bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal')).hide();
                    forgotPasswordForm.reset();
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred while sending the reset link.');
            } finally {
                fpBtnText.classList.remove('d-none');
                fpBtnSpinner.classList.add('d-none');
            }
        });
    }
    // Change Password Logic
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('cpCurrent').value;
            const newPassword = document.getElementById('cpNew').value;
            const confirmPassword = document.getElementById('cpConfirm').value;
            const cpUsernameEl = document.getElementById('cpUsername');
            const newUsername = cpUsernameEl ? cpUsernameEl.value : '';
            const cpBtnText = document.getElementById('cpBtnText');
            const cpBtnSpinner = document.getElementById('cpBtnSpinner');
            
            if (newPassword !== confirmPassword) {
                alert('New passwords do not match!');
                return;
            }
            
            cpBtnText.classList.add('d-none');
            cpBtnSpinner.classList.remove('d-none');
            
            try {
                const res = await fetch('/api/change_password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, new_username: newUsername })
                });
                const data = await res.json();
                
                if (data.success) {
                    alert('Password updated successfully!');
                    bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
                    changePasswordForm.reset();
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred while updating the password.');
            } finally {
                cpBtnText.classList.remove('d-none');
                cpBtnSpinner.classList.add('d-none');
            }
        });
    }

    // Toggle Password Visibility on Login Page
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');
    
    if (togglePassword && passwordInput && togglePasswordIcon) {
        togglePassword.addEventListener('click', function () {
            // Toggle the type attribute
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle the icon
            if (type === 'password') {
                togglePasswordIcon.classList.remove('fa-eye-slash');
                togglePasswordIcon.classList.add('fa-eye');
            } else {
                togglePasswordIcon.classList.remove('fa-eye');
                togglePasswordIcon.classList.add('fa-eye-slash');
            }
        });
    }

    // Toggle Password Visibility on Add Employee Page
    const toggleEmpPassword = document.getElementById('toggleEmpPassword');
    const empPasswordInput = document.getElementById('empPassword');
    const toggleEmpPasswordIcon = document.getElementById('toggleEmpPasswordIcon');
    
    if (toggleEmpPassword && empPasswordInput && toggleEmpPasswordIcon) {
        toggleEmpPassword.addEventListener('click', function () {
            const type = empPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            empPasswordInput.setAttribute('type', type);
            
            if (type === 'password') {
                toggleEmpPasswordIcon.classList.remove('fa-eye-slash');
                toggleEmpPasswordIcon.classList.add('fa-eye');
            } else {
                toggleEmpPasswordIcon.classList.remove('fa-eye');
                toggleEmpPasswordIcon.classList.add('fa-eye-slash');
            }
        });
    }
});

async function fetchAllProjectsForWork() {
    try {
        const res = await fetch('/api/projects');
        const projects = await res.json();
        const workSelect = document.getElementById('workProject');
        const editWorkSelect = document.getElementById('editWorkProject');
        
        let optionsHtml = '<option value="" disabled selected>Select Project...</option>';
        projects.forEach(p => {
            optionsHtml += `<option value="${p.name}">${p.name} (${p.status})</option>`;
        });
        optionsHtml += '<option value="Other">Other</option>';
        if (workSelect) workSelect.innerHTML = optionsHtml;
        if (editWorkSelect) editWorkSelect.innerHTML = optionsHtml;
    } catch(err) {
        console.error("Failed to load projects", err);
    }
}

window.openEditWorkModal = function(report) {
    document.getElementById('editWorkId').value = report.id;
    document.getElementById('editWorkEmployee').value = report.emp_id || '';
    document.getElementById('editWorkDate').value = report.date || '';
    
    // Set project
    const projSelect = document.getElementById('editWorkProject');
    let hasProj = false;
    Array.from(projSelect.options).forEach(opt => {
        if(opt.value === report.project) hasProj = true;
    });
    if(hasProj) {
        projSelect.value = report.project;
        document.getElementById('editOtherProjectDiv').style.display = 'none';
    } else {
        projSelect.value = 'Other';
        document.getElementById('editOtherProjectDiv').style.display = 'block';
        document.getElementById('editWorkProjectOther').value = report.project;
    }
    
    document.getElementById('editWorkTime').value = report.time || '';
    document.getElementById('editWorkDescription').value = report.description || '';
    document.getElementById('editWorkStatus').value = report.status || 'To Do';
    
    new bootstrap.Modal(document.getElementById('editWorkModal')).show();
};

window.deleteWork = async function(id) {
    if(!confirm('Are you sure you want to delete this work report?')) return;
    try {
        const res = await fetch(`/api/delete_work/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if(data.success) {
            loadWorkReports();
        } else {
            alert('Failed to delete');
        }
    } catch(err) {
        console.error(err);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const editWorkForm = document.getElementById('editWorkForm');
    if (editWorkForm) {
        editWorkForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const projSelect = document.getElementById('editWorkProject').value;
            const project = projSelect === 'Other' ? document.getElementById('editWorkProjectOther').value : projSelect;
            
            const payload = {
                id: document.getElementById('editWorkId').value,
                emp_id: document.getElementById('editWorkEmployee').value,
                date: document.getElementById('editWorkDate').value,
                project: project,
                time: document.getElementById('editWorkTime').value,
                description: document.getElementById('editWorkDescription').value,
                status: document.getElementById('editWorkStatus').value
            };
            
            try {
                const res = await fetch('/api/edit_daily_work', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if(data.success) {
                    bootstrap.Modal.getInstance(document.getElementById('editWorkModal')).hide();
                    loadWorkReports();
                } else {
                    alert('Error updating');
                }
            } catch(err) {
                console.error(err);
            }
        });
    }
});


// GLOBAL SUBMIT PROTECTOR
(function() {
    let activeButtons = new Set();
    
    document.addEventListener('submit', (e) => {
        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) {
            // Prevent double click
            if (btn.disabled) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return;
            }
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Saving...';
            btn.disabled = true;
            activeButtons.add(btn);
        }
    }, true); // Use capture phase so it runs first

    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            return await originalFetch.apply(this, args);
        } finally {
            // If the fetch finished, wait 500ms and re-enable any disabled submit buttons
            setTimeout(() => {
                activeButtons.forEach(btn => {
                    if (document.body.contains(btn)) {
                        btn.disabled = false;
                        if (btn.dataset.originalText) {
                            btn.innerHTML = btn.dataset.originalText;
                        }
                    }
                });
                activeButtons.clear();
            }, 500);
        }
    };
})();


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
                                const isLeave = (h.type === 'Leave');
                                let bgColor = isHoliday ? 'rgba(220, 53, 69, 0.2)' : 'rgba(25, 135, 84, 0.2)';
                                if (isLeave) bgColor = 'rgba(13, 110, 253, 0.2)'; // Blue for leaves
                                
                                let eventColor = isHoliday ? '#dc3545' : '#198754';
                                if (isLeave) eventColor = '#0d6efd'; // Blue for leaves
                                
                                const title = h.name || (isHoliday ? 'Holiday' : 'Working Day');
                                
                                // Add visible event
                                let evt = {
                                    id: h.id,
                                    title: title,
                                    start: h.date,
                                    color: eventColor,
                                    allDay: true,
                                    extendedProps: { type: h.type }
                                };
                                if (h.end) evt.end = h.end;
                                events.push(evt);
                                
                                // Add background color for that day
                                let bgEvt = {
                                    id: 'bg-' + h.id,
                                    start: h.date,
                                    display: 'background',
                                    color: bgColor
                                };
                                if (h.end) bgEvt.end = h.end;
                                events.push(bgEvt);
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
                        } else {
                            const leaveModal = document.getElementById('requestLeaveModal');
                            if (leaveModal) {
                                document.getElementById('myLeaveStart').value = info.dateStr;
                                document.getElementById('myLeaveEnd').value = info.dateStr;
                                const calModal = bootstrap.Modal.getInstance(document.getElementById('globalCalendarModal'));
                                if (calModal) calModal.hide();
                                new bootstrap.Modal(leaveModal).show();
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
                        } else {
                            const leaveModal = document.getElementById('requestLeaveModal');
                            if (leaveModal) {
                                document.getElementById('myLeaveStart').value = info.event.startStr;
                                document.getElementById('myLeaveEnd').value = info.event.startStr;
                                const calModal = bootstrap.Modal.getInstance(document.getElementById('globalCalendarModal'));
                                if (calModal) calModal.hide();
                                new bootstrap.Modal(leaveModal).show();
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

// Certificate Generation
window.openCertificateModal = function() {
    if (!window.currentViewEmployeeId) {
        alert("Please select an employee first.");
        return;
    }
    const modal = new bootstrap.Modal(document.getElementById('certificateModal'));
    document.getElementById('certReviewText').value = '';
    modal.show();
};

document.addEventListener('DOMContentLoaded', () => {
    const certForm = document.getElementById('certificateForm');
    if (certForm) {
        certForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!window.currentViewEmployeeId) return;
            const reviewText = document.getElementById('certReviewText').value;
            const encodedReview = encodeURIComponent(reviewText);
            const url = `/api/employees/${window.currentViewEmployeeId}/certificate?review=${encodedReview}`;
            window.open(url, '_blank');
            bootstrap.Modal.getInstance(document.getElementById('certificateModal')).hide();
        });
    }
});
