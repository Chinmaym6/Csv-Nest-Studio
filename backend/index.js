// backend/index.js

import dotenv from 'dotenv';
import express from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';
import cors from 'cors';
//import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// Load environment variables from .env
dotenv.config();

const app = express();

//  PostgreSQL Pool  
const pool = new Pool({
  host:     process.env.PGHOST,
  port:     Number(process.env.PGPORT),
  user:     process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

//  In-memory session store 
//const sessions = {};
const JWT_SECRET = process.env.JWT_SECRET; 

//  Utility Functions
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex'); // Hashing = irreversible transformation. Passwords are stored safely.

//Used in signup/login to hash and compare securely.
}

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex'); //Assigned to the cookie after login.
}

// ---- Middleware ----
app.use(cors({
  origin: 'https://csv-nest.netlify.app/',  // 👈 your Netlify frontend URL
  credentials: true
}));   //   , credentials: true  //credentials: true is required to send/receive cookies (for auth).
app.use(express.json());
//app.use(cookieParser());

// function requireAuth(req, res, next) { 
//   const sid = req.cookies.sessionId;
//   const userId = sessions[sid];
//   if (!userId) {
//     return res.status(401).json({ error: 'Unauthorized' });
//   }
//   req.userId = userId;
//   next();
// }

 function requireAuth(req, res, next) {
   const auth = req.headers.authorization?.split(' ');
   if (auth?.[0] !== 'Bearer' || !auth[1]) {
     return res.status(401).json({ error: 'Missing token' });
   }
   try {
     const payload = jwt.verify(auth[1], JWT_SECRET);
     req.userId = payload.userId;
     next();
   } catch {
     res.status(401).json({ error: 'Invalid token' });
   }
 }


// ---- Auth Routes ----

// Sign up
// app.post('/api/signup', async (req, res) => {
//   const { name, email, password } = req.body;
//   if (!name || !email || !password) {
//     return res.status(400).json({ error: 'All fields are required' });
//   }
//   try {
//     const password_hash = hashPassword(password);
//     const { rows } = await pool.query(
//       'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id',
//       [name, email, password_hash]
//     );
//     res.status(201).json({ userId: rows[0].id });
//   } catch (err) {
//     if (err.code === '23505') { // Checks for Postgres error code 23505, which is a unique violation (email exists).
//       return res.status(400).json({ error: 'Email already in use' });
//     }
//     console.error(err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const password_hash = hashPassword(password);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id',
      [name, email, password_hash]
    );
    const userId = rows[0].id;

    //  Issue JWT
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token });
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(400).json({ error: 'Email already in use' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log in
// app.post('/api/login', async (req, res) => {
//   const { email, password } = req.body;
//   if (!email || !password) {
//     return res.status(400).json({ error: 'All fields are required' });
//   }
//   try {
//     const { rows } = await pool.query(
//       'SELECT id, password_hash FROM users WHERE email = $1',
//       [email]
//     );
//     const user = rows[0];
//     if (!user || hashPassword(password) !== user.password_hash) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }
//     const sessionId = generateSessionId();
//     sessions[sessionId] = user.id;
//     res.cookie('sessionId', sessionId, { httpOnly: true });
//     res.json({ message: 'Logged in successfully' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    if (!user || hashPassword(password) !== user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    //  Issue JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log out
// app.post('/api/logout', requireAuth, (req, res) => {
//   const sid = req.cookies.sessionId;
//   delete sessions[sid];
//   res.clearCookie('sessionId');
//   res.json({ message: 'Logged out successfully' });
// });

// Protected test route
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ message: `Hello, user ${req.userId}` });
});

//  CSV Handling API 

