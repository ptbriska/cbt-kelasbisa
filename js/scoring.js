// ==========================================================
// scoring.js - Dynamic Scoring & Webhook Submission Engine
// 100% Automate dari JSON Soal (skor_config & questions)
// ==========================================================

function submitJawaban() {
    if (!window.App || App.isExamSubmitted) return;
    App.isExamSubmitted = true;

    // 1. Hentikan Timer Ujian
    if (App.timerInterval) {
        clearInterval(App.timerInterval);
    }

    // 2. Lepas Event Listener Keamanan
    if (typeof handleVisibilityChange === "function") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof handleWindowBlur === "function") {
        window.removeEventListener("blur", handleWindowBlur);
    }

    // 3. Matikan Stream Kamera Proctoring jika Aktif
    if (App.webcamStream) {
        App.webcamStream.getTracks().forEach(track => track.stop());
        App.webcamStream = null;
    }

    // 4. Set Gembok Submit jika dalam Mode SIMULASI
    const dataPesertaResmi = App.verifiedPesertaData || App.userIdentitas || {};
    if (App.modeUjian === "SIMULASI" && App.currentKodeUjian) {
        const namaUser = dataPesertaResmi["Nama Lengkap"] || dataPesertaResmi.nama || "USER";
        const lockKey = `SUBMITTED_${App.currentKodeUjian}_${namaUser}`;
        localStorage.setItem(lockKey, "TRUE");
    }

    // 5. AMBIL KONFIGURASI DENGAN DEFENSIVE PROGRAMMING (FALLBACK AMAN)
    const examData = App.examData || {};
    const modePenilaian = String(examData.mode_penilaian || "1A").trim().toUpperCase();
    
    // Pastikan cfg tidak undefined agar tidak error saat dipanggil
    const cfg = examData.skor_config || { 
        skor_benar: 1, 
        skor_salah: 0, 
        skor_kosong: 0, 
        bobot_level: {},
        use_scaling_100: false 
    };

    let totalSkor = 0;
    let jumlahBenar = 0;
    let jumlahSalah = 0;
    let jumlahKosong = 0;

    // 6. PENILAIAN PER NOMOR SOAL
    const questions = examData.questions || []; // Amankan dengan array kosong
    const totalSoal = questions.length;
    const userAnswers = App.userAnswers || {}; // Amankan object jawaban

    questions.forEach((q) => {
        const userAns = userAnswers[q.No];
        const kunci = String(q.Kunci || "").trim().toUpperCase();

        if (!userAns) {
            // KOSONG
            jumlahKosong++;
            totalSkor += (cfg.skor_kosong || 0);
        } else if (String(userAns).trim().toUpperCase() === kunci) {
            // BENAR
            jumlahBenar++;
            if (modePenilaian === "1C") {
                // Amankan pembobotan level
                const bobot = Number(cfg.bobot_level[q.Level] || 1);
                totalSkor += ((cfg.skor_benar || 1) * bobot);
            } else {
                totalSkor += (cfg.skor_benar || 1);
            }
        } else {
            // SALAH
            jumlahSalah++;
            totalSkor += (cfg.skor_salah || 0);
        }
    });

    // 7. PERHITUNGAN AKHIR KANONIKAL & PROTEKSI SKOR MINUS
    let skorAkhir = 0;

    if (modePenilaian === "1A") {
        if (cfg.use_scaling_100) {
            skorAkhir = totalSoal > 0 ? Number(((jumlahBenar / totalSoal) * 100).toFixed(2)) : 0;
        } else {
            skorAkhir = Number(totalSkor.toFixed(2));
        }
    } else if (modePenilaian === "1C") {
        // Proteksi Mutlak Mode 1C: Kunci nilai minimal di angka 0
        skorAkhir = Math.max(0, Number(totalSkor.toFixed(2)));
    } else {
        skorAkhir = Number(totalSkor.toFixed(2));
    }

    const detailHasil = {
        benar: jumlahBenar,
        salah: jumlahSalah,
        kosong: jumlahKosong,
        totalSoal: totalSoal,
        skor: skorAkhir
    };

    // 8. TAMPILKAN STATUS PENGIRIMAN DI UI
    const pageCbt = document.getElementById("page-cbt");
    if (pageCbt) {
        pageCbt.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; font-family: sans-serif;">
                <h2 style="color: #1a237e; margin-bottom: 10px;">Mengirimkan Jawaban...</h2>
                <p style="color: #666;">Mohon tunggu sebentar, jawaban dan bukti sedang dikirim ke server.</p>
            </div>
        `;
    }

    // 9. BENTUK PAYLOAD WEBHOOK
    const payload = {
        kode_soal: examData.kode_ujian || App.currentKodeUjian || "UNKNOWN",
        sistem_ujian: "CBT",
        mode_ujian: examData.mode_ujian || App.modeUjian || "UTAMA",
        mode_penilaian: modePenilaian,
        identitas: dataPesertaResmi,
        jawaban: userAnswers,
        total_dijawab: Object.keys(userAnswers).length,
        total_soal: totalSoal,
        skor_total: skorAkhir,
        skor: skorAkhir,
        benar: jumlahBenar,
        salah: jumlahSalah,
        kosong: jumlahKosong,
        jumlah_benar: jumlahBenar,
        jumlah_salah: jumlahSalah,
        jumlah_kosong: jumlahKosong,
        skor_akhir: skorAkhir,
        
        total_pelanggaran: App.warningCount || 0,
        log_pelanggaran: App.warningLogs || [],
        foto_pelanggaran: App.cheatingSnapshots || []
    };

    // 10. KIRIM VIA WEBHOOK
    if (App.WEBHOOK_URL && App.WEBHOOK_URL.trim() !== "") {
        fetch(App.WEBHOOK_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(() => {
            // Tambahkan sedikit delay agar text "Mengirimkan Jawaban..." terasa UX-nya
            setTimeout(() => tampilkanLayarSelesai(detailHasil), 800);
        })
        .catch(err => {
            console.error("Error Webhook:", err);
            setTimeout(() => tampilkanLayarSelesai(detailHasil), 800);
        });
    } else {
        setTimeout(() => tampilkanLayarSelesai(detailHasil), 800);
    }
}

function tampilkanLayarSelesai(detail) {
    const htmlContent = `
        <div style="text-align:center; padding: 30px 15px; font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #2e7d32; margin-bottom: 5px;">✅ Ujian CBT Selesai!</h2>
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">Hasil Pengumuman Skor Resmi [Kode: <strong>${App.currentKodeUjian || '-'}</strong>]</p>
            
            <div style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 25px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                <span style="font-size: 13px; color: #555; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Skor Perolehan Akhir</span>
                <div style="font-size: 54px; font-weight: bold; color: #1a237e; margin: 10px 0;">${detail.skor}</div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 20px; font-size: 14px; background: #f8f9fa; padding: 12px; border-radius: 8px;">
                    <div>✔️ Benar<br><strong style="color: #2e7d32; font-size: 18px;">${detail.benar}</strong></div>
                    <div>❌ Salah<br><strong style="color: #c62828; font-size: 18px;">${detail.salah}</strong></div>
                    <div>⚪ Kosong<br><strong style="color: #f57c00; font-size: 18px;">${detail.kosong}</strong></div>
                </div>
            </div>
        </div>
    `;

    const pageCbt = document.getElementById("page-cbt");
    if (pageCbt) {
        pageCbt.innerHTML = htmlContent;
    }
}
