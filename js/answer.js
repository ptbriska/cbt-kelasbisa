/* ==========================================================================
   js/answer.js - Review Kunci Jawaban & Print PDF Multi-Type (CBT V2.0.0)
   Sesuai Pedoman Tipe Soal 1A-1C, 2A, 3A-3B, 4A
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

    reviewModal.innerHTML = `
        <div class="watermark-briska">ASET BRISKA</div>
        <div class="review-container">
            
            <div class="review-actions">
                <button class="btn-print" onclick="cetakKunciPDF()">🖨️ Cetak / Simpan PDF</button>
                <button class="btn-close-review" onclick="tutupHalamanKunci()">❌ Tutup Review</button>
            </div>

            <div class="print-kop-header">
                <h2>LEMBAR EVALUASI & KUNCI JAWABAN RESMI</h2>
                <p>SISTEM UJIAN CBT-KIBI | KODE UJIAN: ${App.currentKodeUjian || 'CBT-ONLINE'}</p>
                <p>Dokumen Rahasia - Hak Cipta & Pengawasan Aset BRISKA</p>
            </div>

            <div class="student-summary-card">
                <div><strong>Nama Peserta:</strong> ${identitas["Nama Lengkap"] || identitas.nama || '-'}</div>
                <div><strong>Instansi/Sekolah:</strong> ${identitas["Asal Instansi"] || identitas.sekolah || '-'}</div>
                <div><strong>Kode Ujian:</strong> ${App.currentKodeUjian || '-'}</div>
                <div><strong>Total Skor:</strong> ${App.lastSkorAkhir !== undefined ? App.lastSkorAkhir : 'Selesai'}</div>
            </div>

            <div id="review-blocks-list"></div>

            <div class="print-footer-custom">
                www.briska.co.id - www.kelasbisa.com - www.barugahub.com
            </div>
        </div>
    `;

    const blockContainer = document.getElementById("review-blocks-list");
    let htmlContent = "";

    questions.forEach((q, idx) => {
        const noSoal = q.No || q.no || (idx + 1);
        const teksSoal = q.Soal || q.soal || q.question || "Teks soal tidak tersedia";
        const tipeSoal = String(q.Tipe || "1A").trim().toUpperCase();
        const userAns = userAnswers[noSoal] !== undefined ? userAnswers[noSoal] : userAnswers[idx + 1];
        const rawKunci = q.Kunci !== undefined ? q.Kunci : q.kunci;

        let optionsHTML = "";
        let formattedUserAns = "-";
        let formattedKunci = "-";
        let statusBadge = "";

        // HELPER SINKRONISASI EVALUASI TIPE SOAL
        // ------------------------------------------------------------------
        // TIPE 1A, 1B, 1C (Single Choice)
        if (["1A", "1B", "1C"].includes(tipeSoal)) {
            const kunciStr = String(rawKunci || "").trim().toUpperCase();
            const ansStr = String(userAns || "").trim().toUpperCase();

            formattedKunci = kunciStr || "-";
            formattedUserAns = ansStr || "-";

            if (!ansStr) {
                statusBadge = `<span class="status-badge badge-kosong">⚪ Tidak Dijawab</span>`;
            } else if (ansStr === kunciStr) {
                statusBadge = `<span class="status-badge badge-benar">✔️ BENAR</span>`;
            } else {
                statusBadge = `<span class="status-badge badge-salah">❌ SALAH</span>`;
            }

            // Opsi A-E
            let renderedOptions = "";
            ['A', 'B', 'C', 'D', 'E'].forEach(key => {
                if (q[key] && String(q[key]).trim() !== "" && q[key] !== "-") {
                    let optStyle = "background: #ffffff; border: 1px solid #e0e0e0; color: #333;";
                    let optBadge = "";

                    if (key === kunciStr && key === ansStr) {
                        optStyle = "background: #e8f5e9; border: 1.5px solid #2e7d32; font-weight: bold;";
                        optBadge = ` <span style="color: #2e7d32; font-size: 11px;">(Jawaban Anda & Kunci)</span>`;
                    } else if (key === kunciStr) {
                        optStyle = "background: #e8f5e9; border: 1.5px solid #2e7d32; font-weight: bold;";
                        optBadge = ` <span style="color: #2e7d32; font-size: 11px;">(Kunci Jawaban)</span>`;
                    } else if (key === ansStr) {
                        optStyle = "background: #ffebee; border: 1.5px solid #c62828; font-weight: bold;";
                        optBadge = ` <span style="color: #c62828; font-size: 11px;">(Jawaban Anda)</span>`;
                    }

                    renderedOptions += `
                        <div class="review-option-item" style="padding: 8px 12px; margin-top: 5px; border-radius: 6px; font-size: 13px; ${optStyle}">
                            <strong>${key}.</strong> ${q[key]} ${optBadge}
                        </div>
                    `;
                }
            });
            optionsHTML = `<div class="review-options-list" style="margin-top: 10px;">${renderedOptions}</div>`;
        }

        // ------------------------------------------------------------------
        // TIPE 2A (Multiple Response)
        else if (tipeSoal === "2A") {
            let kunciArr = Array.isArray(rawKunci) ? rawKunci.map(k => String(k).trim().toUpperCase()) : [];
            if (!Array.isArray(rawKunci) && typeof rawKunci === "string") {
                kunciArr = rawKunci.split(",").map(k => k.trim().toUpperCase());
            }

            let ansArr = Array.isArray(userAns) ? userAns.map(a => String(a).trim().toUpperCase()) : [];

            formattedKunci = kunciArr.join(", ") || "-";
            formattedUserAns = ansArr.length > 0 ? ansArr.join(", ") : "-";

            const isMatchExact = kunciArr.length === ansArr.length && kunciArr.every(val => ansArr.includes(val));

            if (ansArr.length === 0) {
                statusBadge = `<span class="status-badge badge-kosong">⚪ Tidak Dijawab</span>`;
            } else if (isMatchExact) {
                statusBadge = `<span class="status-badge badge-benar">✔️ BENAR SEPERTI KUNCI</span>`;
            } else {
                statusBadge = `<span class="status-badge badge-salah">❌ TIDAK SEPENUHNYA TEPAT</span>`;
            }

            let renderedOptions = "";
            ['A', 'B', 'C', 'D', 'E'].forEach(key => {
                if (q[key] && String(q[key]).trim() !== "" && q[key] !== "-") {
                    const isKeyInKunci = kunciArr.includes(key);
                    const isKeyInUser = ansArr.includes(key);

                    let optStyle = "background: #ffffff; border: 1px solid #e0e0e0; color: #333;";
                    let optBadge = "";

                    if (isKeyInKunci && isKeyInUser) {
                        optStyle = "background: #e8f5e9; border: 1.5px solid #2e7d32; font-weight: bold;";
                        optBadge = ` <span style="color: #2e7d32; font-size: 11px;">(Diisi & Kunci)</span>`;
                    } else if (isKeyInKunci) {
                        optStyle = "background: #e8f5e9; border: 1.5px solid #2e7d32; font-weight: bold;";
                        optBadge = ` <span style="color: #2e7d32; font-size: 11px;">(Harusnya Dipilih)</span>`;
                    } else if (isKeyInUser) {
                        optStyle = "background: #ffebee; border: 1.5px solid #c62828; font-weight: bold;";
                        optBadge = ` <span style="color: #c62828; font-size: 11px;">(Pilihan Anda)</span>`;
                    }

                    renderedOptions += `
                        <div class="review-option-item" style="padding: 8px 12px; margin-top: 5px; border-radius: 6px; font-size: 13px; ${optStyle}">
                            <strong>[${isKeyInUser ? '✓' : ' '}] ${key}.</strong> ${q[key]} ${optBadge}
                        </div>
                    `;
                }
            });
            optionsHTML = `<div class="review-options-list" style="margin-top: 10px;">${renderedOptions}</div>`;
        }

        // ------------------------------------------------------------------
        // TIPE 3A & 3B (Short Answer)
        else if (tipeSoal === "3A" || tipeSoal === "3B") {
            const strUser = String(userAns || "").trim();
            const strKunci = String(rawKunci || "").trim();

            formattedKunci = strKunci || "-";
            formattedUserAns = strUser || "-";

            const isCorrect = strUser.toLowerCase() === strKunci.toLowerCase();

            if (!strUser) {
                statusBadge = `<span class="status-badge badge-kosong">⚪ Tidak Dijawab</span>`;
            } else if (isCorrect) {
                statusBadge = `<span class="status-badge badge-benar">✔️ BENAR</span>`;
            } else {
                statusBadge = `<span class="status-badge badge-salah">❌ SALAH</span>`;
            }
        }

        // ------------------------------------------------------------------
        // TIPE 4A (True/False Checklist Table)
        else if (tipeSoal === "4A") {
            let kunciArr = Array.isArray(rawKunci) ? rawKunci : [];
            let ansArr = Array.isArray(userAns) ? userAns : [];

            const statements = ["A", "B", "C", "D", "E"].filter(k => q[k] && String(q[k]).trim() !== "" && q[k] !== "-");

            formattedKunci = kunciArr.join(", ") || "-";
            formattedUserAns = ansArr.map(a => a || "-").join(", ");

            let correctCount = 0;
            let tableRows = "";

            statements.forEach((key, sIdx) => {
                const textStmt = q[key];
                const kVal = (kunciArr[sIdx] || "").toUpperCase();
                const uVal = (ansArr[sIdx] || "").toUpperCase();

                if (kVal === uVal && uVal !== "") correctCount++;

                let rowBg = "#ffffff";
                if (uVal === kVal && uVal !== "") rowBg = "#e8f5e9";
                else if (uVal !== "" && uVal !== kVal) rowBg = "#ffebee";

                tableRows += `
                    <tr style="background: ${rowBg};">
                        <td style="padding: 8px; border: 1px solid #dee2e6;">${sIdx + 1}. ${textStmt}</td>
                        <td style="padding: 8px; text-align: center; border: 1px solid #dee2e6; font-weight: bold; color: ${uVal === 'B' ? '#155724' : '#6c757d'};">${uVal === 'B' ? '✓ Benar' : (uVal === 'S' ? '-' : '-')}</td>
                        <td style="padding: 8px; text-align: center; border: 1px solid #dee2e6; font-weight: bold; color: ${uVal === 'S' ? '#721c24' : '#6c757d'};">${uVal === 'S' ? '✓ Salah' : (uVal === 'B' ? '-' : '-')}</td>
                        <td style="padding: 8px; text-align: center; border: 1px solid #dee2e6; font-weight: bold; color: #2e7d32;">${kVal}</td>
                    </tr>
                `;
            });

            optionsHTML = `
                <table style="width:100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Pernyataan</th>
                            <th style="padding: 8px; border: 1px solid #dee2e6; width: 90px;">Jawaban Anda (B)</th>
                            <th style="padding: 8px; border: 1px solid #dee2e6; width: 90px;">Jawaban Anda (S)</th>
                            <th style="padding: 8px; border: 1px solid #dee2e6; width: 80px;">Kunci</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            `;

            if (ansArr.length === 0 || ansArr.every(a => !a)) {
                statusBadge = `<span class="status-badge badge-kosong">⚪ Tidak Dijawab</span>`;
            } else if (correctCount === statements.length) {
                statusBadge = `<span class="status-badge badge-benar">✔️ BENAR SEMUA (${correctCount}/${statements.length})</span>`;
            } else {
                statusBadge = `<span class="status-badge badge-salah">⚠️ BENAR ${correctCount}/${statements.length} BARIS</span>`;
            }
        }

        // RENDER DOKUMEN REVIEW PER SOAL
        htmlContent += `
            <div class="question-block" style="margin-bottom: 20px; border: 1px solid #e0e0e0; padding: 15px; border-radius: 8px; background: #fff;">
                <div class="subblock-question">
                    <div class="q-number" style="font-weight: bold; color: #1976d2; margin-bottom: 5px;">Soal Nomor #${noSoal} <span style="font-size:12px; color:#666;">[Tipe: ${tipeSoal}]</span></div>
                    <div class="q-text">${teksSoal}</div>
                    ${optionsHTML}
                </div>

                <div class="subblock-answer" style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #ccc; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="margin-right: 15px;"><strong>Jawaban Anda:</strong> ${formattedUserAns}</span>
                        <span><strong>Kunci Jawaban:</strong> <strong style="color:#2e7d32;">${formattedKunci}</strong></span>
                    </div>
                    <div>${statusBadge}</div>
                </div>
            </div>
        `;
    });

    blockContainer.innerHTML = htmlContent;
    reviewModal.style.display = "block";

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

function tutupHalamanKunci() {
    const modal = document.getElementById("review-modal");
    if (modal) modal.style.display = "none";
}

function cetakKunciPDF() {
    window.print();
}

window.bukaHalamanKunciJawaban = bukaHalamanKunciJawaban;
window.tutupHalamanKunci = tutupHalamanKunci;
window.cetakKunciPDF = cetakKunciPDF;
