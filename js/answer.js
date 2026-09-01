/* ==========================================================
   CBT KIBI V1.6.5 - Answer & Teaser Preview Logic (FULLY SYNCED)
   Integrasi UI V1.5 + Logika Teaser & Paywall V1.6
   ========================================================== */

window.App = window.App || {};

// Helper untuk memformat teks Kunci Jawaban
function formatKunciJawabanPreview(soalItem) {
    const tipe = String(soalItem.Tipe || soalItem.TipeSoal || "").trim().toUpperCase();
    const kunci = soalItem.Kunci;

    if (Array.isArray(kunci)) {
        return kunci.join(", ");
    }
    
    if (typeof kunci === "object" && kunci !== null) {
        return Object.entries(kunci)
            .map(([opsi, poin]) => `${opsi} (${poin} Poin)`)
            .join(" | ");
    }
    
    return String(kunci || "-");
}

// Helper untuk memformat teks Jawaban Peserta
function formatJawabanPesertaPreview(soalItem, userAns) {
    if (userAns === undefined || userAns === null || userAns === "" || userAns === "-") {
        return "<span style='color: #dc2626; font-weight: bold;'>Tidak Dijawab</span>";
    }

    if (Array.isArray(userAns)) {
        return userAns.join(", ");
    }

    if (typeof userAns === "object" && userAns !== null) {
        return Object.entries(userAns)
            .map(([key, val]) => `${key}: ${val}`)
            .join(" | ");
    }

    return String(userAns);
}

