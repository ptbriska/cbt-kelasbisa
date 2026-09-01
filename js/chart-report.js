/* ==========================================================
   CBT SYSTEM - Chart Visualizer Engine (js/chart-report.js)
   ========================================================== */

function renderReportCharts(benar, salah, kosong, itemReviews, subtestStats) {
    if (typeof Chart === 'undefined') {
        console.error("Chart.js belum dimuat. Pastikan CDN Chart.js sudah terpasang di HTML.");
        return;
    }

    // Helper untuk menghancurkan instance chart lama sebelum inisialisasi baru
    const safeInitChart = (canvasId, config) => {
        const canvasEl = document.getElementById(canvasId);
        if (!canvasEl) return;

        const existingChart = Chart.getChart(canvasId);
        if (existingChart) {
            existingChart.destroy();
        }
        new Chart(canvasEl.getContext('2d'), config);
    };

    // 1. Chart Doughnut: Proporsi Jawaban
    safeInitChart('chartScorePie', {
        type: 'doughnut',
        data: {
            labels: ['Benar', 'Salah', 'Kosong'],
            datasets: [{
                data: [benar, salah, kosong],
                backgroundColor: ['#10B981', '#EF4444', '#9CA3AF'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: 'Inter', size: 12 },
                        padding: 15
                    }
                }
            }
        }
    });

    // 2. Chart Line: Analisis Waktu per Soal
    safeInitChart('chartTimeLine', {
        type: 'line',
        data: {
            labels: itemReviews.map(r => `No ${r.no}`),
            datasets: [{
                label: 'Durasi Pengerjaan (Detik)',
                data: itemReviews.map(r => r.durasiSec),
                borderColor: '#4F46E5',
                backgroundColor: 'rgba(79, 70, 229, 0.08)',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#4F46E5'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Waktu (Detik)', font: { family: 'Inter' } },
                    grid: { color: '#F1F5F9' }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    // 3. Chart Bar: Akurasi Subtest
    const subtestLabels = Object.keys(subtestStats);
    const subtestAccuracy = subtestLabels.map(k => {
        const st = subtestStats[k];
        return st.total > 0 ? Number(((st.benar / st.total) * 100).toFixed(1)) : 0;
    });

    safeInitChart('chartSubtestBar', {
        type: 'bar',
        data: {
            labels: subtestLabels,
            datasets: [{
                label: 'Akurasi (%)',
                data: subtestAccuracy,
                backgroundColor: '#8B5CF6',
                borderRadius: 6,
                maxBarThickness: 40
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: v => v + '%' },
                    grid: { color: '#F1F5F9' }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
