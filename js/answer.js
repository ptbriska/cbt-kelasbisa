/* ==========================================================
   CBT KIBI V1.6.3 - Answer & Teaser Preview Logic (FIXED)
   ========================================================== */

// Helper untuk memformat tampilan Kunci Jawaban berdasarkan tipe soal
function formatKunciJawabanPreview(soalItem) {
    const tipe = String(soalItem.Tipe || soalItem.TipeSoal || "").trim().toUpperCase();
    const kunci = soalItem.Kunci;

    // Tipe 2A (Multiple Response) & Tipe 4A (Checklist Array)
    if (Array.isArray(kunci)) {
        return kunci.join(", ");
    }
    
    // Tipe 5A (Weighted Options Object)
    if (typeof kunci === "object" && kunci !== null) {
        return Object.entries(kunci)
            .map(([opsi, poin]) => `${opsi}=${poin}`)
            .join(" | ");
    }
    
    // Tipe 1A, 1B, 1C, 3A, 3B (String)
    return String(kunci || "-");
}

// Helper untuk memformat tampilan Jawaban Peserta
function formatJawabanPesertaPreview(soalItem, userAns) {
    if (userAns === undefined || userAns === null || userAns === "" || userAns === "-") {
        return "<span style='color: #dc2626; font-weight: bold;'>Tidak Dijawab</span>";
    }

    if (Array.isArray(userAns)) {
        return userAns.join(", ");
    }

    if (typeof userAns === "object") {
        return Object.entries(userAns)
            .map(([key, val]) => `${key}: ${val}`)
            .join(" | ");
    }

    return String(userAns);
}

// Fungsi utama render halaman Preview Kunci Jawaban (Teaser 3 Soal)
function initHalamanPembahasanPreview() {
    let container = document.getElementById("pembahasan-container");
    const pageCbt = document.getElementById("page-cbt");
    
    // Switch tampilan container secara otomatis
    if (!container && pageCbt) {
        container = pageCbt;
    } else if (container) {
        container.style.display = "block";
        if (pageCbt) pageCbt.style.display = "none";
    } else {
        console.error("❌ Element container pembahasan tidak ditemukan!");
        return;
    }

    // 1. Ambil Data Global dari App secara fleksibel
    const dataJSON = App.soalData || {};
    const questions = App.questionsData || App.questions || dataJSON.questions || [];
    const totalSoal = questions.length;
    
    // Mengambil metadata Kop Surat
    const lembaga = dataJSON.lembaga || "KIBI EDUCATION CENTER";
    const namaSistem = dataJSON.nama_sistem_cbt || "CBT SYSTEM";
    const alamat = dataJSON.alamat_lembaga || "";
    const logoUrl = dataJSON.logo || "";

    // Potong HANYA 3 Soal Pertama untuk Teaser
    const previewQuestions = questions.slice(0, 3);

    // 2. Susun HTML Kop Surat & Header
    let html = `
        <div class="preview-container" style="padding: 20px; max-width: 900px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <div class="kop-surat" style="text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; margin-bottom: 20px;">
                ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="kop-logo" style="max-height: 60px;" onerror="this.style.display='none'">` : ''}
                <div class="kop-info">
                    <h2 style="margin: 5px 0; color: #1e293b; font-size: 22px;">${lembaga}</h2>
                    <h4 style="margin: 5px 0; color: #475569; font-size: 16px;">${namaSistem} - ${dataJSON.nama_kegiatan || 'SIMULASI UJIAN'}</h4>
                    <p style="margin: 0; color: #64748b; font-size: 13px;">${alamat}</p>
                </div>
            </div>

            <div class="preview-action-bar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: #f1f5f9; padding: 12px 16px; border-radius: 8px;">
                <span class="badge-preview" style="font-weight: 600; color: #334155;">🔒 Preview 3 Soal Pertama (Total: ${totalSoal} Soal)</span>
                <button onclick="window.print()" class="btn-print-preview" style="padding: 8px 16px; background: #475569; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    🖨️ Cetak PDF Preview
                </button>
            </div>
            
            <div class="preview-soal-list">
    `;

    // 3. Render 3 Soal Pembahasan Pertama
    previewQuestions.forEach((item, index) => {
        const noSoal = item.No || (index + 1);
        const userAns = App.userAnswers ? App.userAnswers[noSoal] : null;
        
        const textKunci = formatKunciJawabanPreview(item);
        const textJawabanUser = formatJawabanPesertaPreview(item, userAns);

        html += `
            <div class="card-preview-soal" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="margin-bottom: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
                    <span class="badge-meta" style="background: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;">Soal No. ${noSoal}</span>
                    <span class="badge-meta" style="background: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 4px; font-size: 12px;">Tipe: ${item.Tipe || item.TipeSoal || '-'}</span>
                    ${item.Subtest ? `<span class="badge-meta" style="background: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 4px; font-size: 12px;">Subtest: ${item.Subtest}</span>` : ''}
                    ${item.Section ? `<span class="badge-meta" style="background: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 4px; font-size: 12px;">Section: ${item.Section}</span>` : ''}
                </div>
                
                <div class="soal-text" style="font-size: 15px; color: #0f172a; margin-bottom: 12px; line-height: 1.6;">${item.Soal}</div>
                
                <div class="box-jawaban" style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; font-size: 14px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
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

    // 4. Tempel Banner Paywall Token di bawah Soal Ke-3
    const sisaSoal = Math.max(0, totalSoal - 3);
    html += `
        <div class="paywall-banner" style="background: #fefce8; border: 1px solid #fef08a; padding: 20px; border-radius: 10px; text-align: center; margin-top: 25px;">
            <h3 style="margin: 0 0 8px 0; color: #854d0e; font-size: 18px;">🔒 Mau Akses Seluruh Pembahasan &amp; Full Student Report?</h3>
            <p style="margin: 0 0 15px 0; color: #a16207; font-size: 14px;">Sisa <strong>${sisaSoal} soal</strong> beserta Analisis Akurasi Subtest, Section, dan Timelog masih terkunci. Masukkan Token Pembahasan untuk membuka laporan lengkap.</p>
            
            <div class="form-token-group" style="display: flex; justify-content: center; gap: 8px; margin-bottom: 15px;">
                <input type="text" id="input-token-preview" class="input-token" placeholder="Ketik Token..." autocomplete="off" style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; width: 200px; text-transform: uppercase;">
                <button onclick="verifikasiTokenPreview()" class="btn-unlock" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Buka Akses</button>
            </div>
            
            <a href="https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20mau%20beli%20Token%20Pembahasan%20untuk%20ujian%20${encodeURIComponent(dataJSON.kode_ujian || '')}" 
               target="_blank" class="link-wa-admin" style="color: #16a34a; font-weight: 600; text-decoration: none; font-size: 14px; display: inline-block;">
                💬 Belum punya token? Hubungi Admin via WhatsApp
            </a>
        </div>
    </div>`;

    container.innerHTML = html;
}

