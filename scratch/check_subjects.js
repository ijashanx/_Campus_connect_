const pool = require('../config/database');

async function check() {
    try {
        const [depts] = await pool.execute("SELECT * FROM departments");
        console.log("DEPARTMENTS:");
        console.log(depts);

        const [subs] = await pool.execute("SELECT * FROM subjects");
        console.log("SUBJECTS:");
        console.log(subs);

        const [notes] = await pool.execute("SELECT * FROM notes");
        console.log("NOTES:");
        console.log(notes.map(n => ({ id: n.id, title: n.title, dept_id: n.department_id, sem: n.semester, subject: n.subject, subject_id: n.subject_id })));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
