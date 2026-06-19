// Bee Hotel Dashboard v1.1.0
let allData = [];
let filteredData = [];
let currentPage = 1;
let recordsPerPage = 25;
let tempChart, humidityChart, fanChart;
let chartsInitialized = { temp: false, humidity: false, fan: false };

// ===== Data Loading =====
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('bee_data.json');
        allData = await response.json();
        
        // Parse dates and fix swapped columns in Unix timestamp records
        allData = allData.map(record => {
            const parsedDate = parseDate(record.Date, record.Time);
            
            // Detect and fix swapped columns in Unix timestamp records
            // Issue: "Indoor Temp (C)" contains humidity values, "Outdoor Humidity (%)" contains temp values
            // Fix: swap these two columns when detected
            const indoorTemp = record['Indoor Temp (C)'];
            const outdoorHum = record['Outdoor Humidity (%)'];
            
            // If Indoor Temp > 50 (humidity range) and Outdoor Humidity < 40 (temp range), they're swapped
            if (indoorTemp != null && indoorTemp > 50 && indoorTemp < 100 &&
                outdoorHum != null && outdoorHum < 40 && outdoorHum > 10) {
                // Swap them
                record['Indoor Temp (C)'] = outdoorHum;
                record['Outdoor Humidity (%)'] = indoorTemp;
            }
            
            return {
                ...record,
                parsedDate: parsedDate,
                formattedDate: parsedDate 
                    ? `${String(parsedDate.getDate()).padStart(2, '0')}/${String(parsedDate.getMonth() + 1).padStart(2, '0')}/${parsedDate.getFullYear()}`
                    : record.Date
            };
        }).filter(r => r.parsedDate !== null);
        
        // Sort newest first
        allData.sort((a, b) => b.parsedDate - a.parsedDate);
        filteredData = [...allData];
        
        initializeDateInputs();
        setupEventListeners();
        
        // Render initial tab (Status)
        updateCurrentStatus();
        initializeCharts(); // init once, update on tab switch
        
        console.log(`✓ Loaded ${allData.length} records`);
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Check console for details.');
    }
});

function parseDate(dateStr, timeStr) {
    try {
        let date;
        
        // Handle Unix timestamp (number)
        if (typeof dateStr === 'number' || (typeof dateStr === 'string' && /^\d+$/.test(dateStr))) {
            const timestamp = parseInt(dateStr);
            date = new Date(timestamp);
        } 
        // Handle DD/MM/YYYY format
        else if (typeof dateStr === 'string' && dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length !== 3) return null;
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            date = new Date(year, month, day);
        } 
        else {
            return null;
        }
        
        // Add time if provided
        if (timeStr && date instanceof Date && !isNaN(date)) {
            const [h, m, s] = timeStr.split(':');
            date.setHours(parseInt(h), parseInt(m), parseInt(s) || 0);
        }
        
        return date;
    } catch (e) {
        return null;
    }
}

function initializeDateInputs() {
    const dates = allData.map(r => r.parsedDate);
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    document.getElementById('startDate').value = formatDateForInput(minDate);
    document.getElementById('endDate').value = formatDateForInput(maxDate);
    updateRangeInfo(minDate, maxDate);
}

function formatDateForInput(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function updateRangeInfo(start, end) {
    const info = document.getElementById('rangeInfo');
    if (!start || !end) {
        info.textContent = 'Showing all data';
        return;
    }
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    info.textContent = `Showing ${days} day${days > 1 ? 's' : ''} • ${start.toLocaleDateString()} → ${end.toLocaleDateString()} • ${filteredData.length.toLocaleString()} records`;
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Quick presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });
    
    // Custom date range
    document.getElementById('applyFilter').addEventListener('click', applyCustomRange);
    
    // Data explorer
    document.getElementById('searchInput').addEventListener('input', updateDataTable);
    document.getElementById('recordsPerPage').addEventListener('change', (e) => {
        recordsPerPage = parseInt(e.target.value);
        currentPage = 1;
        updateDataTable();
    });
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; updateDataTable(); }
    });
    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / recordsPerPage);
        if (currentPage < totalPages) { currentPage++; updateDataTable(); }
    });
}

// ===== Tab Switching =====
function switchTab(tabName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.tab === tabName);
    });
    
    // Render tab content
    if (tabName === 'status') updateCurrentStatus();
    if (tabName === 'temp') { renderTempChart(); }
    if (tabName === 'humidity') { renderHumidityChart(); }
    if (tabName === 'fan') { renderFanChart(); }
    if (tabName === 'alerts') updateAlertLog();
    if (tabName === 'data') updateDataTable();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Date Presets =====
