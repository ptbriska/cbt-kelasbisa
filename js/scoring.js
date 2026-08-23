// ==========================================================
// js/scoring.js - SCORING & MULTI-KEY PAYLOAD AGGREGATION
// ==========================================================

function submitJawabanScoring() {
    if (!window.App || App.isScoringCompleted) return;
    App.isScoringCompleted = true;
    App.isExamSubmitted = true;

    if (App.timerInterval) {
        clearInterval(App.timerInterval);
        App.timerInterval = null;
    }

    const questions = App.questionsData || App.questions || [];
    const totalSoal = questions.length;
    const userAnswers = App.userAnswers || {};
    
    const modePenilaian = String(App.modePenilaian || "1A").trim().toUpperCase();
    const cfg = App.skorConfig || {};

    const valBenar = Number(cfg.skor_benar ?? 1);
    const valSalah = Number(cfg.skor_salah ?? 0);
    const valKosong = Number(cfg.skor_kosong ?? 0);
    const bobotMap = cfg.bobot_level || {};

    let jumlahBenar = 0;
    let jumlahSalah = 0;
    let jumlahKosong = 0;
    let totalSkorMurni = 0;

    // Kalkulasi Nilai
    if (modePenilaian === "1C") {
        questions.forEach((q, idx) => {
            const noSoal = q.No || (idx + 1);
            const userAns = userAnswers[noSoal];
            const kunci = String(q.Kunci || "").trim().toUpperCase();
            const levelSoal = String(q.Level || "").trim().toUpperCase();
            const bobotSoal = Number(bobotMap[levelSoal] ?? 1);

            if (!userAns) {
                jumlahKosong++;
            } else if (String(userAns).trim().toUpperCase() === kunci) {
                jumlahBenar++;
                totalSkorMurni += (bobotSoal * valBenar);
            } else {
                jumlahSalah++;
            }
        });
        totalSkorMurni = Math.max(0, totalSkorMurni);

    } else if (modePenilaian === "1B") {
        questions.forEach((q, idx) => {
            const noSoal = q.No || (idx + 1);
            const userAns = userAnswers[noSoal];
            const kunci = String(q.Kunci || "").trim().toUpperCase();

            if (!userAns) {
                jumlahKosong++;
                totalSkorMurni += valKosong;
            } else if (String(userAns).trim().toUpperCase() === kunci) {
                jumlahBenar++;
                totalSkorMurni += valBenar;
            } else {
                jumlahSalah++;
                totalSkorMurni += valSalah;
            }
        });

    } else {
        const skorSalah1A = valSalah < 0 ? 0 : valSalah;
        questions.forEach((q, idx) => {
            const noSoal = q.No || (idx + 1);
            const userAns = userAnswers[noSoal];
            const kunci = String(q.Kunci || "").trim().toUpperCase();

            if (!userAns) {
                jumlahKosong++;
                totalSkorMurni += valKosong;
            } else if (String(userAns).trim().toUpperCase() === kunci) {
                jumlahBenar++;
                totalSkorMurni += valBenar;
            } else {
                jumlahSalah++;
                totalSkorMurni += skorSalah1A;
            }
        });

        if (cfg.use_scaling_100 && totalSoal > 0) {
            totalSkorMurni = (jumlahBenar / totalSoal) * 100;
        }
        totalSkorMurni = Math.max(0, totalSkorMurni);
    }

    const skorAkhir = Number(totalSkorMurni.toFixed(2));

    const detailHasil = {
        benar: jumlahBenar,
        salah: jumlahSalah,
        kosong: jumlahKosong,
        totalSoal: totalSoal,
        skor: skorAkhir
    };

    const dataPesertaResmi = App.verifiedPesertaData || App.userIdentitas || {};
    const WEBHOOK_URL = App.WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwrFDLCJOZzbpFtGxrguEWb9ZuXLWh9N6e9g2jQVuWpYqvWNavBRnkgLUkVymgLNPzMLw/exec";

    // --- REKAP DATA PELANGGARAN ---
    let rawLogs = App.warningLogs || [];
    if ((!rawLogs || rawLogs.length === 0) && localStorage.getItem("cbt_violation_logs")) {
        try {
            rawLogs = JSON.parse(localStorage.getItem("cbt_violation_logs")) || [];
        } catch(e) {}
    }

    let countFromStorage = parseInt(localStorage.getItem("cbt_warning_count"), 10);
    if (isNaN(countFromStorage)) countFromStorage = 0;

    // Ambil angka tertinggi antara App.warningCount, panjang logs, dan LocalStorage
    const realJmlPelanggaran = Math.max(App.warningCount || 0, rawLogs.length, countFromStorage);
    
    // Bikin string teks sederhana
    const formattedLogsText = rawLogs.length > 0 
        ? rawLogs.map(item => `[Peringatan ${item.peringatan_ke || '-'}] ${item.waktu || ''}: ${item.alasan || ''}`).join(" | ")
        : (realJmlPelanggaran > 0 ? `${realJmlPelanggaran}x Pelanggaran Terdeteksi` : "Tidak ada");

    // Send Payload dengan variasi alias key agar kompatibel dengan Google Apps Script manapun
    const payload = {
        action: "submit_ujian",
        kode_soal: App.currentKodeUjian || App.soalData?.kode_ujian || "UNKNOWN",
        sistem_ujian: "CBT",
        mode_ujian: App.modeUjian || "UTAMA",
        mode_penilaian: modePenilaian,
        identitas: dataPesertaResmi,
        jawaban: userAnswers,
        
        // Multi-key alias untuk Jumlah Pelanggaran
        jml_pelanggaran: realJmlPelanggaran,
        jumlah_pelanggaran: realJmlPelanggaran,
        total_pelanggaran: realJmlPelanggaran,
        pelanggaran: realJmlPelanggaran,

        // Multi-key alias untuk Log Teks Pelanggaran
        log_pelanggaran: formattedLogsText,
        log_pelanggaran_teks: formattedLogsText,
        detail_pelanggaran: formattedLogsText,

        waktu_mulai: App.startTime || "",
        waktu_selesai: new Date().toISOString(),
        total_dijawab: Object.keys(userAnswers).length,
        total_soal: totalSoal,
        skor_total: skorAkhir,
        skor_akhir: skorAkhir,
        benar: jumlahBenar,
        salah: jumlahSalah,
        kosong: jumlahKosong
    };

    if (WEBHOOK_URL && WEBHOOK_URL.trim() !== "") {
        fetch(WEBHOOK_URL, {
            method: "POST",
            mode: "no-cors",
            keepalive: true,
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        }).catch(err => console.warn("Webhook submit background error:", err));
    }

    // Clear backup localstorage setelah berhasil submit
    try {
        localStorage.removeItem("cbt_warning_count");
        localStorage.removeItem("cbt_violation_logs");
    } catch(e) {}

    tampilkanLayarSelesai(detailHasil);
}

