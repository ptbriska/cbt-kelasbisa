/* ==========================================================
   CBT SYSTEM - Chart Visualizer Engine (js/chart-report.js)
   ========================================================== */

// Registrasi plugin ChartDataLabels secara global
if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}

function renderReportCharts(benar, salah, kosong, itemReviews, subtestStats) {
    if (typeof Chart === 'undefined') {
        console.error("Chart.js belum dimuat.");
        return;
    }

    // Peringatan jika CDN plugin belum terpasang di HTML
    if (typeof ChartDataLabels === 'undefined') {
        console.warn("PERHATIAN: CDN 'chartjs-plugin-datalabels' belum terpasang di HTML! Angka permanent tidak akan muncul.");
    } else {
        Chart.register(ChartDataLabels);
    }

    // Helper untuk reset instance chart lama
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
            animation: false, // MATIKAN ANIMASI AGAR LANGSUNG TERCETAK DI PDF
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { family: 'Inter', size: 12 }, padding: 15 }
                },
                datalabels: {
                    display: true,
                    color: '#ffffff',
                    font: { family: 'Inter', weight: 'bold', size: 14 },
                    formatter: (value) => (value > 0 ? value : '')
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
            animation: false, // MATIKAN ANIMASI AGAR LANGSUNG TERCETAK DI PDF
            layout: { padding: { top: 25, right: 15 } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    display: true,
                    align: 'top',
                    anchor: 'end',
                    color: '#4F46E5',
                    font: { family: 'Inter', weight: 'bold', size: 11 },
                    formatter: (value) => `${value}s`
                }
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
            animation: false, // MATIKAN ANIMASI AGAR LANGSUNG TERCETAK DI PDF
            layout: { padding: { top: 25 } },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' }, grid: { color: '#F1F5F9' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    display: true,
                    align: 'top',
                    anchor: 'end',
                    color: '#7C3AED',
                    font: { family: 'Inter', weight: 'bold', size: 11 },
                    formatter: (value) => `${value}%`
                }
            }
        }
    });
}
