/* ==========================================================================
   answer.js - Module Pembuka Kunci Jawaban & Print PDF (CBT-KIBI v1.4)
   ========================================================================== */

window.App = window.App || {};

/**
 * Membuka Modal Review Soal dan Kunci Jawaban
 */
function bukaHalamanKunciJawaban() {
    const questions = App.questionsData || App.questions || [];
    const userAnswers = App.userAnswers || {};
    const identitas = App.verifiedPesertaData || App.userIdentitas || {};

    if (!questions || questions.length === 0) {
        alert("Data soal tidak ditemukan untuk ditinjau.");
        return;
    }

    let reviewModal = document.getElementById("review-modal");
    if (!reviewModal) {
        reviewModal = document.createElement("div");
        reviewModal.id = "review-modal";
        document.body.appendChild(reviewModal);
    }

    // Render HTML Container
    reviewModal.innerHTML = `
        <div class="watermark-briska">ASET BRISKA</div>
        <div class="review-container">
            
            <!-- Tombol Aksi Top -->
            <div class="review-actions">
                <button class="btn-print" onclick="cetakKunciPDF()">🖨️ Cetak / Simpan PDF</button>
                <button class="btn-close-review" onclick="tutupHalamanKunci()">❌ Tutup Review</button>
            </div>

            <!-- Kop Surat Resmi (Print Only) -->
            <div class="print-kop-header">
                <h2>LEMBAR EVALUASI & KUNCI JAWABAN RESMI</h2>
                <p>SISTEM UJIAN CBT-KIBI | KODE UJIAN: ${App.currentKodeUjian || 'CBT-ONLINE'}</p>
                <p>Dokumen Rahasia - Hak Cipta & Pengawasan Aset BRISKA</p>
            </div>

            <!-- Rekap Identitas Siswa -->
            <div class="student-summary-card">
                <div><strong>Nama Peserta:</strong> ${identitas["Nama Lengkap"] || identitas.nama || '-'}</div>
                <div><strong>Instansi/Sekolah:</strong> ${identitas["Asal Instansi"] || identitas.sekolah || '-'}</div>
                <div><strong>Kode Ujian:</strong> ${App.currentKodeUjian || '-'}</div>
                <div><strong>Total Skor:</strong> ${App.lastSkorAkhir || 'Selesai'}</div>
            </div>

            <!-- Blok-Blok Soal dan Kunci -->
            <div id="review-blocks-list"></div>
        </div>
    `;

    const blockContainer = document.getElementById("review-blocks-list");
    let htmlContent = "";

    // Loop Menyusun Blok Soal & Sub-Blok Kunci
    questions.forEach((q, idx) => {
        const noSoal = q.No || (idx + 1);
        const teksSoal = q.Soal || q.question || "Teks soal tidak tersedia";
        const kunci = String(q.Kunci || q.key || "-").trim().toUpperCase();
        const userAns = String(userAnswers[noSoal] || "").trim().toUpperCase();

        let statusBadge = "";
        if (!userAns) {
            statusBadge = `<span class="status-badge badge-kosong">⚪ Tidak Dijawab</span>`;
        } else if (userAns === kunci) {
            statusBadge = `<span class="status-badge badge-benar">✔️ BENAR</span>`;
        } else {
            statusBadge = `<span class="status-badge badge-salah">❌ SALAH</span>`;
        }

        htmlContent += `
            <div class="question-block">
                <!-- Sub-blok 1: Soal -->
                <div class="subblock-question">
                    <div class="q-number">Soal Nomor #${noSoal}</div>
                    <div class="q-text">${teksSoal}</div>
                </div>

                <!-- Sub-blok 2: Kunci & Analisis Jawaban -->
                <div class="subblock-answer">
                    <div>
                        <span style="margin-right: 15px;"><strong>Jawaban Anda:</strong> ${userAns || '-'}</span>
                        <span><strong>Kunci Jawaban:</strong> <strong style="color:#2e7d32;">${kunci}</strong></span>
                    </div>
                    <div>${statusBadge}</div>
                </div>
            </div>
        `;
    });

    blockContainer.innerHTML = htmlContent;
    reviewModal.style.display = "block";
}

/**
 * Fungsi Tutup Modal Review
 */
function tutupHalamanKunci() {
    const modal = document.getElementById("review-modal");
    if (modal) modal.style.display = "none";
}

/**
 * Trigger Window Print / Save as PDF
 */
function cetakKunciPDF() {
    window.print();
}

window.bukaHalamanKunciJawaban = bukaHalamanKunciJawaban;
window.tutupHalamanKunci = tutupHalamanKunci;
window.cetakKunciPDF = cetakKunciPDF;