// Upload & parse CSV
app.post('/api/files/upload', requireAuth, async (req, res) => {
  const { filename, content } = req.body;
  if (!filename || !content) {
    return res.status(400).json({ error: 'Filename and content are required' });
  }
  try {
    // Insert file metadata
    const { rows } = await pool.query(
      'INSERT INTO files (user_id, filename) VALUES ($1, $2) RETURNING id',
      [req.userId, filename]
    );
    const fileId = rows[0].id;

    // Parse CSV into rows
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    // Insert each data row as JSONB
    for (const line of dataRows) {
      const values = line.split(',').map(v => v.trim());
      const rowData = {};
      headers.forEach((header, idx) => {
        rowData[header] = values[idx] ?? null;
      });
      await pool.query(
        'INSERT INTO file_data (file_id, row_data) VALUES ($1, $2)',
        [fileId, rowData]
      );
    }

    res.status(201).json({ fileId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload and parse CSV' });
  }
});

// List all files for user
// app.get('/api/files', requireAuth, async (req, res) => {
//   try {
//     const { rows } = await pool.query(
//       'SELECT id, filename, uploaded_at FROM files WHERE user_id = $1 ORDER BY uploaded_at DESC',
//       [req.userId]
//     );
//     res.json(rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to fetch files' });
//   }
// });

//  owners + collaborators
app.get('/api/files', requireAuth, async (req, res) => {
  // files you own
  const owned = await pool.query(
    `SELECT id, filename, uploaded_at, 'owner' AS role
       FROM files
      WHERE user_id = $1`,
    [req.userId]
  );

  // files shared with you
  const shared = await pool.query(
    `SELECT f.id, f.filename, f.uploaded_at, 'collaborator' AS role
       FROM shared_files sf
       JOIN files f ON f.id = sf.file_id
      WHERE sf.user_id = $1`,
    [req.userId]
  );

  // merge and sort by date newest first
  const all = [...owned.rows, ...shared.rows]
    .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

  res.json(all);
});



// Helper to check access: owner OR shared
async function userHasAccess(userId, fileId) {
  // check ownership
  const own = await pool.query(
    'SELECT 1 FROM files WHERE id=$1 AND user_id=$2',
    [fileId, userId]
  );
  if (own.rows.length) return true;

  // check shared_files
  const shared = await pool.query(
    'SELECT 1 FROM shared_files WHERE file_id=$1 AND user_id=$2',
    [fileId, userId]
  );
  return !!shared.rows.length;
}

// Fetch CSV data 
app.get('/api/files/:fileId/data', requireAuth, async (req, res) => {
  const fileId = Number(req.params.fileId);
  if (isNaN(fileId)) return res.status(400).json({ error: 'Invalid file ID' });

  //Ensures only users with access (owner/shared) can view data.
  if (!(await userHasAccess(req.userId, fileId))) {
    return res.status(404).json({ error: 'File not found' });
  }


  //Fetches rows from file_data for this file.
  try {
    const { rows } = await pool.query(
      'SELECT id, row_data FROM file_data WHERE file_id = $1 ORDER BY id',
      [fileId]
    );//Adds _rowId to each row (needed for editing on frontend).
    const result = rows.map(r => ({ _rowId: r.id, ...r.row_data }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch file data' });
  }
});

//  Update CSV data inline
app.put('/api/files/:fileId/data', requireAuth, async (req, res) => {
  const fileId = Number(req.params.fileId);
  const { updates, deletedColumns, deletedRows } = req.body;
  if (isNaN(fileId) || !Array.isArray(updates)) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  if (!(await userHasAccess(req.userId, fileId))) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    // 1) Remove JSONB keys for any deleted columns
    if (Array.isArray(deletedColumns)) {
      for (const col of deletedColumns) {
        await pool.query(
          'UPDATE file_data SET row_data = row_data - $1 WHERE file_id = $2',
          [col, fileId]
        );
      }
    }

    // 2) Delete any rows the user marked
    if (Array.isArray(deletedRows) && deletedRows.length) {
      await pool.query(
        'DELETE FROM file_data WHERE file_id = $1 AND id = ANY($2)',
        [fileId, deletedRows]
      );
    }

    // 3) Update remaining edited rows
    for (const { id, rowData } of updates) {
      await pool.query(
        'UPDATE file_data SET row_data = $1 WHERE id = $2 AND file_id = $3',
        [rowData, id, fileId]
      );
    }

    res.json({ message: 'Data updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update data' });
  }
});

//  Create new row (POST) 
app.post('/api/files/:fileId/data', requireAuth, async (req, res) => {
  const fileId = Number(req.params.fileId);
  const { rowData } = req.body;
  if (isNaN(fileId) || typeof rowData !== 'object') {
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (!(await userHasAccess(req.userId, fileId))) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO file_data (file_id, row_data) VALUES ($1, $2) RETURNING id',
      [fileId, rowData]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add row' });
  }
});


// Delete a file (and its data)
app.delete('/api/files/:fileId', requireAuth, async (req, res) => {
  const fileId = Number(req.params.fileId);
  if (isNaN(fileId)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }
  try {
    const { rows } = await pool.query(
      'DELETE FROM files WHERE id = $1 AND user_id = $2 RETURNING id',  //to ensure only owners can delete.
      [fileId, req.userId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'File not found or unauthorized' });
    }
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Send a collaboration request
app.post('/api/files/:fileId/collaborate', requireAuth, async (req, res) => {
  const fileId = Number(req.params.fileId);
  const { email } = req.body;

  // 1) Validate
  if (isNaN(fileId) || !email) return res.status(400).json({ error: 'Invalid' });

  // 2) Find recipient
  const u = await pool.query('SELECT id,name FROM users WHERE email=$1', [email]);
  if (!u.rows.length) return res.status(404).json({ error: 'User not found' });
  const toUserId = u.rows[0].id;

  // 3) Check ownership
     //Ensures the requesting user is the owner of the file.
  const f = await pool.query('SELECT user_id,filename FROM files WHERE id=$1', [fileId]);
  if (!f.rows.length || f.rows[0].user_id !== req.userId)
    return res.status(403).json({ error: 'Not allowed' });
  if (toUserId === req.userId)
    return res.status(400).json({ error: 'Cannot collaborate yourself' });


  // 4) No duplicate Prevents duplicate requests.
  const ex = await pool.query(
    `SELECT 1 FROM collaboration_requests
     WHERE file_id=$1 AND from_user_id=$2 AND to_user_id=$3 AND status='pending'`,
    [fileId, req.userId, toUserId]
  );
  if (ex.rows.length) return res.status(400).json({ error: 'Already requested' });

  // 5) Insert request Creates a new collaboration request row in the database.
  const rq = await pool.query(
    `INSERT INTO collaboration_requests
       (file_id, from_user_id, to_user_id, status)
     VALUES ($1,$2,$3,'pending') RETURNING id`,
    [fileId, req.userId, toUserId]
  );
  // 6) Notify recipient
  const msg = `User ${u.rows[0].name} wants to collaborate on "${f.rows[0].filename}"`;
  await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1,$2)', [toUserId, msg]);
  res.status(201).json({ message: 'Request sent' });
});

// List pending collaboration requests for current user
app.get('/api/collaboration_requests', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT cr.id, cr.file_id, f.filename, u.name AS from_user
      FROM collaboration_requests cr
      JOIN files f ON f.id=cr.file_id
      JOIN users u ON u.id=cr.from_user_id
     WHERE cr.to_user_id=$1 AND cr.status='pending'
  `, [req.userId]);
  res.json(rows);
});

// Accept a request
app.post('/api/collaboration_requests/:requestId/accept', requireAuth, async (req, res) => {
  const rid = Number(req.params.requestId);
  const { rows } = await pool.query(
    `SELECT file_id, from_user_id, to_user_id
       FROM collaboration_requests
      WHERE id=$1 AND status='pending'`, [rid]
  );
  if (!rows.length || rows[0].to_user_id !== req.userId)
    return res.status(404).json({ error: 'Not found' });
  const { file_id, from_user_id } = rows[0];
  // 1) Update request
  await pool.query(`UPDATE collaboration_requests SET status='accepted' WHERE id=$1`, [rid]);
  // 2) Grant access
  await pool.query(`INSERT INTO shared_files (file_id, user_id) VALUES ($1, $2)`, [file_id, req.userId]);
  // 3) Notify sender
  await pool.query(
    `INSERT INTO notifications (user_id, message) VALUES ($1,$2)`,
    [from_user_id, `Your collaboration request for file ${file_id} was accepted`]
  );
  res.json({ message: 'Accepted' });
});

// Reject a request
app.post('/api/collaboration_requests/:requestId/reject', requireAuth, async (req, res) => {
  const rid = Number(req.params.requestId);
  const { rows } = await pool.query(
    `SELECT file_id, from_user_id, to_user_id
       FROM collaboration_requests
      WHERE id=$1 AND status='pending'`, [rid]
  );
  if (!rows.length || rows[0].to_user_id !== req.userId)
    return res.status(404).json({ error: 'Not found' });
  const { file_id, from_user_id } = rows[0];
  await pool.query(`UPDATE collaboration_requests SET status='rejected' WHERE id=$1`, [rid]);
  await pool.query(
    `INSERT INTO notifications (user_id, message) VALUES ($1,$2)`,
    [from_user_id, `Your collaboration request for file ${file_id} was rejected`]
  );
  res.json({ message: 'Rejected' });
});

// Fetch all notifications for current user
app.get('/api/notifications', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, message, is_read, created_at
       FROM notifications
      WHERE user_id=$1
      ORDER BY created_at DESC`,
    [req.userId]
  );
  res.json(rows);
});

// Mark a notification read 
app.post('/api/notifications/:nid/read', requireAuth, async (req, res) => {
  const nid = Number(req.params.nid);
  await pool.query(`UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2`, [nid, req.userId]);
  res.json({ message: 'Marked read' });
});

// Override GET /api/files to include shared files
app.get('/api/files', requireAuth, async (req, res) => {
  const owner = await pool.query(
    `SELECT id, filename, uploaded_at, 'owner' AS role
       FROM files
      WHERE user_id=$1`, [req.userId]
  );
  const shared = await pool.query(
    `SELECT f.id, f.filename, f.uploaded_at, 'collaborator' AS role
       FROM shared_files sf
       JOIN files f ON f.id = sf.file_id
      WHERE sf.user_id=$1`, [req.userId]
  );
  res.json([...owner.rows, ...shared.rows]);
});


// ---- Start Server ----
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
