const db = require('../src/config/db');
const attendanceController = require('../src/controllers/attendanceController');
const teacherController = require('../src/controllers/teacherController');

function mockReq(user, body = {}, params = {}, query = {}) {
    return {
        user,
        body,
        params,
        query
    };
}

function mockRes() {
    const res = {
        statusCode: 200,
        data: null,
        status(code) {
            res.statusCode = code;
            return res;
        },
        json(payload) {
            res.data = payload;
            return res;
        }
    };
    return res;
}

async function runTests() {
    console.log("==================================================");
    console.log("RUNNING AUTOMATED QR ATTENDANCE INTEGRATION TESTS");
    console.log("==================================================");

    await db.initDatabase();

    // Fetch test entities from DB
    const teacherUser = (await db.query("SELECT * FROM users WHERE role = 'teacher'"))[0];
    const teacherProfile = (await db.query("SELECT * FROM teachers WHERE user_id = ?", [teacherUser.id]))[0];

    const studentUser1 = (await db.query("SELECT * FROM users WHERE username = 'john.doe'"))[0];
    const studentProfile1 = (await db.query("SELECT * FROM students WHERE user_id = ?", [studentUser1.id]))[0];

    const studentUser2 = (await db.query("SELECT * FROM users WHERE username = 'jane.smith'"))[0];
    const studentProfile2 = (await db.query("SELECT * FROM students WHERE user_id = ?", [studentUser2.id]))[0];

    // Get Student 1's actual enrollment
    const enrollment1 = (await db.query("SELECT * FROM enrollments WHERE student_id = ?", [studentProfile1.id]))[0];

    const reqTeacher = { id: teacherUser.id, role: 'teacher', profileId: teacherProfile.id };
    const reqStudent1 = { id: studentUser1.id, role: 'student', profileId: studentProfile1.id };
    const reqStudent2 = { id: studentUser2.id, role: 'student', profileId: studentProfile2.id };

    console.log(`\nTeacher: Prof. ${teacherProfile.first_name} ${teacherProfile.last_name} (ID: ${teacherProfile.id})`);
    console.log(`Enrolled Student: ${studentProfile1.first_name} ${studentProfile1.last_name} (ID: ${studentProfile1.id})`);
    console.log(`Unenrolled/Different Section Student: ${studentProfile2.first_name} ${studentProfile2.last_name} (ID: ${studentProfile2.id})`);

    // ------------------------------------------------------------------
    // TEST 1 — Teacher Start Attendance Session
    // ------------------------------------------------------------------
    console.log("\n[TEST 1] Teacher Starts Attendance Session...");
    const reqT1 = mockReq(reqTeacher, {
        subject_id: enrollment1.subject_id,
        section_id: enrollment1.section_id,
        duration_minutes: 10
    });
    const resT1 = mockRes();
    await teacherController.createAttendanceSession(reqT1, resT1, (err) => { throw err; });

    console.log("  Status Code:", resT1.statusCode);
    console.log("  Response Message:", resT1.data.message);
    console.log("  Session Token:", resT1.data.session.token);
    if (resT1.statusCode !== 201 || !resT1.data.success) throw new Error("Test 1 Failed!");
    const sessionToken = resT1.data.session.token;
    const sessionId = resT1.data.session.id;

    // Clean up any existing attendance records for this test session to ensure clean test
    await db.query("DELETE FROM attendance_records WHERE session_id = ?", [sessionId]);

    // ------------------------------------------------------------------
    // TEST 2 — Student Scans QR Code (Valid Attendance)
    // ------------------------------------------------------------------
    console.log("\n[TEST 2] Enrolled Student Scans QR Code...");
    const reqS1 = mockReq(reqStudent1, { token: sessionToken });
    const resS1 = mockRes();
    await attendanceController.processQRScan(reqS1, resS1, (err) => { throw err; });

    console.log("  Status Code:", resS1.statusCode);
    console.log("  Response Message:", resS1.data.message);
    console.log("  Attendance Record:", resS1.data.attendance);
    if (resS1.statusCode !== 201 || !resS1.data.success) throw new Error("Test 2 Failed!");

    // ------------------------------------------------------------------
    // TEST 3 — Duplicate Scan Prevention
    // ------------------------------------------------------------------
    console.log("\n[TEST 3] Student Scans Same QR Code Again (Duplicate)...");
    const reqS2 = mockReq(reqStudent1, { token: sessionToken });
    const resS2 = mockRes();
    await attendanceController.processQRScan(reqS2, resS2, (err) => { throw err; });

    console.log("  Status Code:", resS2.statusCode);
    console.log("  Response Message:", resS2.data.message);
    if (resS2.statusCode !== 409 || !resS2.data.message.includes("Attendance already recorded")) throw new Error("Test 3 Failed!");

    // ------------------------------------------------------------------
    // TEST 4 — Unauthorized / Not Enrolled Student Scan
    // ------------------------------------------------------------------
    console.log("\n[TEST 4] Unenrolled Student Scans QR Code...");
    const reqS3 = mockReq(reqStudent2, { token: sessionToken });
    const resS3 = mockRes();
    await attendanceController.processQRScan(reqS3, resS3, (err) => { throw err; });

    console.log("  Status Code:", resS3.statusCode);
    console.log("  Response Message:", resS3.data.message);
    if (resS3.statusCode !== 403 || !resS3.data.message.includes("not enrolled")) throw new Error("Test 4 Failed!");

    // ------------------------------------------------------------------
    // TEST 5 — Expired or Closed QR Session
    // ------------------------------------------------------------------
    console.log("\n[TEST 5] Close Session and Attempt Student Scan...");
    const reqClose = mockReq(reqTeacher, {}, { id: sessionId });
    const resClose = mockRes();
    await teacherController.closeSession(reqClose, resClose, (err) => { throw err; });

    const reqS4 = mockReq(reqStudent1, { token: sessionToken });
    const resS4 = mockRes();
    await attendanceController.processQRScan(reqS4, resS4, (err) => { throw err; });

    console.log("  Status Code:", resS4.statusCode);
    console.log("  Response Message:", resS4.data.message);
    if (resS4.statusCode !== 400 || !resS4.data.message.includes("expired or is closed")) throw new Error("Test 5 Failed!");

    // ------------------------------------------------------------------
    // TEST 6 — Teacher & Student Attendance View Retrieval
    // ------------------------------------------------------------------
    console.log("\n[TEST 6] Teacher Views Attendance Records for Session...");
    const reqRecords = mockReq(reqTeacher, {}, { id: sessionId });
    const resRecords = mockRes();
    await attendanceController.getSessionRecords(reqRecords, resRecords, (err) => { throw err; });

    console.log("  Status Code:", resRecords.statusCode);
    console.log("  Total Scans:", resRecords.data.counts.total);
    console.log("  Present Count:", resRecords.data.counts.present);
    console.log("  Records List:", resRecords.data.records);
    if (resRecords.statusCode !== 200 || resRecords.data.records.length === 0) throw new Error("Test 6 Failed!");

    console.log("\n==================================================");
    console.log("ALL 6 INTEGRATION TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================");
    process.exit(0);
}

runTests().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
