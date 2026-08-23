// ==========================================================
// scoring.js - Multi-Scoring Engine & Webhook Reporter (v1.3.1)
// ==========================================================

function submitJawaban() {
    if (App.isExamSubmitted) return;
    App.isExamSubmitted = true;

    // Hentikan Timer Ujian
    if (App.timerInterval) clearInterval(App.timerInterval);

    // Lepas Event Listener Keamanan
    if (typeof handleVisibilityChange === "function") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof handleWindowBlur === "function") {
        window.removeEventListener("blur", handleWindowBlur);
    }

    // Mengambil identitas resmi terverifikasi dari peserta.json (atau fallback ke userIdentitas)
    const dataPesertaResmi = App.verifiedPesertaData || App.userIdentitas || {};

    // Kunci browser jika Mode SIMULASI
    if (App.modeUjian === "SIMULASI") {
        const namaUser = dataPesertaResmi["Nama Lengkap"] || dataPesertaResmi.nama || "USER";
        const lockKey = `SUBMITTED_${App.currentKodeUjian}_${namaUser}`;
        localStorage.setItem(lockKey, "TRUE");
    }

    let totalSkor = 0;
    let jumlahBenar = 0;
    let jumlahSalah = 0;
    let jumlahKosong = 0;

    // MULTI-MODE SCORING ENGINE CBT (1A, 1B, 1C)
    App.questionsData.forEach((q, idx) => {
        const displayNo = idx + 1;
        const ans = App.userAnswers[displayNo];
        const kunci = q.Kunci ? String(q.Kunci).trim().toUpperCase() : "";

        if (App.modePenilaian === "1A") {
            // 1A: Standard Benar (Skala 100)
            if (!ans) {
                jumlahKosong++;
            } else if (ans === kunci) {
                jumlahBenar++;
            } else {
                jumlahSalah++;
            }
        } else if (App.modePenilaian === "1B") {
            // 1B: Custom Skor Penalti / Kosong
            const pBenar = App.skorConfig.benar !== undefined ? App.skorConfig.benar : 4;
            const pSalah = App.skorConfig.salah !== undefined ? App.skorConfig.salah : -1;
            const pKosong = App.skorConfig.kosong !== undefined ? App.skorConfig.kosong : 0;

            if (!ans) {
                jumlahKosong++;
                totalSkor += pKosong;
            } else if (ans === kunci) {
                jumlahBenar++;
                totalSkor += pBenar;
            } else {
                jumlahSalah++;
                totalSkor += pSalah;
            }
        } else if (App.modePenilaian === "1C") {
            // 1C: Dynamic Difficulty (EASY, MEDIUM, HARD)
            const diff = q.Difficulty ? String(q.Difficulty).toUpperCase() : "MEDIUM";
            const weightMap = App.skorConfig.bobot_difficulty || { EASY: 2, MEDIUM: 3, HARD: 5 };
            const poinMax = weightMap[diff] || 3;

            if (!ans) {
                jumlahKosong++;
            } else if (ans === kunci) {
                jumlahBenar++;
                totalSkor += poinMax;
            } else {
                jumlahSalah++;
            }
        }
    });

    const totalSoal = App.questionsData.length;
    let skorAkhir = 0;

    if (App.modePenilaian === "1A") {
        skorAkhir = totalSoal > 0 ? Number(((jumlahBenar / totalSoal) * 100).toFixed(2)) : 0;
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

    // Tampilkan Indikator Loading
    const pageCbt = document.getElementById("page-cbt");
    if (pageCbt) {
        pageCbt.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; font-family: sans-serif;">
                <h2 style="color: #1a237e; margin-bottom: 10px;">Mengirimkan Jawaban...</h2>
                <p style="color: #666;">Mohon tunggu sebentar, jawaban Anda sedang disimpan dan diproses oleh sistem CBT.</p>
            </div>
        `;
    }

    // Structuring Payload Sesuai Format peserta.json
    const payload = {
        kode_soal: App.currentKodeUjian,
        sistem_ujian: "CBT",
        mode_ujian: App.modeUjian || "UTAMA",
        mode_penilaian: App.modePenilaian,
        
        // Mengirimkan Objek Identitas yang berisi field asli dari peserta.json
        identitas: dataPesertaResmi,
        
        jawaban: App.userAnswers,
        total_dijawab: Object.keys(App.userAnswers).length,
        total_soal: totalSoal,
        skor_total: skorAkhir,
        skor: skorAkhir,
        benar: jumlahBenar,
        salah: jumlahSalah,
        kosong: jumlahKosong,
        jumlah_benar: jumlahBenar,
        jumlah_salah: jumlahSalah,
        jumlah_kosong: jumlahKosong,
        skor_akhir: skorAkhir
    };

    // Pengiriman Data ke Google Sheets Webhook
    if (App.WEBHOOK_URL && App.WEBHOOK_URL.trim() !== "") {
        fetch(App.WEBHOOK_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        .then(() => tampilkanLayarSelesai(detailHasil))
        .catch(err => {
            console.error("Error Webhook:", err);
            tampilkanLayarSelesai(detailHasil);
        });
    } else {
        tampilkanLayarSelesai(detailHasil);
    }
}

function tampilkanLayarSelesai(detail) {
    const htmlContent = `
        <div style="text-align:center; padding: 30px 15px; font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #2e7d32; margin-bottom: 5px;">✅ Ujian CBT Selesai!</h2>
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">Hasil Pengumuman Skor Resmi [Kode: <strong>${App.currentKodeUjian}</strong>]</p>
            
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
