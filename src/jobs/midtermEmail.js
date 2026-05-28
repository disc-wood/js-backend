import cron from 'node-cron';
import { pgPool } from '../config/database.js';
import transporter from '../config/mailer.js';

function toDateStr(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function getMidpointDateStr(startVal, endVal) {
  const startStr = toDateStr(startVal);
  const endStr = toDateStr(endVal);
  if (!startStr || !endStr) return null;
  const startMs = new Date(startStr + 'T00:00:00Z').getTime();
  const endMs = new Date(endStr + 'T00:00:00Z').getTime();
  return new Date((startMs + endMs) / 2).toISOString().slice(0, 10);
}

async function sendMidtermEmails() {
  const todayCentral = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

  try {
    const { rows } = await pgPool.query(
      `SELECT * FROM oakton_enrolled
       WHERE is_archived = FALSE
         AND start_date IS NOT NULL
         AND end_date IS NOT NULL
         AND email IS NOT NULL`
    );

    const targets = rows.filter(
      (row) => getMidpointDateStr(row.start_date, row.end_date) === todayCentral
    );

    for (const student of targets) {
      try {
        await transporter.sendMail({
          from: `"Oakton WEI Program" <${process.env.GMAIL_USER}>`,
          to: student.email,
          subject: "You're Halfway Through Your Program — Keep Going!",
          html: `
            <p>Hi ${student.first_name},</p>
            <p>We wanted to check in and celebrate — you're halfway through${student.program_name ? ` the <strong>${student.program_name}</strong> program` : ' your program'}!</p>
            <p>We've been impressed by your dedication and hard work. If you have any questions or need support as you push through the second half, don't hesitate to reach out at <a href="mailto:wei@oakton.edu">wei@oakton.edu</a>.</p>
            <p>Keep going — you're almost there!</p>
            <p>— The Oakton WEI Team</p>
          `,
        });
        console.log(`Midterm email sent to ${student.email}`);
      } catch (err) {
        console.error(`Midterm email failed for ${student.email}:`, err.message);
      }
    }

    console.log(`Midterm job complete: ${targets.length} email(s) sent for ${todayCentral}`);
  } catch (err) {
    console.error('Midterm email job error:', err);
  }
}

// Runs at 1:39 AM Central Time every day
cron.schedule('39 1 * * *', sendMidtermEmails, { timezone: 'America/Chicago' });

console.log('Midterm email job scheduled (1:39 AM Central)');

export { sendMidtermEmails };
