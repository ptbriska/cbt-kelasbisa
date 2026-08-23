// ==========================================================
// scoring.js - Dynamic Dynamic Scoring Engine (v1.3.6)
// ==========================================================

function submitJawaban() {
    if (App.isExamSubmitted) return;
    App.isExamSubmitted = true;

    if (App.timerInterval) clearInterval(App.timerInterval);

    if (typeof handleVisibilityChange === "function") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof handleWindowBlur === "function") {
        window.removeEventListener("blur", handleWindowBlur);
    }

    const dataPesertaResmi = App.verifiedPesertaData || App.userIdentitas || {};

    if (App.modeUjian === "SIMULASI") {
        const namaUser = dataPesertaResmi["Nama Lengkap"] || dataPesertaResmi.nama || "USER";
        const lockKey = `SUBMITTED_${App.currentKodeUjian}_${namaUser}`;
        localStorage.setItem(lockKey, "TRUE");
    }

    let totalSkor = 0;
    let jumlahBenar = 0;
    let jumlahSalah = 0;
    let jumlahKosong = 0;

    // AMBIL KONFIGURASI SKOR DARI JSON METADATA
    const modePenilaian = (App.modePenilaian || "1A").toUpperCase();
    const skorConfig = App.skorConfig || {};

    const pBenar = skorConfig.skor_benar !== undefined ? Number(skorConfig.skor_benar) : 1.0;
    const pSalah = skorConfig.skor_salah !== undefined ? Number(skorConfig.skor_salah) : 0.0;
    const pKosong = skorConfig.skor_kosong !== undefined ? Number(skorConfig.skor_kosong) : 0.0;
    const useScaling100 = Boolean(skorConfig.use_scaling_100);

    const bobotLevelMap = skorConfig.bobot_level || { E: 1.0, M: 3.0, H: 5.0 };

    // PENILAIAN PER NOMOR SOAL
    App.questionsData.forEach((q, idx) => {
        const displayNo = idx + 1;
        const ans = App.userAnswers[displayNo];
        const kunci = q.Kunci ? String(q.Kunci).trim().toUpperCase() : (q.kunci ? String(q.kunci).trim().toUpperCase() : "");

        if (!ans) {
            jumlahKosong++;
            if (modePenilaian === "1B") {
                totalSkor += pKosong;
            }
        } else if (ans === kunci) {
            jumlahBenar++;
            if (modePenilaian === "1A") {
                totalSkor += pBenar;
            } else if (modePenilaian === "1B") {
                totalSkor += pBenar;
            } else if (modePenilaian === "1C") {
                const lvl = (q.Level || q.level || "E").trim().toUpperCase();
                const bobotSoal = bobotLevelMap[lvl] !== undefined ? Number(bobotLevelMap[lvl]) : 1.0;
                
                totalSkor += (bobotSoal * pBenar);
            }
        } else {
            jumlahSalah++;
            if (modePenilaian === "1B" || modePenilaian === "1C") {
                totalSkor += pSalah;
            }
        }
    });

    const totalSoal = App.questionsData.length;
    let skorAkhir = 0;

    // PERHITUNGAN AKHIR KANONIKAL
    if (modePenilaian === "1A") {
        if (useScaling100) {
            skorAkhir = totalSoal > 0 ? Number(((jumlahBenar / totalSoal) * 100).toFixed(2)) : 0;
        } else {
            skorAkhir = Number(totalSkor.toFixed(2));
        }
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

    // TAMPILKAN STATUS PENGIRIMAN
    const pageCbt = document.getElementById("page-cbt");
    if (pageCbt) {
        pageCbt.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; font-family: sans-serif;">
                <h2 style="color: #1a237e; margin-bottom: 10px;">Mengirimkan Jawaban...</h2>
                <p style="color: #666;">Mohon tunggu sebentar, jawaban Anda sedang disimpan dan diproses oleh sistem CBT.</p>
            </div>
        `;
    }

    // PAYLOAD WEBHOOK
    const payload = {
        kode_soal: App.currentKodeUjian,
        sistem_ujian: "CBT",
        mode_ujian: App.modeUjian || "UTAMA",
        mode_penilaian: modePenilaian,
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

    if (App.WEBHOOK_URL && App.WEBHOOK_URL.trim() !== "") {
        fetch(App.WEBHOOK_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
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