function applyPreset(preset) {
    // Update button states
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === preset);
    });
    
    // Use data's own date range as reference (not today's date)
    const dataDates = allData.map(r => r.parsedDate);
    const dataMax = new Date(Math.max(...dataDates));
    const dataMin = new Date(Math.min(...dataDates));
    
    let start, end;
    
    switch (preset) {
        case 'today':
            // Last day of available data
            end = new Date(dataMax);
            end.setHours(23, 59, 59, 999);
            start = new Date(dataMax);
            start.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            // Second-to-last day of available data
            end = new Date(dataMax);
            end.setHours(0, 0, 0, 0);
            end.setSeconds(-1);
            start = new Date(end);
            start.setHours(0, 0, 0, 0);
            break;
        case 'week':
            // Last 7 days of available data
            end = new Date(dataMax);
            end.setHours(23, 59, 59, 999);
            start = new Date(dataMax);
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            // Don't go before data start
            if (start < dataMin) start = new Date(dataMin);
            break;
        case 'month':
            // Last 30 days of available data
            end = new Date(dataMax);
            end.setHours(23, 59, 59, 999);
            start = new Date(dataMax);
            start.setDate(start.getDate() - 29);
            start.setHours(0, 0, 0, 0);
            if (start < dataMin) start = new Date(dataMin);
            break;
        case 'quarter':
            // Last 90 days of available data
            end = new Date(dataMax);
            end.setHours(23, 59, 59, 999);
            start = new Date(dataMax);
            start.setDate(start.getDate() - 89);
            start.setHours(0, 0, 0, 0);
            if (start < dataMin) start = new Date(dataMin);
            break;
        case 'all':
        default:
            start = new Date(dataMin);
            end = new Date(dataMax);
            end.setHours(23, 59, 59);
            break;
    }
    
    document.getElementById('startDate').value = formatDateForInput(start);
    document.getElementById('endDate').value = formatDateForInput(end);
    
    filterByRange(start, end);
}

function applyCustomRange() {
    const start = new Date(document.getElementById('startDate').value);
    const end = new Date(document.getElementById('endDate').value);
    end.setHours(23, 59, 59);
    
    // Clear preset highlights
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    
    filterByRange(start, end);
}

function filterByRange(start, end) {
    filteredData = allData.filter(r => r.parsedDate >= start && r.parsedDate <= end);
    currentPage = 1;
    
    updateRangeInfo(start, end);
    refreshCurrentTab();
}

function refreshCurrentTab() {
    const activeTab = document.querySelector('.tab-panel.active');
    if (activeTab) switchTab(activeTab.dataset.tab);
}

