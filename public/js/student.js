// Student Dashboard Controller
async function renderStudentDashboard() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fa-solid fa-qrcode"></i></div>
                <div class="stat-details">
                    <h3 id="st-stat-scans">0</h3>
                    <p>Total Scans Recorded</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fa-solid fa-circle-check"></i></div>
                <div class="stat-details">
                    <h3 id="st-stat-present">0</h3>
                    <p>Classes Present</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon amber"><i class="fa-solid fa-clock"></i></div>
                <div class="stat-details">
                    <h3 id="st-stat-late">0</h3>
                    <p>Classes Late</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple"><i class="fa-solid fa-percent"></i></div>
                <div class="stat-details">
                    <h3 id="st-stat-rate">0%</h3>
                    <p>Overall Attendance Rate</p>
                </div>
            </div>
        </div>

        <div class="card" style="background: linear-gradient(135deg, #4f46e5 0%, #312e81 100%); color: white; margin-bottom: 28px;">
            <div class="card-body" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
                <div>
                    <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 4px;">Ready to Mark Your Class Attendance?</h2>
                    <p style="font-size: 14px; opacity: 0.9;">Point your device camera at your teacher's dynamic QR code code to log your attendance instantly.</p>
                </div>
                <button class="btn" style="background-color: white; color: var(--primary); font-weight: 700; padding: 14px 24px;" onclick="switchNav('student-scanner')">
                    <i class="fa-solid fa-camera"></i> Open Camera Scanner
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-book"></i> Enrolled Subjects & Attendance Breakdown</h3>
            </div>
            <div class="card-body">
                <div id="student-subjects-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                    <p>Loading enrolled subjects...</p>
                </div>
            </div>
        </div>
    `;

    try {
        const statsRes = await apiFetch('/api/student/stats');
        if (statsRes && statsRes.success) {
            document.getElementById('st-stat-scans').innerText = statsRes.stats.totalScans;
            document.getElementById('st-stat-present').innerText = statsRes.stats.present;
            document.getElementById('st-stat-late').innerText = statsRes.stats.late;
            document.getElementById('st-stat-rate').innerText = statsRes.stats.overallPercentage + '%';
        }

        const subjectsRes = await apiFetch('/api/student/subjects');
        const grid = document.getElementById('student-subjects-grid');

        if (subjectsRes && subjectsRes.success) {
            if (subjectsRes.subjects.length === 0) {
                grid.innerHTML = '<p>You are not currently enrolled in any subjects.</p>';
                return;
            }

            grid.innerHTML = subjectsRes.subjects.map(s => `
                <div style="background: white; border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 20px; box-shadow: var(--shadow-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span class="badge badge-info">${escapeHtml(s.subject_code)}</span>
                        <span style="font-weight: 700; font-size: 16px; color: ${s.attendance_percentage >= 80 ? 'var(--success)' : 'var(--danger)'}">
                            ${s.attendance_percentage}%
                        </span>
                    </div>
                    <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">${escapeHtml(s.subject_name)}</h4>
                    <p style="font-size: 13px; color: var(--slate-600); margin-bottom: 12px;">Teacher: Prof. ${escapeHtml(s.teacher_first)} ${escapeHtml(s.teacher_last)}</p>
                    
                    <div style="margin-top: 12px;">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--slate-600); margin-bottom: 4px;">
                            <span>Attended: ${s.attended_sessions} / ${s.total_sessions} Sessions</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: var(--slate-100); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${s.attendance_percentage}%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary));"></div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch(e) {
        console.error(e);
    }
}

