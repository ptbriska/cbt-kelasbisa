/* ==========================================================
   js/scoring.js - MULTI-TYPE SCORING ENGINE V2.0.0
   Sesuai Dokumen Pedoman Tipe Soal & Format JSON
   ========================================================== */

function submitJawabanScoring() {
    if (!window.App || App.isScoringCompleted) return;
    App.isScoringCompleted = true;
    App.isExamSubmitted = true;
    App.isSubmitting = true;

    if (App.timerInterval) {
        clearInterval(App.timerInterval);
        App.timerInterval = null;
    }

    const questions = App.questionsData || App.questions || [];
    const totalSoal = questions.length;
    const userAnswers = App.userAnswers || {};
    
    // Ambil konfigurasi aturan skor dari JSON (atau default fallback)
    const rules = App.scoringRules || App.soalData?.scoring_rules || {
        "1A": { "skor_benar": 1.0, "skor_salah": 0.0, "skor_kosong": 0.0 },
        "1B": { "skor_benar": 4.0, "skor_salah": -1.0, "skor_kosong": 0.0 },
        "1C": { "bobot_level": { "E": 1.0, "M": 3.0, "H": 5.0 }, "skor_salah": 0.0 },
        "2A": { "skor_benar_semua": 1.0, "skor_salah": 0.0 },
        "3A": { "skor_benar": 1.0, "skor_salah": 0.0 },
        "3B": { "skor_benar": 1.0, "skor_salah": 0.0 },
        "4A": { "skor_per_baris_benar": 1.0, "skor_per_baris_salah": 0.0 }
    };

    let totalSkorMurni = 0;
    let jumlahBenar = 0;
    let jumlahSalah = 0;
    let jumlahKosong = 0;

    questions.forEach((q, idx) => {
        const noSoal = q.No || (idx + 1);
        const tipeSoal = String(q.Tipe || "1A").trim().toUpperCase();
        const userAns = userAnswers[noSoal];

        // -----------------------------------------------------------
        // 1. TIPE 1A, 1B, 1C (Single Response)
        // -----------------------------------------------------------
        if (["1A", "1B", "1C"].includes(tipeSoal)) {
            const kunci = String(q.Kunci || "").trim().toUpperCase();
            
            if (!userAns || String(userAns).trim() === "") {
                jumlahKosong++;
                const rule = rules[tipeSoal] || {};
                totalSkorMurni += Number(rule.skor_kosong ?? 0);
            } else {
                const isCorrect = String(userAns).trim().toUpperCase() === kunci;
                if (isCorrect) {
                    jumlahBenar++;
                    if (tipeSoal === "1C") {
                        const levelSoal = String(q.Level || "E").trim().toUpperCase();
                        const bobotMap = rules["1C"]?.bobot_level || { "E": 1, "M": 3, "H": 5 };
                        totalSkorMurni += Number(bobotMap[levelSoal] ?? 1);
                    } else {
                        const rule = rules[tipeSoal] || {};
                        totalSkorMurni += Number(rule.skor_benar ?? 1);
                    }
                } else {
                    jumlahSalah++;
                    const rule = rules[tipeSoal] || {};
                    totalSkorMurni += Number(rule.skor_salah ?? 0);
                }
            }
        } 
        // -----------------------------------------------------------
        // 2. TIPE 2A (Multiple Response)
        // -----------------------------------------------------------
        else if (tipeSoal === "2A") {
            const rule = rules["2A"] || {};
            // Normalisasi Kunci ke Array
            let kunciArr = [];
            if (Array.isArray(q.Kunci)) {
                kunciArr = q.Kunci.map(k => String(k).trim().toUpperCase());
            } else if (typeof q.Kunci === "string") {
                kunciArr = q.Kunci.split(",").map(k => k.trim().toUpperCase()).filter(Boolean);
            }

            // Normalisasi Jawaban User ke Array
            let userAnsArr = [];
            if (Array.isArray(userAns)) {
                userAnsArr = userAns.map(a => String(a).trim().toUpperCase());
            } else if (typeof userAns === "string" && userAns.trim() !== "") {
                userAnsArr = userAns.split(",").map(a => a.trim().toUpperCase()).filter(Boolean);
            }

            if (userAnsArr.length === 0) {
                jumlahKosong++;
            } else {
                // Pengecekan Eksak (Benar Sempurna)
                const isExactMatch = kunciArr.length === userAnsArr.length && 
                    kunciArr.every(val => userAnsArr.includes(val));

                if (isExactMatch) {
                    jumlahBenar++;
                    totalSkorMurni += Number(rule.skor_benar_semua ?? 1);
                } else {
                    jumlahSalah++;
                    totalSkorMurni += Number(rule.skor_salah ?? 0);
                }
            }
        }
        // -----------------------------------------------------------
        // 3. TIPE 3A & 3B (Short Answer - Angka & Kata)
        // -----------------------------------------------------------
        else if (tipeSoal === "3A" || tipeSoal === "3B") {
            const rule = rules[tipeSoal] || {};
            const kunciStr = String(q.Kunci || "").trim().toLowerCase();

            if (!userAns || String(userAns).trim() === "") {
                jumlahKosong++;
            } else {
                const userAnsStr = String(userAns).trim().toLowerCase();
                if (userAnsStr === kunciStr) {
                    jumlahBenar++;
                    totalSkorMurni += Number(rule.skor_benar ?? 1);
                } else {
                    jumlahSalah++;
                    totalSkorMurni += Number(rule.skor_salah ?? 0);
                }
            }
        }
        // -----------------------------------------------------------
        // 4. TIPE 4A (True / False Checklist Per Statement)
        // -----------------------------------------------------------
        else if (tipeSoal === "4A") {
            const rule = rules["4A"] || {};
            let kunciArr = [];
            if (Array.isArray(q.Kunci)) {
                kunciArr = q.Kunci.map(k => String(k).trim().toUpperCase());
            } else if (typeof q.Kunci === "string") {
                kunciArr = q.Kunci.split(",").map(k => k.trim().toUpperCase()).filter(Boolean);
            }

            // User Answer harus berupa array/object pasangan baris [ "B", "S", "B", "S" ]
            let userAnsArr = Array.isArray(userAns) ? userAns : [];

            if (userAnsArr.length === 0) {
                jumlahKosong++;
            } else {
                let pointPerSoal = 0;
                let adaBenar = false;

                kunciArr.forEach((kunciBaris, i) => {
                    const ansBaris = String(userAnsArr[i] || "").trim().toUpperCase();
                    if (ansBaris === kunciBaris) {
                        pointPerSoal += Number(rule.skor_per_baris_benar ?? 1);
                        adaBenar = true;
                    } else {
                        pointPerSoal += Number(rule.skor_per_baris_salah ?? 0);
                    }
                });

                totalSkorMurni += pointPerSoal;
                if (pointPerSoal === kunciArr.length) {
                    jumlahBenar++;
                } else {
                    jumlahSalah++;
                }
            }
        }
    });

    totalSkorMurni = Math.max(0, totalSkorMurni);
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

    // Re-sync Rekap Log Pelanggaran
    let rawLogs = Array.isArray(App.warningLogs) ? App.warningLogs : [];
    if (rawLogs.length === 0) {
        try {
            const localLogs = localStorage.getItem("cbt_violation_logs");
            if (localLogs) rawLogs = JSON.parse(localLogs);
        } catch(e) {}
    }

    let realJmlPelanggaran = (typeof App.warningCount === 'number') ? App.warningCount : 0;
    const localCount = parseInt(localStorage.getItem("cbt_warning_count"), 10);
    if (!isNaN(localCount) && localCount > realJmlPelanggaran) realJmlPelanggaran = localCount;
    if (realJmlPelanggaran === 0 && rawLogs.length > 0) realJmlPelanggaran = rawLogs.length;

    let formattedLogsText = "Tidak Ada Pelanggaran";
    if (rawLogs.length > 0) {
        formattedLogsText = rawLogs.map((item, idx) => {
            const ke = item.peringatan_ke || (idx + 1);
            const wkt = item.waktu || "-";
            const als = item.alasan || "Pelanggaran Sistem";
            return `[#${ke} | ${wkt}] ${als}`;
        }).join(" ; ");
    } else if (realJmlPelanggaran > 0) {
        formattedLogsText = `${realJmlPelanggaran}x Pelanggaran Terdeteksi`;
    }

    const payload = {
        action: "submit_ujian",
        kode_soal: App.currentKodeUjian || App.soalData?.kode_ujian || "UNKNOWN",
        sistem_ujian: "CBT",
        mode_ujian: App.modeUjian || "UTAMA",
        identitas: dataPesertaResmi,
        jawaban: userAnswers,
        
        jml_pelanggaran: realJmlPelanggaran,
        jumlah_pelanggaran: realJmlPelanggaran,
        total_pelanggaran: realJmlPelanggaran,

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

    try {
        localStorage.removeItem("cbt_warning_count");
        localStorage.removeItem("cbt_violation_logs");
    } catch(e) {}

    tampilkanLayarSelesai(detailHasil);
}

function tampilkanLayarSelesai(detail) {
    if (window.App) App.lastSkorAkhir = detail.skor;

    const possibleLoaders = [
        "loading-overlay", "loading", "loading-screen", 
        "modal-loading", "modal-konfirmasi", "custom-confirm-modal"    
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
                <h2 style="color: #2e7d32; margin-bottom: 5px;">✅ Ujian Selesai!</h2>
                <p style="color: #666; font-size: 14px; margin-bottom: 20px;">Hasil Pengumuman Skor CBT [Kode: <strong>${App.currentKodeUjian || '-'}</strong>]</p>
                
                <div style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 25px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                    <span style="font-size: 13px; color: #555; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Total Skor Akhir</span>
                    <div style="font-size: 54px; font-weight: bold; color: #1a237e; margin: 10px 0;">${detail.skor}</div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 20px; font-size: 14px; background: #f8f9fa; padding: 12px; border-radius: 8px;">
                        <div>✔️ Benar<br><strong style="color: #2e7d32; font-size: 18px;">${detail.benar}</strong></div>
                        <div>❌ Salah<br><strong style="color: #c62828; font-size: 18px;">${detail.salah}</strong></div>
                        <div>⚪ Kosong<br><strong style="color: #f57c00; font-size: 18px;">${detail.kosong}</strong></div>
                    </div>

                    <button onclick="bukaHalamanKunciJawaban()" style="margin-top: 20px; width: 100%; background: #2e7d32; color: #ffffff; padding: 12px; border: none; border-radius: 8px; font-weight: bold; font-size: 15px; cursor: pointer; transition: background 0.2s;">
                        📖 Lihat Kunci Jawaban
                    </button>
                </div>
            </div>
        `;
    }
}

window.submitJawabanScoring = submitJawabanScoring;
window.tampilkanLayarSelesai = tampilkanLayarSelesai;