// 5. Fungsi Eksekusi Verifikasi Token (Diperbarui untuk localStorage & New Window)
function verifikasiTokenPreview() {
    const inputEl = document.getElementById("input-token-preview");
    if (!inputEl) return;

    const typedToken = inputEl.value.trim().toUpperCase();
    const targetToken = String(App.soalData?.token_pembahasan || "").trim().toUpperCase();

    if (!typedToken) {
        alert("⚠️ Silakan masukkan token pembahasan terlebih dahulu.");
        return;
    }

    if (typedToken === targetToken) {
        alert("🎉 Token Valid! Membuka Full Student Report...");
        
        // Simpan status unlock ke state global App
        App.isPembahasanUnlocked = true;

        // Persiapkan data lengkap untuk disimpan ke localStorage
        const reportDataPayload = {
            soalData: App.soalData || {},
            userAnswers: App.userAnswers || {},
            questionTimeLogs: App.questionTimeLogs || App.timeLogs || {},
            userName: App.userName || "Peserta Ujian"
        };

        // Simpan data ke localStorage agar dibaca oleh pembahasan.html
        try {
            localStorage.setItem("cbt_report_data", JSON.stringify(reportDataPayload));
        } catch (err) {
            console.error("Gagal menyimpan data ke localStorage:", err);
        }

        // Buka pembahasan.html pada tab/window baru
        window.open("pembahasan.html", "_blank");

    } else {
        alert("❌ Token Salah! Silakan periksa kembali token yang Anda masukkan atau hubungi admin.");
        inputEl.focus();
    }
}

// Window Global Function Attachment
window.formatKunciJawabanPreview = formatKunciJawabanPreview;
window.formatJawabanPesertaPreview = formatJawabanPesertaPreview;
window.initHalamanPembahasanPreview = initHalamanPembahasanPreview;
window.verifikasiTokenPreview = verifikasiTokenPreview;
