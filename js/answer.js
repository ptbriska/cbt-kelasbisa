/* ==========================================================
   CBT KIBI V1.6 - Answer & Teaser Preview Logic
   ========================================================== */

// Helper untuk memformat tampilan Kunci Jawaban berdasarkan tipe soal
function formatKunciJawabanPreview(soalItem) {
    const tipe = soalItem.Tipe;
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
    if (!userAns || userAns === "" || userAns === "-") {
        return "<span style='color: #dc3545; font-weight: bold;'>Tidak Dijawab</span>";
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
    const container = document.getElementById("pembahasan-container");
    if (!container) return;

    // 1. Ambil Data Global dari App
    const dataJSON = App.soalData || {};
    const questions = dataJSON.questions || [];
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
        <div class="preview-container">
            <div class="kop-surat">
                ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="kop-logo" onerror="this.style.display='none'">` : ''}
                <div class="kop-info">
                    <h2>${lembaga}</h2>
                    <h4>${namaSistem} - ${dataJSON.nama_kegiatan || 'SIMULASI UJIAN'}</h4>
                    <p>${alamat}</p>
                </div>
            </div>

            <div class="preview-action-bar">
                <span class="badge-preview">🔒 Preview 3 Soal Pertama (Total: ${totalSoal} Soal)</span>
                <button onclick="window.print()" class="btn-print-preview">
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
            <div class="card-preview-soal">
                <div style="margin-bottom: 8px;">
                    <span class="badge-meta">Soal No. ${noSoal}</span>
                    <span class="badge-meta">Tipe: ${item.Tipe || '-'}</span>
                    <span class="badge-meta">Subtest: ${item.Subtest || '-'}</span>
                    <span class="badge-meta">Section: ${item.Section || '-'}</span>
                </div>
                
                <div class="soal-text">${item.Soal}</div>
                
                <div class="box-jawaban">
                    <div><strong>Jawaban Anda:</strong> ${textJawabanUser}</div>
                    <div><strong>Kunci Jawaban:</strong> <span style="color: #198754; font-weight: bold;">${textKunci}</span></div>
                </div>

                <div class="box-pembahasan-text">
                    <strong>💡 Pembahasan:</strong><br>
                    ${item.Pembahasan || "Belum ada pembahasan tertulis."}
                </div>
            </div>
        `;
    });

    html += `</div>`; // Close preview-soal-list

    // 4. Tempel Banner Paywall Token di bawah Soal Ke-3
    html += `
        <div class="paywall-banner">
            <h3>🔒 Mau Akses Seluruh Pembahasan & Full Student Report?</h3>
            <p>Sisa <strong>${totalSoal - 3} soal</strong> beserta Analisis Akurasi Subtest, Section, dan Timelog masih terkunci. Masukkan Token Pembahasan untuk membuka laporan lengkap.</p>
            
            <div class="form-token-group">
                <input type="text" id="input-token-preview" class="input-token" placeholder="Ketik Token..." autocomplete="off">
                <button onclick="verifikasiTokenPreview()" class="btn-unlock">Buka Akses</button>
            </div>
            
            <a href="https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20mau%20beli%20Token%20Pembahasan%20untuk%20ujian%20${encodeURIComponent(dataJSON.kode_ujian || '')}" 
               target="_blank" class="link-wa-admin">
               💬 Belum punya token? Hubungi Admin via WhatsApp
            </a>
        </div>
    </div>`; // Close preview-container

    container.innerHTML = html;
}

// 5. Fungsi Eksekusi Verifikasi Token
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
        
        // Simpan status unlock ke state global
        App.isPembahasanUnlocked = true;

        // Eksekusi pemanggilan Full Student Report yang ada di report.js
        if (typeof renderFullStudentReport === "function") {
            renderFullStudentReport();
        } else {
            console.error("Modul report.js belum dimuat!");
        }
    } else {
        alert("❌ Token Salah! Silakan periksa kembali token yang Anda masukkan atau hubungi admin.");
        inputEl.focus();
    }
}
