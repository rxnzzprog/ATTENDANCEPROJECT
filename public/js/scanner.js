// Student Mobile QR Camera Scanner Controller
function renderStudentScanner() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="scanner-card">
            <div style="margin-bottom: 16px;">
                <i class="fa-solid fa-qrcode" style="font-size: 36px; color: var(--primary);"></i>
                <h2 style="font-size: 20px; font-weight: 800; margin-top: 8px;">Scan Attendance QR Code</h2>
                <p style="font-size: 13px; color: var(--slate-600);">Align the QR code on your teacher's screen within the camera box below.</p>
            </div>

            <!-- HTML5 QR Camera Viewport -->
            <div id="reader"></div>

            <div id="scan-result" style="margin-top: 16px;"></div>

            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--slate-200);">
                <p style="font-size: 12px; color: var(--slate-600); margin-bottom: 8px;">Having camera issues? Enter session token manually:</p>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="manual-token-input" class="form-control" placeholder="Paste session token here..." style="font-family: monospace;">
                    <button class="btn btn-primary" onclick="submitManualToken()"><i class="fa-solid fa-paper-plane"></i> Submit</button>
                </div>
            </div>
        </div>
    `;

    initCameraScanner();
}

function initCameraScanner() {
    if (typeof Html5Qrcode === 'undefined') {
        showToast('QR Scanner library is loading...', 'info');
        setTimeout(initCameraScanner, 1000);
        return;
    }

    if (window.qrScannerInstance) {
        try { window.qrScannerInstance.stop(); } catch(e){}
    }

    const html5QrCode = new Html5Qrcode("reader");
    window.qrScannerInstance = html5QrCode;

    const qrCodeSuccessCallback = async (decodedText, decodedResult) => {
        // Pause scanning to avoid rapid multiple submissions
        try { await html5QrCode.pause(); } catch(e){}

        showToast('QR Code detected! Validating session...', 'info');
        await sendQRTokenToBackend(decodedText);
    };

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        qrCodeSuccessCallback
    ).catch(err => {
        console.warn('Camera stream error:', err);
        document.getElementById('scan-result').innerHTML = `
            <div style="padding: 12px; background: var(--warning-bg); color: var(--warning); border-radius: var(--radius-sm); font-size: 13px;">
                <i class="fa-solid fa-triangle-exclamation"></i> Camera access is required to scan the QR code. Please grant camera permission or use manual token entry below.
            </div>
        `;
    });
}

async function submitManualToken() {
    const token = document.getElementById('manual-token-input').value;
    if (!token || token.trim() === '') {
        showToast('Please enter a session token.', 'warning');
        return;
    }
    await sendQRTokenToBackend(token.trim());
}

async function sendQRTokenToBackend(tokenOrPayload) {
    try {
        const res = await apiFetch('/api/attendance/scan', 'POST', { payload: tokenOrPayload });
        const resultDiv = document.getElementById('scan-result');

        if (res && res.success) {
            showToast(res.message, 'success');
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <div style="padding: 20px; background: var(--success-bg); color: var(--success); border-radius: var(--radius-md); border: 1px solid var(--success);">
                        <i class="fa-solid fa-circle-check" style="font-size: 32px; margin-bottom: 8px;"></i>
                        <h3 style="font-size: 18px; font-weight: 800;">${res.message}</h3>
                        <p style="font-size: 14px; margin-top: 4px;">Subject: <strong>${res.attendance.subjectCode} - ${res.attendance.subjectName}</strong></p>
                        <p style="font-size: 13px; margin-top: 2px;">Faculty: ${res.attendance.teacherName}</p>
                        <p style="font-size: 12px; opacity: 0.8; margin-top: 6px;">Logged at: ${new Date(res.attendance.timestamp).toLocaleTimeString()}</p>
                    </div>
                `;
            }
        } else {
            showToast(res.message || 'QR Validation Failed', 'danger');
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <div style="padding: 16px; background: var(--danger-bg); color: var(--danger); border-radius: var(--radius-md); border: 1px solid var(--danger);">
                        <i class="fa-solid fa-circle-xmark" style="font-size: 24px; margin-bottom: 6px;"></i>
                        <p style="font-size: 14px; font-weight: 700;">${res.message || 'Attendance Scan Failed'}</p>
                    </div>
                `;
            }
            // Resume scanner after 3 seconds on failure
            setTimeout(() => {
                if (window.qrScannerInstance) {
                    try { window.qrScannerInstance.resume(); } catch(e){}
                }
            }, 3000);
        }
    } catch (err) {
        console.error('QR Scan submit error:', err);
        showToast('Server error while processing QR code.', 'danger');
    }
}
