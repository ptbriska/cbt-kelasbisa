// ==========================================================
// scoring.js - FULLY DYNAMIC & ISOLATED SCORING ENGINE
// Murni membaca seluruh nilai dari file JSON secara dinamis
// ==========================================================

function submitJawaban() {
    if (!window.App || App.isExamSubmitted) return;
    App.isExamSubmitted = true;

    if (App.timerInterval) clearInterval(App.timerInterval);
    if (App.webcamStream) {
        App.webcamStream.getTracks().forEach(track => track.stop());
        App.webcamStream = null;
    }

    // Ambil Data Utama dari State Global App
    const questions = App.questionsData || App.questions || [];
    const totalSoal = questions.length;
    const userAnswers = App.userAnswers || {};
    
    // Ambil Mode & Konfigurasi Skor LANGSUNG dari JSON
    const modePenilaian = String(App.modePenilaian || "1A").trim().toUpperCase();
    const cfg = App.skorConfig || {};

    // Pembacaan Dinamis dari JSON (Bebas diubah dari Python/JSON tanpa edit JS)
    const valBenar = Number(cfg.skor_benar ?? 1);
    const valSalah = Number(cfg.skor_salah ?? 0);
    const valKosong = Number(cfg.skor_kosong ?? 0);
    const bobotMap = cfg.bobot_level || {};

    let jumlahBenar = 0;
    let jumlahSalah = 0;
    let jumlahKosong = 0;
    let totalSkorMurni = 0;

    // =========================================================
    // ISOLASI LOGIKA BERSYARAT (IF - ELSE IF - ELSE)
    // =========================================================

    if (modePenilaian === "1C") {
        // ------------------------------------------------------
        // MODE 1C: Menggunakan Bobot Level Soal dari JSON
        // ------------------------------------------------------
        questions.forEach((q) => {
            const userAns = userAnswers[q.No];
            const kunci = String(q.Kunci || "").trim().toUpperCase();
            
            // Ambil level soal & cari bobotnya di JSON, jika level tidak ada pakai default 1
            const levelSoal = String(q.Level || "").trim().toUpperCase();
            const bobotSoal = Number(bobotMap[levelSoal] ?? 1);

            if (!userAns) {
                jumlahKosong++;
                totalSkorMurni += (bobotSoal * valKosong);
            } else if (String(userAns).trim().toUpperCase() === kunci) {
                jumlahBenar++;
                totalSkorMurni += (bobotSoal * valBenar);
            } else {
                jumlahSalah++;
                totalSkorMurni += (bobotSoal * valSalah);
            }
        });

    } else if (modePenilaian === "1B") {
        // ------------------------------------------------------
        // MODE 1B: Skor Minus / Penalty (Tanpa Mengabaikan Bobot Level)
        // ------------------------------------------------------
        questions.forEach((q) => {
            const userAns = userAnswers[q.No];
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
        // ------------------------------------------------------
        // MODE 1A: Standard / Proporsional
        // ------------------------------------------------------
        questions.forEach((q) => {
            const userAns = userAnswers[q.No];
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

        // Opsi Skala 100 Khusus 1A jika diaktifkan di JSON
        if (cfg.use_scaling_100 && totalSoal > 0) {
            totalSkorMurni = (jumlahBenar / totalSoal) * 100;
        }
    }

    const skorAkhir = Number(totalSkorMurni.toFixed(2));

    const detailHasil = {
        benar: jumlahBenar,
        salah: jumlahSalah,
        kosong: jumlahKosong,
        totalSoal: totalSoal,
        skor: skorAkhir
    };

    // Tampilkan Loading Pengiriman
    const pageCbt = document.getElementById("page-cbt");
    if (pageCbt) {
        pageCbt.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; font-family: sans-serif;">
                <h2 style="color: #1a237e;">Mengirimkan Jawaban...</h2>
                <p style="color: #666;">Mohon tunggu sebentar, jawaban sedang diproses.</p>
            </div>
        `;
    }

    // Payload Webhook Dinamis
    const dataPesertaResmi = App.verifiedPesertaData || App.userIdentitas || {};
    const payload = {
        kode_soal: App.currentKodeUjian || App.examData?.kode_ujian || "UNKNOWN",
        sistem_ujian: "CBT",
        mode_ujian: App.modeUjian || "UTAMA",
        mode_penilaian: modePenilaian, // Mengirim nilai mode acuan dinamis ke GS
        identitas: dataPesertaResmi,
        jawaban: userAnswers,
        total_dijawab: Object.keys(userAnswers).length,
        total_soal: totalSoal,
        skor_total: skorAkhir,
        skor_akhir: skorAkhir,
        benar: jumlahBenar,
        salah: jumlahSalah,
        kosong: jumlahKosong
    };

    if (App.WEBHOOK_URL && App.WEBHOOK_URL.trim() !== "") {
        fetch(App.WEBHOOK_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(() => setTimeout(() => tampilkanLayarSelesai(detailHasil), 800))
        .catch(() => setTimeout(() => tampilkanLayarSelesai(detailHasil), 800));
    } else {
        setTimeout(() => tampilkanLayarSelesai(detailHasil), 800);
    }
}

function tampilkanLayarSelesai(detail) {
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