// Render Full Student Attendance History Table with Summary Statistics
async function renderStudentHistory() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="stats-grid" style="margin-bottom: 24px;">
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fa-solid fa-qrcode"></i></div>
                <div class="stat-details">
                    <h3 id="hist-total">0</h3>
                    <p>Total Sessions Logged</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fa-solid fa-circle-check"></i></div>
                <div class="stat-details">
                    <h3 id="hist-present">0</h3>
                    <p>Present</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon amber"><i class="fa-solid fa-clock"></i></div>
                <div class="stat-details">
                    <h3 id="hist-late">0</h3>
                    <p>Late</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red" style="background: #fee2e2; color: #dc2626;"><i class="fa-solid fa-user-xmark"></i></div>
                <div class="stat-details">
                    <h3 id="hist-absent">0</h3>
                    <p>Absent</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple"><i class="fa-solid fa-percent"></i></div>
                <div class="stat-details">
                    <h3 id="hist-rate">0%</h3>
                    <p>Attendance Rate</p>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-clock-rotate-left"></i> My Attendance History Log</h3>
            </div>
            <div class="card-body table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Section</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Teacher</th>
                        </tr>
                    </thead>
                    <tbody id="student-history-tbody">
                        <tr><td colspan="6">Loading history...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    try {
        const statsRes = await apiFetch('/api/student/stats');
        if (statsRes && statsRes.success) {
            document.getElementById('hist-total').innerText = statsRes.stats.totalScans;
            document.getElementById('hist-present').innerText = statsRes.stats.present;
            document.getElementById('hist-late').innerText = statsRes.stats.late;
            document.getElementById('hist-absent').innerText = statsRes.stats.absent;
            document.getElementById('hist-rate').innerText = statsRes.stats.overallPercentage + '%';
        }

        const res = await apiFetch('/api/student/history');
        const tbody = document.getElementById('student-history-tbody');

        if (res && res.success) {
            if (!res.history || res.history.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6">No attendance records found yet.</td></tr>';
                return;
            }

            tbody.innerHTML = res.history.map(h => {
                const scanDate = h.scanned_at ? new Date(h.scanned_at) : new Date();
                const formattedDate = h.date ? new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : scanDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const formattedTime = h.time || scanDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                return `
                    <tr>
                        <td><strong>${escapeHtml(h.subject_code)}</strong> - ${escapeHtml(h.subject_name)}</td>
                        <td><span class="badge badge-info">${escapeHtml(h.section_name)}</span></td>
                        <td>${formattedDate}</td>
                        <td>${formattedTime}</td>
                        <td><span class="badge ${h.status === 'Present' ? 'badge-success' : (h.status === 'Late' ? 'badge-warning' : 'badge-danger')}">${h.status}</span></td>
                        <td>Prof. ${escapeHtml(h.teacher_first)} ${escapeHtml(h.teacher_last)}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch(e) {
        console.error('Student history error:', e);
    }
}

// Render Student Profile Details View
async function renderStudentProfile() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="card" style="max-width: 650px; margin: 0 auto;">
            <div class="card-header">
                <h3><i class="fa-solid fa-id-card"></i> Student Profile</h3>
            </div>
            <div class="card-body" id="student-profile-body">
                <p>Loading profile information...</p>
            </div>
        </div>
    `;

    try {
        const res = await apiFetch('/api/student/profile');
        const container = document.getElementById('student-profile-body');

        if (res && res.success && res.profile) {
            const p = res.profile;
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--slate-200);">
                    <div style="width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800;">
                        ${escapeHtml((p.first_name || 'S').charAt(0))}
                    </div>
                    <div>
                        <h2 style="font-size: 22px; font-weight: 800; color: var(--slate-900);">${escapeHtml(p.first_name)} ${escapeHtml(p.last_name)}</h2>
                        <span class="badge badge-info">${escapeHtml(p.student_code || p.student_id)}</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                    <div style="background: var(--slate-50); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--slate-200);">
                        <span style="font-size: 12px; color: var(--slate-600); display: block;">Username</span>
                        <strong style="font-size: 15px; color: var(--slate-900);">${escapeHtml(p.username)}</strong>
                    </div>
                    <div style="background: var(--slate-50); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--slate-200);">
                        <span style="font-size: 12px; color: var(--slate-600); display: block;">Email Address</span>
                        <strong style="font-size: 15px; color: var(--slate-900);">${escapeHtml(p.email)}</strong>
                    </div>
                    <div style="background: var(--slate-50); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--slate-200);">
                        <span style="font-size: 12px; color: var(--slate-600); display: block;">Course / Program</span>
                        <strong style="font-size: 15px; color: var(--slate-900);">${escapeHtml(p.course_code || p.course || 'N/A')}</strong>
                    </div>
                    <div style="background: var(--slate-50); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--slate-200);">
                        <span style="font-size: 12px; color: var(--slate-600); display: block;">Class Section</span>
                        <strong style="font-size: 15px; color: var(--slate-900);">${escapeHtml(p.section_name || p.section || 'N/A')}</strong>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '<p class="text-danger">Failed to load student profile.</p>';
        }
    } catch (e) {
        console.error(e);
    }
}