// ===== Panel 1: Current Status =====
function updateCurrentStatus() {
    const latest = filteredData[0];
    if (!latest) {
        document.getElementById('currentIndoorTemp').textContent = 'No data';
        return;
    }
    
    document.getElementById('currentIndoorTemp').textContent = 
        latest['Indoor Temp (C)'] != null ? latest['Indoor Temp (C)'].toFixed(1) : '--';
    document.getElementById('currentOutdoorTemp').textContent = 
        latest['Outdoor Temp (C)'] != null ? latest['Outdoor Temp (C)'].toFixed(1) : '--';
    document.getElementById('currentIndoorHumidity').textContent = 
        latest['Indoor Humidity (%)'] != null ? latest['Indoor Humidity (%)'] : '--';
    document.getElementById('currentOutdoorHumidity').textContent = 
        latest['Outdoor Humidity (%)'] != null ? latest['Outdoor Humidity (%)'].toFixed(0) : '--';
    
    const fanEl = document.getElementById('currentFanStatus');
    fanEl.textContent = latest['Fan Status'] || '--';
    fanEl.className = 'metric-value status-indicator ' + 
        (latest['Fan Status'] === 'ON' ? 'on' : 'off');
    
    document.getElementById('lastUpdate').innerHTML = 
        `<div>${latest.formattedDate}</div><div>${latest.Time}</div>`;
    
    // Summary stats
    document.getElementById('totalRecords').textContent = filteredData.length.toLocaleString();
    
    const dates = filteredData.map(r => r.parsedDate);
    if (dates.length > 0) {
        const minD = new Date(Math.min(...dates));
        const maxD = new Date(Math.max(...dates));
        const days = Math.ceil((maxD - minD) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('dateRange').textContent = `${days} day${days > 1 ? 's' : ''}`;
    }
    
    const indoorTemps = filteredData.map(r => r['Indoor Temp (C)']).filter(v => v != null);
    const outdoorTemps = filteredData.map(r => r['Outdoor Temp (C)']).filter(v => v != null);
    
    document.getElementById('avgIndoorTemp').textContent = indoorTemps.length > 0 
        ? (indoorTemps.reduce((a, b) => a + b, 0) / indoorTemps.length).toFixed(1) + '°C' : '--';
    document.getElementById('avgOutdoorTemp').textContent = outdoorTemps.length > 0 
        ? (outdoorTemps.reduce((a, b) => a + b, 0) / outdoorTemps.length).toFixed(1) + '°C' : '--';
}

// ===== Panel 2: Temperature Chart =====
function initializeCharts() {
    // Just set up contexts - charts rendered on demand
}

function renderTempChart() {
    const chartData = sampleData(filteredData, 300);
    
    const ctx = document.getElementById('tempChart').getContext('2d');
    if (tempChart) tempChart.destroy();
    
    tempChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(r => r.parsedDate),
            datasets: [
                {
                    label: 'Indoor Temp (°C)',
                    data: chartData.map(r => r['Indoor Temp (C)']),
                    borderColor: '#f56565',
                    backgroundColor: 'rgba(245, 101, 101, 0.15)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 1
                },
                {
                    label: 'Outdoor Temp (°C)',
                    data: chartData.map(r => r['Outdoor Temp (C)']),
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.15)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 1
                }
            ]
        },
        options: chartOptions('Temperature (°C)')
    });
    
    // Stats
    const indoor = filteredData.map(r => r['Indoor Temp (C)']).filter(v => v != null);
    const outdoor = filteredData.map(r => r['Outdoor Temp (C)']).filter(v => v != null);
    
    document.getElementById('tempIndoorMin').textContent = indoor.length ? Math.min(...indoor).toFixed(1) : '--';
    document.getElementById('tempIndoorMax').textContent = indoor.length ? Math.max(...indoor).toFixed(1) : '--';
    document.getElementById('tempIndoorAvg').textContent = indoor.length ? (indoor.reduce((a,b)=>a+b,0)/indoor.length).toFixed(1) : '--';
    document.getElementById('tempOutdoorMin').textContent = outdoor.length ? Math.min(...outdoor).toFixed(1) : '--';
    document.getElementById('tempOutdoorMax').textContent = outdoor.length ? Math.max(...outdoor).toFixed(1) : '--';
    document.getElementById('tempOutdoorAvg').textContent = outdoor.length ? (outdoor.reduce((a,b)=>a+b,0)/outdoor.length).toFixed(1) : '--';
}

// ===== Panel 3: Humidity Chart =====
function renderHumidityChart() {
    const chartData = sampleData(filteredData, 300);
    
    const ctx = document.getElementById('humidityChart').getContext('2d');
    if (humidityChart) humidityChart.destroy();
    
    humidityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(r => r.parsedDate),
            datasets: [
                {
                    label: 'Indoor Humidity (%)',
                    data: chartData.map(r => r['Indoor Humidity (%)']),
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.15)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 1
                },
                {
                    label: 'Outdoor Humidity (%)',
                    data: chartData.map(r => r['Outdoor Humidity (%)']),
                    borderColor: '#ed8936',
                    backgroundColor: 'rgba(237, 137, 54, 0.15)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 1
                }
            ]
        },
        options: chartOptions('Humidity (%)')
    });
    
    const indoor = filteredData.map(r => r['Indoor Humidity (%)']).filter(v => v != null);
    const outdoor = filteredData.map(r => r['Outdoor Humidity (%)']).filter(v => v != null);
    
    document.getElementById('humIndoorMin').textContent = indoor.length ? Math.min(...indoor) : '--';
    document.getElementById('humIndoorMax').textContent = indoor.length ? Math.max(...indoor) : '--';
    document.getElementById('humIndoorAvg').textContent = indoor.length ? (indoor.reduce((a,b)=>a+b,0)/indoor.length).toFixed(0) : '--';
    document.getElementById('humOutdoorMin').textContent = outdoor.length ? Math.min(...outdoor).toFixed(0) : '--';
    document.getElementById('humOutdoorMax').textContent = outdoor.length ? Math.max(...outdoor).toFixed(0) : '--';
    document.getElementById('humOutdoorAvg').textContent = outdoor.length ? (outdoor.reduce((a,b)=>a+b,0)/outdoor.length).toFixed(0) : '--';
}