// Helper khusus untuk merender detail opsi pilihan (A, B, C, D, E) & Tabel 4A
function renderDetailOpsiSoal(q, userAns) {
    const tipeSoal = String(q.Tipe || q.TipeSoal || "1A").trim().toUpperCase();
    const rawKunci = q.Kunci;
    let optionsHTML = "";

    // ------------------------------------------------------------------
    // TIPE 1A, 1B, 1C (Single Choice)
    // ------------------------------------------------------------------
    if (["1A", "1B", "1C"].includes(tipeSoal)) {
        const kunciStr = String(rawKunci || "").trim().toUpperCase();
        const ansStr = String(userAns || "").trim().toUpperCase();

        let renderedOptions = "";
        ['A', 'B', 'C', 'D', 'E'].forEach(key => {
            if (q[key] && String(q[key]).trim() !== "" && q[key] !== "-") {
                let optStyle = "background: #ffffff; border: 1px solid #e2e8f0; color: #334155;";
                let optBadge = "";

                if (key === kunciStr && key === ansStr) {
                    optStyle = "background: #dcfce7; border: 1.5px solid #16a34a; font-weight: 600; color: #14532d;";
                    optBadge = ` <span style="color: #16a34a; font-size: 11px; font-weight: bold;">(Jawaban Anda & Kunci) ✓</span>`;
                } else if (key === kunciStr) {
                    optStyle = "background: #dcfce7; border: 1.5px solid #16a34a; font-weight: 600; color: #14532d;";
                    optBadge = ` <span style="color: #16a34a; font-size: 11px; font-weight: bold;">(Kunci Jawaban) ✓</span>`;
                } else if (key === ansStr) {
                    optStyle = "background: #fee2e2; border: 1.5px solid #dc2626; font-weight: 600; color: #7f1d1d;";
                    optBadge = ` <span style="color: #dc2626; font-size: 11px; font-weight: bold;">(Jawaban Anda) ❌</span>`;
                }

                renderedOptions += `
                    <div class="review-option-item" style="padding: 9px 12px; margin-top: 6px; border-radius: 6px; font-size: 13.5px; ${optStyle}">
                        <strong>${key}.</strong> ${q[key]} ${optBadge}
                    </div>
                `;
            }
        });
        optionsHTML = `<div class="review-options-list" style="margin-top: 10px;">${renderedOptions}</div>`;
    }

    // ------------------------------------------------------------------
    // TIPE 2A (Multiple Response)
    // ------------------------------------------------------------------
    else if (tipeSoal === "2A") {
        let kunciArr = Array.isArray(rawKunci) ? rawKunci.map(k => String(k).trim().toUpperCase()) : [];
        if (!Array.isArray(rawKunci) && typeof rawKunci === "string") {
            kunciArr = rawKunci.split(",").map(k => k.trim().toUpperCase());
        }

        let ansArr = Array.isArray(userAns) ? userAns.map(a => String(a).trim().toUpperCase()) : [];

        let renderedOptions = "";
        ['A', 'B', 'C', 'D', 'E'].forEach(key => {
            if (q[key] && String(q[key]).trim() !== "" && q[key] !== "-") {
                const isKeyInKunci = kunciArr.includes(key);
                const isKeyInUser = ansArr.includes(key);

                let optStyle = "background: #ffffff; border: 1px solid #e2e8f0; color: #334155;";
                let optBadge = "";

                if (isKeyInKunci && isKeyInUser) {
                    optStyle = "background: #dcfce7; border: 1.5px solid #16a34a; font-weight: 600; color: #14532d;";
                    optBadge = ` <span style="color: #16a34a; font-size: 11px; font-weight: bold;">(Diisi & Kunci) ✓</span>`;
                } else if (isKeyInKunci) {
                    optStyle = "background: #dcfce7; border: 1.5px solid #16a34a; font-weight: 600; color: #14532d;";
                    optBadge = ` <span style="color: #16a34a; font-size: 11px; font-weight: bold;">(Harusnya Dipilih)</span>`;
                } else if (isKeyInUser) {
                    optStyle = "background: #fee2e2; border: 1.5px solid #dc2626; font-weight: 600; color: #7f1d1d;";
                    optBadge = ` <span style="color: #dc2626; font-size: 11px; font-weight: bold;">(Pilihan Anda) ❌</span>`;
                }

                renderedOptions += `
                    <div class="review-option-item" style="padding: 9px 12px; margin-top: 6px; border-radius: 6px; font-size: 13.5px; ${optStyle}">
                        <strong>[${isKeyInUser ? '✓' : ' '}] ${key}.</strong> ${q[key]} ${optBadge}
                    </div>
                `;
            }
        });
        optionsHTML = `<div class="review-options-list" style="margin-top: 10px;">${renderedOptions}</div>`;
    }

    // ------------------------------------------------------------------
    // TIPE 4A (True/False Checklist Table)
    // ------------------------------------------------------------------
    else if (tipeSoal === "4A") {
        let kunciArr = Array.isArray(rawKunci) ? rawKunci : [];
        let ansArr = Array.isArray(userAns) ? userAns : [];

        const statements = ["A", "B", "C", "D", "E"].filter(k => q[k] && String(q[k]).trim() !== "" && q[k] !== "-");
        let tableRows = "";

        statements.forEach((key, sIdx) => {
            const textStmt = q[key];
            const kVal = String(kunciArr[sIdx] || "").toUpperCase();
            const uVal = String(ansArr[sIdx] || "").toUpperCase();

            let rowBg = "#ffffff";
            if (uVal === kVal && uVal !== "") rowBg = "#f0fdf4";
            else if (uVal !== "" && uVal !== kVal) rowBg = "#fef2f2";

            tableRows += `
                <tr style="background: ${rowBg};">
                    <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left; font-size: 13px;">${sIdx + 1}. ${textStmt}</td>
                    <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: bold; color: ${uVal === 'B' ? '#16a34a' : '#94a3b8'};">${uVal === 'B' ? '✓ Benar' : '-'}</td>
                    <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: bold; color: ${uVal === 'S' ? '#dc2626' : '#94a3b8'};">${uVal === 'S' ? '✓ Salah' : '-'}</td>
                    <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: bold; color: #16a34a;">${kVal}</td>
                </tr>
            `;
        });

        optionsHTML = `
            <div style="overflow-x: auto; margin-top: 10px;">
                <table style="width:100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background: #f1f5f9; color: #334155;">
                            <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left;">Pernyataan</th>
                            <th style="padding: 8px; border: 1px solid #cbd5e1; width: 110px;">Jawaban Anda (B)</th>
                            <th style="padding: 8px; border: 1px solid #cbd5e1; width: 110px;">Jawaban Anda (S)</th>
                            <th style="padding: 8px; border: 1px solid #cbd5e1; width: 80px;">Kunci</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        `;
    }

    // ------------------------------------------------------------------
    // TIPE 5A (Weighted Options / Likert)
    // ------------------------------------------------------------------
    else if (tipeSoal === "5A") {
        const kunciObj = (typeof rawKunci === "object" && rawKunci !== null) ? rawKunci : {};
        const ansStr = String(userAns || "").trim().toUpperCase();

        let renderedOptions = "";
        ['A', 'B', 'C', 'D', 'E'].forEach(key => {
            if (q[key] && String(q[key]).trim() !== "" && q[key] !== "-") {
                const poin = kunciObj[key] !== undefined ? kunciObj[key] : 0;
                let optStyle = "background: #ffffff; border: 1px solid #e2e8f0; color: #334155;";
                let optBadge = "";

                if (key === ansStr) {
                    optStyle = "background: #eff6ff; border: 1.5px solid #2563eb; font-weight: 600; color: #1e40af;";
                    optBadge = ` <span style="color: #2563eb; font-size: 11px; font-weight: bold;">(Pilihan Anda - Poin: ${poin})</span>`;
                } else {
                    optBadge = ` <span style="color: #64748b; font-size: 11px;">(Poin: ${poin})</span>`;
                }

                renderedOptions += `
                    <div class="review-option-item" style="padding: 9px 12px; margin-top: 6px; border-radius: 6px; font-size: 13.5px; ${optStyle}">
                        <strong>${key}.</strong> ${q[key]} ${optBadge}
                    </div>
                `;
            }
        });
        optionsHTML = `<div class="review-options-list" style="margin-top: 10px;">${renderedOptions}</div>`;
    }

    return optionsHTML;
}

