let currentCharts = [];

function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        textColor: isDark ? '#f9fafb' : '#1f2937',
        gridColor: isDark ? '#374151' : '#e5e7eb',
        primary: '#2563EB',
        accent: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444'
    };
}

async function renderCharts() {
    // Destroy existing charts
    currentCharts.forEach(chart => chart.destroy());
    currentCharts = [];

    const colors = getChartColors();
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: colors.textColor }
            }
        },
        scales: {
            x: {
                ticks: { color: colors.textColor },
                grid: { color: colors.gridColor }
            },
            y: {
                ticks: { color: colors.textColor },
                grid: { color: colors.gridColor }
            }
        }
    };

    let dashboardData = null;
    
    // Fetch live data if we are on the admin dashboard or projects page
    if (document.getElementById('statTotalEmployees') || document.getElementById('projectChart')) {
        try {
            const res = await fetch('/api/admin/dashboard');
            dashboardData = await res.json();
            
            // Update Stat Cards
            if (document.getElementById('statTotalEmployees')) document.getElementById('statTotalEmployees').innerText = dashboardData.total_employees;
            if (document.getElementById('statPresentToday')) document.getElementById('statPresentToday').innerText = dashboardData.present_today;
            if (document.getElementById('statRunningProjects')) document.getElementById('statRunningProjects').innerText = dashboardData.running_projects;
            
            if (document.getElementById('statTotalClients')) {
                document.getElementById('statTotalClients').innerText = dashboardData.total_clients;
            }
            if (document.getElementById('statTotalLeads')) {
                document.getElementById('statTotalLeads').innerText = dashboardData.total_leads;
            }
            if (document.getElementById('statTotalClosed')) {
                document.getElementById('statTotalClosed').innerText = dashboardData.total_closed;
            }
        } catch (err) {
            console.error('Failed to fetch admin dashboard data:', err);
        }
    }

    // Expense Analysis Chart (Admin Dashboard)
    const attendanceCtx = document.getElementById('attendanceChart');
    if (attendanceCtx && dashboardData && dashboardData.expense_analysis) {
        const chart = new Chart(attendanceCtx, {
            type: 'bar',
            data: {
                labels: dashboardData.expense_analysis.labels.length > 0 ? dashboardData.expense_analysis.labels : ['No Expenses'],
                datasets: [
                    {
                        label: 'Total Expenses (₹)',
                        data: dashboardData.expense_analysis.data.length > 0 ? dashboardData.expense_analysis.data : [0],
                        backgroundColor: colors.primary,
                        borderRadius: 4
                    }
                ]
            },
            options: commonOptions
        });
        currentCharts.push(chart);
    }

    // Project Status Chart (Admin Dashboard)
    const projectCtx = document.getElementById('projectChart');
    if (projectCtx && dashboardData && dashboardData.project_status) {
        const pieOptions = { ...commonOptions };
        delete pieOptions.scales; // Pie charts don't have x/y scales
        
        // Use default palette for pie chart
        const palette = [colors.accent, colors.primary, colors.warning, colors.danger, '#8B5CF6', '#EC4899'];
        
        const chart = new Chart(projectCtx, {
            type: 'doughnut',
            data: {
                labels: dashboardData.project_status.labels.length > 0 ? dashboardData.project_status.labels : ['No Projects'],
                datasets: [{
                    data: dashboardData.project_status.data.length > 0 ? dashboardData.project_status.data : [1],
                    backgroundColor: palette.slice(0, Math.max(1, dashboardData.project_status.labels.length)),
                    borderWidth: 0
                }]
            },
            options: pieOptions
        });
        currentCharts.push(chart);
    }
}

// Initial render if Chart.js is loaded
if (typeof Chart !== 'undefined') {
    document.addEventListener('DOMContentLoaded', renderCharts);
}