// ===== Panel 4: Fan Status Chart =====
function renderFanChart() {
    const chartData = sampleData(filteredData, 300);
    
    const ctx = document.getElementById('fanChart').getContext('2d');
    if (fanChart) fanChart.destroy();
    
    fanChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(r => r.parsedDate),
            datasets: [{
                label: 'Fan Status',
                data: chartData.map(r => r['Fan Status'] === 'ON' ? 1 : 0),
                backgroundColor: chartData.map(r => 
                    r['Fan Status'] === 'ON' ? 'rgba(72, 187, 120, 0.8)' : 'rgba(252, 129, 129, 0.8)'
                ),
                borderColor: chartData.map(r => 
                    r['Fan Status'] === 'ON' ? '#38a169' : '#f56565'
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ctx.raw === 1 ? 'Fan: ON' : 'Fan: OFF'
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: { day: 'MMM d' }
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 1,
                    ticks: {
                        callback: v => v === 0 ? 'OFF' : 'ON'
                    }
                }
            }
        }
    });
    
    // Fan stats
    const onCount = filteredData.filter(r => r['Fan Status'] === 'ON').length;
    const offCount = filteredData.filter(r => r['Fan Status'] === 'OFF').length;
    document.getElementById('fanOnCount').textContent = onCount.toLocaleString();
    document.getElementById('fanOffCount').textContent = offCount.toLocaleString();
    document.getElementById('fanOnPercent').textContent = filteredData.length > 0 
        ? ((onCount / filteredData.length) * 100).toFixed(1) + '%' : '--';
}

// ===== Panel 5: Alert Log =====
function updateAlertLog() {
    const alerts = filteredData.filter(r => r.Alert === 'YES');
    const noAlerts = filteredData.filter(r => r.Alert !== 'YES');
    
    document.getElementById('totalAlerts').textContent = alerts.length.toLocaleString();
    document.getElementById('alertRate').textContent = filteredData.length > 0 
        ? ((alerts.length / filteredData.length) * 100).toFixed(2) + '%' : '0%';
    document.getElementById('noAlertCount').textContent = noAlerts.length.toLocaleString();
    
    const tbody = document.getElementById('alertTableBody');
    if (alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#a0aec0;">✓ No alerts in selected range</td></tr>';
        return;
    }
    
    const display = alerts.slice(0, 100);
    tbody.innerHTML = display.map(a => `
        <tr>
            <td>${a.formattedDate}</td>
            <td>${a.Time}</td>
            <td style="color:#e53e3e;font-weight:700;">⚠ ALERT</td>
            <td>${a['Indoor Temp (C)']?.toFixed(1)}°C</td>
            <td>${a['Outdoor Temp (C)']?.toFixed(1)}°C</td>
            <td>${a['Indoor Humidity (%)']}%</td>
            <td>${a['Fan Status']}</td>
        </tr>
    `).join('') + (alerts.length > 100 ? `<tr><td colspan="7" style="text-align:center;color:#718096;">Showing 100 of ${alerts.length} alerts</td></tr>` : '');
}

// ===== Panel 6: Data Explorer =====
function updateDataTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    let displayData = filteredData;
    
    if (searchTerm) {
        displayData = displayData.filter(r => 
            JSON.stringify(r).toLowerCase().includes(searchTerm)
        );
    }
    
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageData = displayData.slice(start, end);
    
    const tbody = document.getElementById('dataTableBody');
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#a0aec0;">No records found</td></tr>';
    } else {
        tbody.innerHTML = pageData.map(r => `
            <tr>
                <td>${r.formattedDate}</td>
                <td>${r.Time}</td>
                <td>${r['Indoor Temp (C)']?.toFixed(1)}°C</td>
                <td>${r['Outdoor Temp (C)']?.toFixed(1)}°C</td>
                <td>${r['Indoor Humidity (%)']}%</td>
                <td>${r['Outdoor Humidity (%)']?.toFixed(0)}%</td>
                <td>${r['Fan Status']}</td>
                <td style="color:${r.Alert === 'YES' ? '#e53e3e' : '#48bb78'};font-weight:600;">${r.Alert}</td>
            </tr>
        `).join('');
    }
    
    const totalPages = Math.ceil(displayData.length / recordsPerPage);
    document.getElementById('pageInfo').textContent = 
        `Page ${currentPage} of ${Math.max(1, totalPages)} (${displayData.length.toLocaleString()} records)`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

// ===== Helpers =====
function sampleData(data, maxPoints) {
    const sorted = [...data].sort((a, b) => a.parsedDate - b.parsedDate);
    if (sorted.length <= maxPoints) return sorted;
    const step = Math.floor(sorted.length / maxPoints);
    return sorted.filter((_, i) => i % step === 0);
}

function chartOptions(yLabel) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                backgroundColor: 'rgba(45, 55, 72, 0.95)',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 12 }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'day',
                    displayFormats: { day: 'MMM d' }
                },
                grid: { display: false }
            },
            y: {
                title: { display: true, text: yLabel },
                grid: { color: 'rgba(226, 232, 240, 0.5)' }
            }
        }
    };
}