// Fungsi Utama Render Halaman Preview Kunci Jawaban (Teaser 3 Soal)
function initHalamanPembahasanPreview() {
    let container = document.getElementById("pembahasan-container");
    const pageScoring = document.getElementById("page-scoring");
    const pageCbt = document.getElementById("page-cbt");
    
    // Sembunyikan container ujian utama jika sedang aktif
    if (pageCbt) {
        pageCbt.classList.add("hidden");
        pageCbt.style.display = "none";
    }

    if (!container && pageScoring) {
        container = pageScoring;
        container.classList.remove("hidden");
        container.style.display = "block";
    } else if (container) {
        container.classList.remove("hidden");
        container.style.display = "block";
        if (pageScoring) {
            pageScoring.classList.add("hidden");
            pageScoring.style.display = "none";
        }
    } else if (pageCbt) {
        container = pageCbt;
        container.classList.remove("hidden");
        container.style.display = "block";
    } else {
        console.error("❌ Element container pembahasan tidak ditemukan!");
        return;
    }

    // 1. Integrasi Data Global App
    const dataJSON = App.soalData || {};
    const questions = App.questionsData || App.questions || dataJSON.questions || [];
    const totalSoal = questions.length;
    const identitas = App.verifiedPesertaData || App.userIdentitas || {};
    
    // Metadata Kop & Instansi
    const lembaga = dataJSON.lembaga || "KIBI EDUCATION CENTER";
    const namaSistem = dataJSON.nama_sistem_cbt || "CBT SYSTEM";
    const alamat = dataJSON.alamat_lembaga || "";
    const logoUrl = dataJSON.logo || "";

    // Potong HANYA 3 Soal Pertama untuk Teaser Preview
    const previewQuestions = questions.slice(0, 3);

    // 2. Susun HTML Kop Surat, Watermark & Kartu Identitas Peserta
    let html = `
        <div class="preview-container" style="position: relative; overflow: hidden; padding: 20px; max-width: 900px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            
            <!-- Watermark Diagonal Hak Cipta -->
            <div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 75px; font-weight: 900; color: rgba(0, 0, 0, 0.035); pointer-events: none; z-index: 0; white-space: nowrap; user-select: none;">
                ASET BRISKA
            </div>

            <div style="position: relative; z-index: 1;">
                <div class="kop-surat" style="text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; margin-bottom: 20px;">
                    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="kop-logo" style="max-height: 60px;" onerror="this.style.display='none'">` : ''}
                    <div class="kop-info">
                        <h2 style="margin: 5px 0; color: #1e293b; font-size: 22px;">${lembaga}</h2>
                        <h4 style="margin: 5px 0; color: #475569; font-size: 16px;">${namaSistem} - ${dataJSON.nama_kegiatan || 'SIMULASI UJIAN'}</h4>
                        <p style="margin: 0; color: #64748b; font-size: 13px;">${alamat}</p>
                    </div>
                </div>

                <!-- Kartu Identitas Peserta -->
                <div class="student-summary-card" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13.5px; color: #334155;">
                    <div><strong>Nama Peserta:</strong> ${identitas["Nama Lengkap"] || identitas.nama || App.userName || 'Peserta Ujian'}</div>
                    <div><strong>Instansi/Sekolah:</strong> ${identitas["Asal Instansi"] || identitas.sekolah || '-'}</div>
                    <div><strong>Kode Ujian:</strong> ${dataJSON.kode_ujian || App.currentKodeUjian || '-'}</div>
                    <div><strong>Total Skor:</strong> ${App.lastSkorAkhir !== undefined ? App.lastSkorAkhir : 'Selesai'}</div>
                </div>

                <div class="preview-action-bar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: #f1f5f9; padding: 12px 16px; border-radius: 8px;">
                    <span class="badge-preview" style="font-weight: 600; color: #334155;">🔒 Preview 3 Soal Pertama (Total: ${totalSoal} Soal)</span>
                    <button onclick="window.print()" class="btn-print-preview" style="padding: 8px 16px; background: #475569; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
                        🖨️ Cetak PDF Preview
                    </button>
                </div>
                
                <div class="preview-soal-list">
    `;

    // 3. Render 3 Soal Pembahasan Pertama Beserta Render Opsi Pilihan A-E
    previewQuestions.forEach((item, index) => {
        const noSoal = item.No || (index + 1);
        const userAns = App.userAnswers ? App.userAnswers[noSoal] : null;
        
        const textKunci = formatKunciJawabanPreview(item);
        const textJawabanUser = formatJawabanPesertaPreview(item, userAns);
        const detailOpsiHTML = renderDetailOpsiSoal(item, userAns);

        html += `
            <div class="card-preview-soal" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="margin-bottom: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
                    <span class="badge-meta" style="background: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;">Soal No. ${noSoal}</span>
                    <span class="badge-meta" style="background: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 4px; font-size: 12px;">Tipe: ${item.Tipe || item.TipeSoal || '-'}</span>
                    ${item.Subtest ? `<span class="badge-meta" style="background: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 4px; font-size: 12px;">Subtest: ${item.Subtest}</span>` : ''}
                    ${item.Section ? `<span class="badge-meta" style="background: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 4px; font-size: 12px;">Section: ${item.Section}</span>` : ''}
                </div>
                
                <div class="soal-text" style="font-size: 15px; color: #0f172a; margin-bottom: 12px; line-height: 1.6;">${item.Soal}</div>
                
                ${item.Gambar ? `<div style="margin-bottom: 12px;"><img src="${item.Gambar}" alt="Gambar Soal" style="max-width: 100%; height: auto; border-radius: 6px; border: 1px solid #cbd5e1;"></div>` : ''}

                <!-- Render Pilihan Opsi A, B, C, D, E / Tabel Checklist -->
                ${detailOpsiHTML}
                
                <div class="box-jawaban" style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; font-size: 14px; margin-top: 12px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
                    <div style="margin-bottom: 6px;"><strong>Jawaban Anda:</strong> ${textJawabanUser}</div>
                    <div><strong>Kunci Jawaban:</strong> <span style="color: #16a34a; font-weight: bold;">${textKunci}</span></div>
                </div>

                <div class="box-pembahasan-text" style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 14px; border-radius: 0 6px 6px 0; font-size: 14px; color: #1e3a8a; line-height: 1.5;">
                    <strong style="color: #1d4ed8;">💡 Pembahasan:</strong><br>
                    <div style="margin-top: 4px;">${item.Pembahasan || "Belum ada pembahasan tertulis."}</div>
                </div>
            </div>
        `;
    });

    html += `</div>`; // Close preview-soal-list

    // 4. Paywall Banner Token & Link WA Admin Resmi 085711000363
    const sisaSoal = Math.max(0, totalSoal - 3);
    const waKodeUjian = encodeURIComponent(dataJSON.kode_ujian || App.currentKodeUjian || 'Ujian CBT');
    
    html += `
                <div class="paywall-banner" style="background: #fefce8; border: 1px solid #fef08a; padding: 20px; border-radius: 10px; text-align: center; margin-top: 25px;">
                    <h3 style="margin: 0 0 8px 0; color: #854d0e; font-size: 18px;">🔒 Mau Akses Seluruh Pembahasan &amp; Full Student Report?</h3>
                    <p style="margin: 0 0 15px 0; color: #a16207; font-size: 14px;">Sisa <strong>${sisaSoal} soal</strong> beserta Analisis Akurasi Subtest, Section, dan Timelog masih terkunci. Masukkan Token Pembahasan untuk membuka laporan lengkap.</p>
                    
                    <div class="form-token-group" style="display: flex; justify-content: center; gap: 8px; margin-bottom: 15px;">
                        <input type="text" id="input-token-preview" class="input-token" placeholder="Ketik Token..." autocomplete="off" style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; width: 200px; text-transform: uppercase;">
                        <button onclick="verifikasiTokenPreview()" class="btn-unlock" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Buka Akses</button>
                    </div>
                    
                    <a href="https://wa.me/6285711000363?text=Halo%20Admin,%20saya%20mau%20beli%20Token%20Pembahasan%20untuk%20kode%20ujian%20${waKodeUjian}" 
                       target="_blank" class="link-wa-admin" style="color: #16a34a; font-weight: 600; text-decoration: none; font-size: 14px; display: inline-block;">
                        💬 Belum punya token? Hubungi Admin via WhatsApp
                    </a>
                </div>
            </div>
        </div>`;

    container.innerHTML = html;

    // Trigger MathJax Rendering jika ada simbol/rumus matematika
    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise().catch(err => console.warn("MathJax error:", err));
    }
}

// 5. Eksekusi Verifikasi Token Pembahasan
function verifikasiTokenPreview() {
    const inputEl = document.getElementById("input-token-preview");
    if (!inputEl) return;

    const typedToken = inputEl.value.trim().toUpperCase();
    const rawTarget = App.soalData?.token_pembahasan || App.tokenPembahasan || "";
    let isTokenValid = false;

    if (Array.isArray(rawTarget)) {
        isTokenValid = rawTarget.map(t => String(t).trim().toUpperCase()).includes(typedToken);
    } else {
        const targetToken = String(rawTarget).trim().toUpperCase();
        isTokenValid = typedToken === targetToken && targetToken !== "";
    }

    if (!typedToken) {
        alert("⚠️ Silakan masukkan token pembahasan terlebih dahulu.");
        return;
    }

    if (isTokenValid) {
        alert("🎉 Token Valid! Membuka Full Student Report...");
        
        App.isPembahasanUnlocked = true;

        const reportDataPayload = {
            soalData: App.soalData || {},
            userAnswers: App.userAnswers || {},
            questionTimeLogs: App.questionTimeLogs || App.timeLogs || {},
            userName: App.userName || App.verifiedPesertaData?.["Nama Lengkap"] || App.verifiedPesertaData?.nama || "Peserta Ujian"
        };

        try {
            localStorage.setItem("cbt_report_data", JSON.stringify(reportDataPayload));
        } catch (err) {
            console.error("Gagal menyimpan data ke localStorage:", err);
        }

        window.open("pembahasan.html", "_blank");

    } else {
        alert("❌ Token Salah! Silakan periksa kembali token yang Anda masukkan atau hubungi admin.");
        inputEl.focus();
    }
}

// Window Global Exports & Aliases
window.formatKunciJawabanPreview = formatKunciJawabanPreview;
window.formatJawabanPesertaPreview = formatJawabanPesertaPreview;
window.renderDetailOpsiSoal = renderDetailOpsiSoal;
window.initHalamanPembahasanPreview = initHalamanPembahasanPreview;
window.bukaHalamanReviewJawaban = initHalamanPembahasanPreview;
window.bukaHalamanKunciJawaban = initHalamanPembahasanPreview;
window.verifikasiTokenPreview = verifikasiTokenPreview;
