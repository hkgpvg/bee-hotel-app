// Bee Hotel Dashboard Application
let allData = [];
let filteredData = [];
let currentPage = 1;
let recordsPerPage = 10;
let tempChart, humidityChart, fanChart;

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('bee_data.json');
        allData = await response.json();
        
        // Parse dates properly
        allData = allData.map(record => ({
            ...record,
            parsedDate: parseDate(record.Date, record.Time)
        })).filter(r => r.parsedDate !== null);
        
        // Sort by date (newest first)
        allData.sort((a, b) => b.parsedDate - a.parsedDate);
        
        filteredData = [...allData];
        
        // Set default date range
        initializeDateRange();
        
        // Initialize all panels
        updateCurrentStatus();
        initializeCharts();
        updateAlertLog();
        updateDataTable();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log(`✓ Loaded ${allData.length} records`);
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Please check the console for details.');
    }
});

// Parse date from DD/MM/YYYY format
function parseDate(dateStr, timeStr) {
    try {
        const [day, month, year] = dateStr.split('/');
        const date = new Date(year, month - 1, day);
        if (timeStr) {
            const [hours, minutes, seconds] = timeStr.split(':');
            date.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
        }
        return date;
    } catch (e) {
        return null;
    }
}

// Initialize date range inputs
function initializeDateRange() {
    const dates = allData.map(r => r.parsedDate);
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    document.getElementById('startDate').value = formatDateInput(minDate);
    document.getElementById('endDate').value = formatDateInput(maxDate);
}

function formatDateInput(date) {
    return date.toISOString().split('T')[0];
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('applyFilter').addEventListener('click', applyDateFilter);
    document.getElementById('resetFilter').addEventListener('click', resetFilter);
    document.getElementById('searchInput').addEventListener('input', filterDataTable);
    document.getElementById('recordsPerPage').addEventListener('change', (e) => {
        recordsPerPage = parseInt(e.target.value);
        currentPage = 1;
        updateDataTable();
    });
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateDataTable();
        }
    });
    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / recordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateDataTable();
        }
    });
}

// Apply date filter
function applyDateFilter() {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    endDate.setHours(23, 59, 59);
    
    filteredData = allData.filter(record => {
        return record.parsedDate >= startDate && record.parsedDate <= endDate;
    });
    
    currentPage = 1;
    updateCurrentStatus();
    updateCharts();
    updateAlertLog();
    updateDataTable();
}

// Reset filter
function resetFilter() {
    filteredData = [...allData];
    currentPage = 1;
    initializeDateRange();
    updateCurrentStatus();
    updateCharts();
    updateAlertLog();
    updateDataTable();
}

// Panel 1: Current Status
function updateCurrentStatus() {
    const latest = filteredData[0];
    if (!latest) return;
    
    document.getElementById('currentIndoorTemp').textContent = 
        latest['Indoor Temp (C)']?.toFixed(1) || '--';
    document.getElementById('currentOutdoorTemp').textContent = 
        latest['Outdoor Temp (C)']?.toFixed(1) || '--';
    document.getElementById('currentIndoorHumidity').textContent = 
        latest['Indoor Humidity (%)'] || '--';
    document.getElementById('currentOutdoorHumidity').textContent = 
        latest['Outdoor Humidity (%)']?.toFixed(0) || '--';
    
    const fanStatus = document.getElementById('currentFanStatus');
    fanStatus.textContent = latest['Fan Status'] || '--';
    fanStatus.className = 'metric-value status-indicator ' + 
        (latest['Fan Status'] === 'ON' ? 'on' : 'off');
    
    document.getElementById('lastUpdate').textContent = 
        `${latest.Date} ${latest.Time}`;
}

// Initialize charts
function initializeCharts() {
    // Temperature Chart
    const tempCtx = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Indoor Temp (°C)',
                    data: [],
                    borderColor: '#f56565',
                    backgroundColor: 'rgba(245, 101, 101, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Outdoor Temp (°C)',
                    data: [],
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    }
                },
                y: {
                    beginAtZero: false
                }
            }
        }
    });
    
    // Humidity Chart
    const humidityCtx = document.getElementById('humidityChart').getContext('2d');
    humidityChart = new Chart(humidityCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Indoor Humidity (%)',
                    data: [],
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Outdoor Humidity (%)',
                    data: [],
                    borderColor: '#ed8936',
                    backgroundColor: 'rgba(237, 137, 54, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    }
                },
                y: {
                    beginAtZero: false
                }
            }
        }
    });
    
    // Fan Status Chart
    const fanCtx = document.getElementById('fanChart').getContext('2d');
    fanChart = new Chart(fanCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Fan Status',
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 1,
                    ticks: {
                        callback: function(value) {
                            return value === 0 ? 'OFF' : 'ON';
                        }
                    }
                }
            }
        }
    });
    
    updateCharts();
}

