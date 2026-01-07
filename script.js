// ============================================
// NEXUS - Real-Time Data Dashboard
// ============================================

// --- STATE ---
let isPaused = false;
let startTime = Date.now();
let trafficChart = null;
let healthChart = null;
let logCount = 0;

// Simulated data
let stats = {
    users: 1240,
    bandwidth: 54.2,
    cpu: 32,
    memory: 68,
    diskIO: 245,
    alerts: 2
};

// Previous values for trends
let prevStats = { ...stats };

// Traffic chart data
const maxPoints = 30;
let inboundData = new Array(maxPoints).fill(0).map(() => Math.random() * 50 + 20);
let outboundData = new Array(maxPoints).fill(0).map(() => Math.random() * 40 + 10);
let timeLabels = new Array(maxPoints).fill('').map((_, i) => `${i}s`);

// Servers
const servers = [
    { id: 'srv-01', name: 'US-East-1', status: 'online', load: 45 },
    { id: 'srv-02', name: 'US-West-1', status: 'online', load: 62 },
    { id: 'srv-03', name: 'EU-Central', status: 'online', load: 38 },
    { id: 'srv-04', name: 'Asia-Pacific', status: 'warning', load: 85 },
    { id: 'srv-05', name: 'SA-East', status: 'online', load: 29 },
    { id: 'srv-06', name: 'AU-Sydney', status: 'offline', load: 0 }
];

// --- DOM ELEMENTS ---
const elements = {
    usersCount: document.getElementById('users-count'),
    usersTrend: document.getElementById('users-trend'),
    bandwidth: document.getElementById('bandwidth'),
    bandwidthTrend: document.getElementById('bandwidth-trend'),
    cpuLoad: document.getElementById('cpu-load'),
    cpuBar: document.getElementById('cpu-bar'),
    memory: document.getElementById('memory'),
    memoryBar: document.getElementById('memory-bar'),
    diskIO: document.getElementById('disk-io'),
    diskTrend: document.getElementById('disk-trend'),
    alertsCount: document.getElementById('alerts-count'),
    uptime: document.getElementById('uptime'),
    lastUpdate: document.getElementById('lastUpdate'),
    logList: document.getElementById('log-list'),
    logCount: document.getElementById('logCount'),
    serverGrid: document.getElementById('serverGrid'),
    pauseBtn: document.getElementById('pauseBtn'),
    liveStatus: document.getElementById('liveStatus'),
    alertPopup: document.getElementById('alertPopup'),
    alertMessage: document.getElementById('alertMessage'),
    dismissAlert: document.getElementById('dismissAlert'),
    healthScore: document.getElementById('healthScore')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    renderServers();
    setupEventListeners();
    startUpdates();
});

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Pause button
    elements.pauseBtn.addEventListener('click', togglePause);

    // Time range buttons
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            // Would change time range in real app
        });
    });

    // Dismiss alert
    elements.dismissAlert.addEventListener('click', () => {
        elements.alertPopup.classList.add('hidden');
    });

    // Menu items
    document.querySelectorAll('.menu li').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.menu li').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// --- CHARTS ---
