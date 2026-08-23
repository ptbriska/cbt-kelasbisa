/* ==========================================================================
   answer.js - Review Kunci Jawaban & Print PDF (CBT-KIBI v1.4.1 Fix)
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

    // Render Container HTML & Footer Cetak Kustom
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

            <!-- Footer Cetak Kustom (Print Only) -->
            <div class="print-footer-custom">
                www.briska.co.id - www.kelasbisa.com - www.barugahub.com
            </div>
        </div>
    `;

    const blockContainer = document.getElementById("review-blocks-list");
    let htmlContent = "";

    // Loop Menyusun Blok Soal, Opsi Jawaban, & Sub-Blok Kunci
    questions.forEach((q, idx) => {
        const noSoal = q.No || q.no || (idx + 1);
        const teksSoal = q.Soal || q.soal || q.question || "Teks soal tidak tersedia";
        const kunci = String(q.Kunci || q.kunci || q.key || "-").trim().toUpperCase();
        const userAns = String(userAnswers[noSoal] || userAnswers[idx + 1] || "").trim().toUpperCase();

        // -------------------------------------------------------------
        // SMART OPTION EXTRACTOR (Mendukung Segala Format Key JSON Opsi)
        // -------------------------------------------------------------
        const optionKeys = ['A', 'B', 'C', 'D', 'E'];
        let optionsHTML = "";

        // Ekstraksi opsi jika berupa Array (misal: q.options atau q.Opsi)
        let arrayOptions = q.options || q.Opsi || q.opsi || null;

        let hasOptions = false;
        let renderedOptions = "";

        optionKeys.forEach((key, oIdx) => {
            let optText = "";

            if (Array.isArray(arrayOptions) && arrayOptions[oIdx]) {
                optText = arrayOptions[oIdx];
            } else {
                // Cek variasi nama properti object JSON
                optText = q[key] || q[key.toLowerCase()] || 
                          q[`Option_${key}`] || q[`option_${key}`] || 
                          q[`Opsi_${key}`] || q[`opsi_${key}`] || 
                          q[`Pilihan_${key}`] || q[`pilihan_${key}`] ||
                          q[`Pilihan${key}`] || q[`pilihan${key}`] || "";
            }

            if (optText) {
                hasOptions = true;
                let optStyle = "background: #ffffff; border: 1px solid #e0e0e0; color: #333;";
                let optBadge = "";

                // Highlight visual untuk Opsi Jawaban
                if (key === kunci && key === userAns) {
                    optStyle = "background: #e8f5e9; border: 1.5px solid #2e7d32; font-weight: bold;";
                    optBadge = ` <span style="color: #2e7d32; font-size: 11px;">(Jawaban Anda & Kunci)</span>`;
                } else if (key === kunci) {
                    optStyle = "background: #e8f5e9; border: 1.5px solid #2e7d32; font-weight: bold;";
                    optBadge = ` <span style="color: #2e7d32; font-size: 11px;">(Kunci Jawaban)</span>`;
                } else if (key === userAns) {
                    optStyle = "background: #ffebee; border: 1.5px solid #c62828; font-weight: bold;";
                    optBadge = ` <span style="color: #c62828; font-size: 11px;">(Jawaban Anda)</span>`;
                }

                renderedOptions += `
                    <div class="review-option-item" style="padding: 8px 12px; margin-top: 5px; border-radius: 6px; font-size: 13px; ${optStyle}">
                        <strong>${key}.</strong> ${optText} ${optBadge}
                    </div>
                `;
            }
        });

        if (hasOptions) {
            optionsHTML = `<div class="review-options-list" style="margin-top: 10px;">${renderedOptions}</div>`;
        }

        // Status Badge
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
                <!-- Sub-blok 1: Soal & Opsi Jawaban -->
                <div class="subblock-question">
                    <div class="q-number">Soal Nomor #${noSoal}</div>
                    <div class="q-text">${teksSoal}</div>
                    ${optionsHTML}
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

    // -------------------------------------------------------------
    // RENDER FORMULA MATHJAX / LATEX
    // -------------------------------------------------------------
    setTimeout(() => {
        if (window.MathJax) {
            if (typeof window.MathJax.typesetPromise === "function") {
                window.MathJax.typesetPromise([reviewModal]).catch(err => console.log("MathJax error:", err));
            } else if (typeof window.MathJax.typeset === "function") {
                window.MathJax.typeset([reviewModal]);
            }
        }
    }, 100);
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
