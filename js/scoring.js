/* ==========================================================
   js/scoring.js - MULTI-TYPE SCORING ENGINE V1.6.4 (FIXED)
   Sesuai Dokumen Pedoman Tipe Soal & Format JSON
   (Fix: Target Element `#page-scoring`, Button Handler & Type 5A Scoring)
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
    
    // Konfigurasi aturan skor (default fallback)
    const rules = App.scoringRules || App.soalData?.scoring_rules || {
        "1A": { "skor_benar": 1.0, "skor_salah": 0.0, "skor_kosong": 0.0 },
        "1B": { "skor_benar": 4.0, "skor_salah": -1.0, "skor_kosong": 0.0 },
        "1C": { "bobot_level": { "E": 1.0, "M": 3.0, "H": 5.0 }, "skor_salah": 0.0 },
        "2A": { "skor_benar_semua": 1.0, "skor_salah": 0.0 },
        "3A": { "skor_benar": 1.0, "skor_salah": 0.0 },
        "3B": { "skor_benar": 1.0, "skor_salah": 0.0 },
        "4A": { "skor_per_baris_benar": 1.0, "skor_per_baris_salah": 0.0 },
        "5A": { "skor_kosong": 0.0 }
    };

    let totalSkorMurni = 0;
    let totalSkorMaksimal = 0;
    let jumlahBenar = 0;
    let jumlahSalah = 0;
    let jumlahKosong = 0;
    
    const rincianJawaban = [];

    questions.forEach((q, idx) => {
        const noSoal = q.No || (idx + 1);
        const tipeSoal = String(q.Tipe || q.TipeSoal || "1A").trim().toUpperCase();
        const userAns = userAnswers[noSoal];

        let pointSoal = 0;
        let maxPointSoal = 0;
        let userAnsDisplay = "-";
        let kunciDisplay = "-";

        // -----------------------------------------------------------
        // 1. TIPE 1A, 1B, 1C (Single Response)
        // -----------------------------------------------------------
        if (["1A", "1B", "1C"].includes(tipeSoal)) {
            const kunci = String(q.Kunci || "").trim().toUpperCase();
            kunciDisplay = kunci || "-";
            
            if (tipeSoal === "1C") {
                const levelSoal = String(q.Level || "E").trim().toUpperCase();
                const bobotMap = rules["1C"]?.bobot_level || { "E": 1, "M": 3, "H": 5 };
                maxPointSoal = Number(bobotMap[levelSoal] ?? 1);
            } else {
                const rule = rules[tipeSoal] || {};
                maxPointSoal = Number(rule.skor_benar ?? 1);
            }

            if (!userAns || String(userAns).trim() === "") {
                jumlahKosong++;
                const rule = rules[tipeSoal] || {};
                pointSoal = Number(rule.skor_kosong ?? 0);
            } else {
                userAnsDisplay = String(userAns).trim().toUpperCase();
                const isCorrect = userAnsDisplay === kunci;
                if (isCorrect) {
                    jumlahBenar++;
                    pointSoal = maxPointSoal;
                } else {
                    jumlahSalah++;
                    const rule = rules[tipeSoal] || {};
                    pointSoal = Number(rule.skor_salah ?? 0);
                }
            }
        } 
        // -----------------------------------------------------------
        // 2. TIPE 2A (Multiple Response)
        // -----------------------------------------------------------
        else if (tipeSoal === "2A") {
            const rule = rules["2A"] || {};
            maxPointSoal = Number(rule.skor_benar_semua ?? 1);

            let kunciArr = [];
            if (Array.isArray(q.Kunci)) {
                kunciArr = q.Kunci.map(k => String(k).trim().toUpperCase());
            } else if (typeof q.Kunci === "string") {
                kunciArr = q.Kunci.split(",").map(k => k.trim().toUpperCase()).filter(Boolean);
            }
            kunciDisplay = kunciArr.join(", ") || "-";

            let userAnsArr = [];
            if (Array.isArray(userAns)) {
                userAnsArr = userAns.map(a => String(a).trim().toUpperCase());
            } else if (typeof userAns === "string" && userAns.trim() !== "") {
                userAnsArr = userAns.split(",").map(a => a.trim().toUpperCase()).filter(Boolean);
            }

            if (userAnsArr.length === 0) {
                jumlahKosong++;
                pointSoal = 0;
            } else {
                userAnsDisplay = userAnsArr.join(", ");
                const isExactMatch = kunciArr.length === userAnsArr.length && 
                    kunciArr.every(val => userAnsArr.includes(val));

                if (isExactMatch) {
                    jumlahBenar++;
                    pointSoal = maxPointSoal;
                } else {
                    jumlahSalah++;
                    pointSoal = Number(rule.skor_salah ?? 0);
                }
            }
        }
        // -----------------------------------------------------------
        // 3. TIPE 3A & 3B (Short Answer - Angka & Kata)
        // -----------------------------------------------------------
        else if (tipeSoal === "3A" || tipeSoal === "3B") {
            const rule = rules[tipeSoal] || {};
            maxPointSoal = Number(rule.skor_benar ?? 1);
            const kunciStr = String(q.Kunci || "").trim();
            kunciDisplay = kunciStr || "-";

            if (!userAns || String(userAns).trim() === "") {
                jumlahKosong++;
                pointSoal = 0;
            } else {
                userAnsDisplay = String(userAns).trim();
                if (userAnsDisplay.toLowerCase() === kunciStr.toLowerCase()) {
                    jumlahBenar++;
                    pointSoal = maxPointSoal;
                } else {
                    jumlahSalah++;
                    pointSoal = Number(rule.skor_salah ?? 0);
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
            kunciDisplay = kunciArr.join(", ") || "-";
            maxPointSoal = kunciArr.length * Number(rule.skor_per_baris_benar ?? 1);

            let userAnsArr = Array.isArray(userAns) ? userAns : [];

            if (userAnsArr.length === 0) {
                jumlahKosong++;
                pointSoal = 0;
            } else {
                userAnsDisplay = userAnsArr.map(v => v ? String(v).trim().toUpperCase() : "-").join(", ");
                let pointPerSoal = 0;

                kunciArr.forEach((kunciBaris, i) => {
                    const ansBaris = String(userAnsArr[i] || "").trim().toUpperCase();
                    if (ansBaris === kunciBaris) {
                        pointPerSoal += Number(rule.skor_per_baris_benar ?? 1);
                    } else {
                        pointPerSoal += Number(rule.skor_per_baris_salah ?? 0);
                    }
                });

                pointSoal = pointPerSoal;
                if (pointPerSoal === maxPointSoal) {
                    jumlahBenar++;
                } else {
                    jumlahSalah++;
                }
            }
        }
        // -----------------------------------------------------------
        // 5. TIPE 5A (Weighted Options / Opsi Berbobot / TKP)
        // -----------------------------------------------------------
        else if (tipeSoal === "5A") {
            const rule = rules["5A"] || {};
            
            let bobotMap = {};
            if (typeof q.Kunci === "object" && q.Kunci !== null && !Array.isArray(q.Kunci)) {
                bobotMap = q.Kunci;
            } else if (typeof q.Bobot === "object" && q.Bobot !== null) {
                bobotMap = q.Bobot;
            } else if (typeof q.BobotOpsi === "object" && q.BobotOpsi !== null) {
                bobotMap = q.BobotOpsi;
            }
            
            const bobotValues = Object.values(bobotMap).map(v => Number(v) || 0);
            maxPointSoal = bobotValues.length > 0 ? Math.max(...bobotValues) : 5;

            let bestOpt = "";
            let maxOptVal = -Infinity;
            Object.entries(bobotMap).forEach(([optKey, optVal]) => {
                if (Number(optVal) > maxOptVal) {
                    maxOptVal = Number(optVal);
                    bestOpt = optKey;
                }
            });

            if (bestOpt) {
                kunciDisplay = `${bestOpt} (Poin Maks: ${maxOptVal})`;
            } else if (typeof q.Kunci === "string") {
                kunciDisplay = q.Kunci;
            } else {
                kunciDisplay = "Opsi Berbobot (1-5)";
            }

            const userChoice = String(userAns || "").trim().toUpperCase();

            if (!userChoice) {
                jumlahKosong++;
                pointSoal = Number(rule.skor_kosong ?? 0);
            } else {
                userAnsDisplay = userChoice;
                pointSoal = Number(bobotMap[userChoice] ?? 0);

                if (pointSoal > 0) {
                    jumlahBenar++;
                } else {
                    jumlahSalah++;
                }
            }
        }

        totalSkorMurni += pointSoal;
        totalSkorMaksimal += maxPointSoal;

        rincianJawaban.push({
            no: noSoal,
            tipe: tipeSoal,
            jawabanUser: userAnsDisplay,
            kunciJawaban: kunciDisplay,
            skorDiperoleh: pointSoal,
            skorMax: maxPointSoal
        });
    });

    totalSkorMurni = Math.max(0, totalSkorMurni);
    const skorAkhir = Number(totalSkorMurni.toFixed(2));
    const persentaseVal = totalSkorMaksimal > 0 ? Math.round((skorAkhir / totalSkorMaksimal) * 100) : 0;

    const detailHasil = {
        benar: jumlahBenar,
        salah: jumlahSalah,
        kosong: jumlahKosong,
        totalSoal: totalSoal,
        skor: skorAkhir,
        skorMaksimal: totalSkorMaksimal,
        persentase: persentaseVal,
        rincian: rincianJawaban
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

    // Baris tabel rincian jawaban
    const tableRows = (detail.rincian || []).map(r => `
        <tr style="border-bottom: 1px solid #e2e8f0; text-align: left;">
            <td style="padding: 10px 12px; font-weight: bold; color: #334155;">${r.no}</td>
            <td style="padding: 10px 12px; color: #475569;">${r.tipe}</td>
            <td style="padding: 10px 12px; color: #1e293b; font-weight: 500;">${r.jawabanUser}</td>
            <td style="padding: 10px 12px; color: #475569;">${r.kunciJawaban}</td>
            <td style="padding: 10px 12px; font-weight: bold; color: #0f172a;">${r.skorDiperoleh} / ${r.skorMax}</td>
        </tr>
    `).join('');

    const htmlContent = `
        <div style="padding: 30px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 850px; margin: 0 auto; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 25px;">
                <h2 style="color: #2e7d32; margin: 0 0 5px 0; font-size: 24px;">✅ Ujian Selesai!</h2>
                <p style="color: #64748b; font-size: 14px; margin: 0;">Hasil Live Report &amp; Auto-Scoring [Kode: <strong>${App.currentKodeUjian || '-'}</strong>]</p>
            </div>

            <!-- CARDS RINGKASAN SKOR -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 15px; text-align: center;">
                    <span style="font-size: 13px; color: #1d4ed8; font-weight: 600;">Total Skor</span>
                    <div style="font-size: 32px; font-weight: 800; color: #1e40af; margin-top: 5px;">${detail.skor}</div>
                </div>
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 15px; text-align: center;">
                    <span style="font-size: 13px; color: #1d4ed8; font-weight: 600;">Skor Maksimal</span>
                    <div style="font-size: 32px; font-weight: 800; color: #1e40af; margin-top: 5px;">${detail.skorMaksimal ?? '-'}</div>
                </div>
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 15px; text-align: center;">
                    <span style="font-size: 13px; color: #1d4ed8; font-weight: 600;">Persentase</span>
                    <div style="font-size: 32px; font-weight: 800; color: #1e40af; margin-top: 5px;">${detail.persentase ?? 0}%</div>
                </div>
            </div>

            <!-- RINGKASAN JUMLAH BENAR / SALAH / KOSONG -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 25px; font-size: 14px; background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center;">
                <div>✔️ Benar<br><strong style="color: #16a34a; font-size: 18px;">${detail.benar}</strong></div>
                <div>❌ Salah<br><strong style="color: #dc2626; font-size: 18px;">${detail.salah}</strong></div>
                <div>⚪ Kosong<br><strong style="color: #d97706; font-size: 18px;">${detail.kosong}</strong></div>
            </div>

            <!-- TABEL RINCIAN JAWABAN PER SOAL -->
            <div style="margin-bottom: 25px;">
                <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">Rincian Jawaban Per Soal</h3>
                <div style="overflow-x: auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569;">
                                <th style="padding: 12px; font-weight: 600;">No</th>
                                <th style="padding: 12px; font-weight: 600;">Tipe</th>
                                <th style="padding: 12px; font-weight: 600;">Jawaban Anda</th>
                                <th style="padding: 12px; font-weight: 600;">Kunci Jawaban</th>
                                <th style="padding: 12px; font-weight: 600;">Skor diperoleh</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- TOMBOL NAVIGASI DENGAN FUNCTION HANDLER YANG DI-FIX -->
            <button onclick="typeof bukaHalamanReviewJawaban === 'function' ? bukaHalamanReviewJawaban() : (typeof bukaHalamanKunciJawaban === 'function' && bukaHalamanKunciJawaban())" style="width: 100%; background: #2e7d32; color: #ffffff; padding: 14px 20px; border: none; border-radius: 10px; font-weight: 700; font-size: 15px; cursor: pointer; transition: background 0.2s; box-shadow: 0 4px 6px rgba(46, 125, 50, 0.2);">
                📖 Buka Halaman Pembahasan Jawaban dan Rapor Peserta
            </button>
        </div>
    `;

    // Prioritaskan Render ke Container #page-scoring (HTML V1.6.6)
    const pageScoring = document.getElementById("page-scoring");
    const pageCbt = document.getElementById("page-cbt");

    if (pageScoring) {
        pageScoring.innerHTML = htmlContent;
        pageScoring.classList.remove("hidden");
        pageScoring.style.display = "block";
        if (pageCbt) {
            pageCbt.classList.add("hidden");
            pageCbt.style.display = "none";
        }
    } else if (pageCbt) {
        // Fallback jika elemen #page-scoring belum ditambahkan di HTML
        pageCbt.innerHTML = htmlContent;
    }

    // MathJax typesetting re-render (jika tersedia)
    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise().catch(err => console.warn("MathJax re-render err:", err));
    }
}

// Global Alias agar kompatibel dengan pemanggilan dari script lain
window.bukaHalamanKunciJawaban = function() {
    if (typeof window.bukaHalamanReviewJawaban === "function") {
        window.bukaHalamanReviewJawaban();
    } else {
        console.error("Fungsi bukaHalamanReviewJawaban() tidak ditemukan di answer.js!");
    }
};

window.submitJawabanScoring = submitJawabanScoring;
window.tampilkanLayarSelesai = tampilkanLayarSelesai;