function initCharts() {
    // Traffic Chart
    const trafficCtx = document.getElementById('trafficChart').getContext('2d');
    trafficChart = new Chart(trafficCtx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: 'Inbound',
                    data: inboundData,
                    borderColor: '#00f3ff',
                    backgroundColor: 'rgba(0, 243, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: 'Outbound',
                    data: outboundData,
                    borderColor: '#ff0055',
                    backgroundColor: 'rgba(255, 0, 85, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: '#888', usePointStyle: true }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#666' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#666',
                        callback: val => val + ' GB/s'
                    }
                }
            }
        }
    });

    // Health Gauge (Doughnut)
    const healthCtx = document.getElementById('healthChart').getContext('2d');
    healthChart = new Chart(healthCtx, {
        type: 'doughnut',
        data: {
            labels: ['Healthy', 'Issues'],
            datasets: [{
                data: [98, 2],
                backgroundColor: ['#00ff64', 'rgba(255,0,85,0.3)'],
                borderWidth: 0,
                cutout: '80%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}

// --- UPDATE LOOP ---
function startUpdates() {
    setInterval(() => {
        if (!isPaused) {
            updateStats();
            updateCharts();
            updateServers();
            updateUptime();
            maybeAddLog();
            maybeShowAlert();
        }
    }, 1000);
}

function togglePause() {
    isPaused = !isPaused;
    elements.pauseBtn.innerHTML = isPaused
        ? '<i class="fas fa-play"></i>'
        : '<i class="fas fa-pause"></i>';
    elements.liveStatus.innerHTML = isPaused
        ? '<span class="indicator paused"></span> PAUSED'
        : '<span class="indicator"></span> LIVE';
    elements.liveStatus.classList.toggle('paused', isPaused);
}

// --- STATS UPDATE ---
function updateStats() {
    // Save previous for trend calculation
    prevStats = { ...stats };

    // Random walk for each stat
    stats.users += Math.floor(Math.random() * 40) - 18;
    stats.bandwidth += (Math.random() * 4) - 2;
    stats.cpu += (Math.random() * 8) - 4;
    stats.memory += (Math.random() * 4) - 2;
    stats.diskIO += (Math.random() * 60) - 30;

    // Bounds
    stats.users = Math.max(100, stats.users);
    stats.bandwidth = Math.max(0, Math.min(100, stats.bandwidth));
    stats.cpu = Math.max(0, Math.min(100, stats.cpu));
    stats.memory = Math.max(0, Math.min(100, stats.memory));
    stats.diskIO = Math.max(0, stats.diskIO);

    // Random alert changes
    if (Math.random() > 0.95) {
        stats.alerts = Math.max(0, stats.alerts + (Math.random() > 0.5 ? 1 : -1));
    }

    // Update DOM
    elements.usersCount.textContent = Math.floor(stats.users).toLocaleString();
    elements.bandwidth.textContent = stats.bandwidth.toFixed(1) + ' GB/s';
    elements.cpuLoad.textContent = Math.floor(stats.cpu) + '%';
    elements.cpuBar.style.width = stats.cpu + '%';
    elements.cpuBar.style.background = stats.cpu > 80 ? '#ff0055' : '#00f3ff';
    elements.memory.textContent = Math.floor(stats.memory) + '%';
    elements.memoryBar.style.width = stats.memory + '%';
    elements.memoryBar.style.background = stats.memory > 85 ? '#ff0055' : '#00f3ff';
    elements.diskIO.textContent = Math.floor(stats.diskIO) + ' MB/s';
    elements.alertsCount.textContent = stats.alerts;

    // Update trends
    updateTrend(elements.usersTrend, stats.users, prevStats.users);
    updateTrend(elements.bandwidthTrend, stats.bandwidth, prevStats.bandwidth);
    updateTrend(elements.diskTrend, stats.diskIO, prevStats.diskIO);

    // Last update time
    elements.lastUpdate.textContent = new Date().toLocaleTimeString();
}

function updateTrend(el, current, prev) {
    const diff = ((current - prev) / prev * 100).toFixed(1);
    const isUp = diff >= 0;
    el.textContent = (isUp ? '+' : '') + diff + '%';
    el.className = 'stat-trend ' + (isUp ? 'up' : 'down');
}

// --- CHARTS UPDATE ---
function updateCharts() {
    // Shift old data, add new
    inboundData.shift();
    inboundData.push(Math.random() * 50 + 20 + stats.bandwidth * 0.5);

    outboundData.shift();
    outboundData.push(Math.random() * 40 + 10 + stats.bandwidth * 0.3);

    trafficChart.data.datasets[0].data = inboundData;
    trafficChart.data.datasets[1].data = outboundData;
    trafficChart.update('none');

    // Health gauge
    const healthPercent = Math.max(0, 100 - stats.alerts * 5 - (stats.cpu > 80 ? 10 : 0) - (stats.memory > 85 ? 10 : 0));
    healthChart.data.datasets[0].data = [healthPercent, 100 - healthPercent];
    healthChart.update('none');
    elements.healthScore.textContent = healthPercent + '%';
}

// --- SERVERS ---
function renderServers() {
    elements.serverGrid.innerHTML = servers.map(server => `
        <div class="server-card ${server.status}" data-id="${server.id}">
            <div class="server-header">
                <span class="server-status"></span>
                <span class="server-name">${server.name}</span>
            </div>
            <div class="server-load">
                <div class="load-bar">
                    <div class="load-fill" style="width: ${server.load}%"></div>
                </div>
                <span class="load-value">${server.load}%</span>
            </div>
        </div>
    `).join('');
}

function updateServers() {
    servers.forEach(server => {
        if (server.status !== 'offline') {
            server.load += Math.floor(Math.random() * 10) - 5;
            server.load = Math.max(0, Math.min(100, server.load));

            // Update status based on load
            if (server.load > 85) server.status = 'warning';
            else if (server.load > 0) server.status = 'online';
        }
    });
    renderServers();
}

// --- UPTIME ---
function updateUptime() {
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    elements.uptime.textContent = `${days}d ${hours % 24}h ${minutes % 60}m`;
}

// --- LOGS ---
const logMessages = [
    { type: 'info', msg: 'Connection established from 192.168.1.x' },
    { type: 'info', msg: 'Database query completed in 23ms' },
    { type: 'warning', msg: 'High memory usage detected on srv-04' },
    { type: 'info', msg: 'SSL certificate renewed successfully' },
    { type: 'error', msg: 'Connection timeout to srv-06' },
    { type: 'info', msg: 'Cache cleared, 1.2GB freed' },
    { type: 'warning', msg: 'Disk usage above 80% on EU-Central' },
    { type: 'info', msg: 'Backup completed successfully' }
];

function maybeAddLog() {
    if (Math.random() > 0.7) {
        const log = logMessages[Math.floor(Math.random() * logMessages.length)];
        const time = new Date().toLocaleTimeString();

        const li = document.createElement('li');
        li.className = `log-item ${log.type}`;
        li.innerHTML = `
            <span class="log-time">[${time}]</span>
            <span class="log-type">${log.type.toUpperCase()}</span>
            <span class="log-msg">${log.msg}</span>
        `;

        elements.logList.prepend(li);
        logCount++;
        elements.logCount.textContent = logCount + ' entries';

        // Limit logs shown
        if (elements.logList.children.length > 8) {
            elements.logList.removeChild(elements.logList.lastChild);
        }
    }
}

// --- ALERTS ---
function maybeShowAlert() {
    if (Math.random() > 0.98 && !elements.alertPopup.classList.contains('visible')) {
        const alerts = [
            'CPU usage spike detected on US-East-1',
            'Memory threshold exceeded on Asia-Pacific',
            'Network latency increased by 150ms',
            'Disk I/O bottleneck on EU-Central'
        ];

        elements.alertMessage.textContent = alerts[Math.floor(Math.random() * alerts.length)];
        elements.alertPopup.classList.remove('hidden');
        elements.alertPopup.classList.add('visible');

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            elements.alertPopup.classList.add('hidden');
            elements.alertPopup.classList.remove('visible');
        }, 5000);
    }
}