function tampilkanLayarSelesai(detail) {
    const possibleLoaders = [
        "loading-overlay", 
        "loading", 
        "loading-screen", 
        "modal-loading",
        "modal-konfirmasi",       
        "custom-confirm-modal"   
    ];
    
    possibleLoaders.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add("hidden");
            el.style.setProperty("display", "none", "important");
        }
    });

    const pageCbt = document.getElementById("page-cbt");
    if (pageCbt) {
        pageCbt.innerHTML = `
            <div style="text-align:center; padding: 30px 15px; font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #2e7d32; margin-bottom: 5px;">✅ Ujian CBT Selesai!</h2>
                <p style="color: #666; font-size: 14px; margin-bottom: 20px;">Hasil Pengumuman Skor Resmi [Kode: <strong>${App.currentKodeUjian || '-'}</strong>]</p>
                
                <div style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 25px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                    <span style="font-size: 13px; color: #555; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Skor Perolehan Akhir (${App.modePenilaian || '1C'})</span>
                    <div style="font-size: 54px; font-weight: bold; color: #1a237e; margin: 10px 0;">${detail.skor}</div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 20px; font-size: 14px; background: #f8f9fa; padding: 12px; border-radius: 8px;">
                        <div>✔️ Benar<br><strong style="color: #2e7d32; font-size: 18px;">${detail.benar}</strong></div>
                        <div>❌ Salah<br><strong style="color: #c62828; font-size: 18px;">${detail.salah}</strong></div>
                        <div>⚪ Kosong<br><strong style="color: #f57c00; font-size: 18px;">${detail.kosong}</strong></div>
                    </div>
                </div>
            </div>
        `;
    }
}

window.submitJawabanScoring = submitJawabanScoring;
window.tampilkanLayarSelesai = tampilkanLayarSelesai;