// Update charts with filtered data
function updateCharts() {
    // Sample data for charts (every 10th record for performance)
    const sampleRate = Math.max(1, Math.floor(filteredData.length / 200));
    const sampledData = filteredData.filter((_, i) => i % sampleRate === 0);
    
    // Sort chronologically for charts
    const chartData = [...sampledData].sort((a, b) => a.parsedDate - b.parsedDate);
    
    // Temperature Chart
    tempChart.data.labels = chartData.map(r => r.parsedDate);
    tempChart.data.datasets[0].data = chartData.map(r => r['Indoor Temp (C)']);
    tempChart.data.datasets[1].data = chartData.map(r => r['Outdoor Temp (C)']);
    tempChart.update();
    
    // Humidity Chart
    humidityChart.data.labels = chartData.map(r => r.parsedDate);
    humidityChart.data.datasets[0].data = chartData.map(r => r['Indoor Humidity (%)']);
    humidityChart.data.datasets[1].data = chartData.map(r => r['Outdoor Humidity (%)']);
    humidityChart.update();
    
    // Fan Status Chart
    fanChart.data.labels = chartData.map(r => r.parsedDate);
    fanChart.data.datasets[0].data = chartData.map(r => r['Fan Status'] === 'ON' ? 1 : 0);
    fanChart.data.datasets[0].backgroundColor = chartData.map(r => 
        r['Fan Status'] === 'ON' ? '#48bb78' : '#fc8181'
    );
    fanChart.data.datasets[0].borderColor = chartData.map(r => 
        r['Fan Status'] === 'ON' ? '#38a169' : '#f56565'
    );
    fanChart.update();
}

// Panel 5: Alert Log
function updateAlertLog() {
    const alerts = filteredData.filter(r => r.Alert === 'YES');
    
    document.getElementById('totalAlerts').textContent = alerts.length;
    document.getElementById('alertRate').textContent = 
        ((alerts.length / filteredData.length) * 100).toFixed(1) + '%';
    
    const tableBody = document.getElementById('alertTableBody');
    
    if (alerts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No alerts in selected range</td></tr>';
        return;
    }
    
    // Show last 50 alerts
    const recentAlerts = alerts.slice(0, 50);
    
    tableBody.innerHTML = recentAlerts.map(alert => `
        <tr>
            <td>${alert.Date}</td>
            <td>${alert.Time}</td>
            <td style="color: #e53e3e; font-weight: 600;">ALERT</td>
            <td>${alert['Indoor Temp (C)']?.toFixed(1)}°C</td>
            <td>${alert['Outdoor Temp (C)']?.toFixed(1)}°C</td>
        </tr>
    `).join('');
}

// Panel 6: Data Explorer
function updateDataTable() {
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageData = filteredData.slice(start, end);
    
    const tableBody = document.getElementById('dataTableBody');
    
    if (pageData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No records found</td></tr>';
    } else {
        tableBody.innerHTML = pageData.map(record => `
            <tr>
                <td>${record.Date}</td>
                <td>${record.Time}</td>
                <td>${record['Indoor Temp (C)']?.toFixed(1)}°C</td>
                <td>${record['Outdoor Temp (C)']?.toFixed(1)}°C</td>
                <td>${record['Indoor Humidity (%)']}%</td>
                <td>${record['Outdoor Humidity (%)']?.toFixed(0)}%</td>
                <td>${record['Fan Status']}</td>
                <td style="color: ${record.Alert === 'YES' ? '#e53e3e' : '#48bb78'}; font-weight: 600;">
                    ${record.Alert}
                </td>
            </tr>
        `).join('');
    }
    
    // Update pagination
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    document.getElementById('pageInfo').textContent = 
        `Page ${currentPage} of ${totalPages} (${filteredData.length} records)`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

// Filter data table by search
function filterDataTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (searchTerm === '') {
        currentPage = 1;
        updateDataTable();
        return;
    }
    
    const tempFiltered = allData.filter(record => 
        JSON.stringify(record).toLowerCase().includes(searchTerm)
    );
    
    // Apply date filter on top of search
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    endDate.setHours(23, 59, 59);
    
    filteredData = tempFiltered.filter(record => {
        return record.parsedDate >= startDate && record.parsedDate <= endDate;
    });
    
    currentPage = 1;
    updateCurrentStatus();
    updateCharts();
    updateAlertLog();
    updateDataTable();
}
