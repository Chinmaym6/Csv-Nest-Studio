import React, { useEffect, useState } from 'react';
import api from '../api';
import './Notifications.css';

export default function Notifications() {
  const [requests, setRequests] = useState([]);
  const [notes, setNotes]       = useState([]);
  const [open, setOpen]         = useState(false);

  const load = async () => {
    const [reqRes, noteRes] = await Promise.all([
      api.get('/collaboration_requests'),
      api.get('/notifications'),
    ]);
    setRequests(reqRes.data);
    setNotes(noteRes.data);
  };

  useEffect(() => { load(); }, []);

  const accept = async id => { await api.post(`/collaboration_requests/${id}/accept`); load(); };
  const reject = async id => {  await api.post(`/collaboration_requests/${id}/reject`); load(); };
  const markRead = async nid => {  await api.post(`/notifications/${nid}/read`);};

  const count = requests.length + notes.filter(n => !n.is_read).length;

  return (
    <div className="notif-wrapper">
      <button className="notif-btn" onClick={() => setOpen(o => !o)}>
        🔔 {count}
      </button>
      {open && (
        <div className="notif-dropdown">
          {requests.map(r => (
            <div key={r.id} className="notif-item">
              <span>
                <strong>{r.from_user}</strong> wants to collaborate on "{r.filename}"
              </span>
              <div>
                <button onClick={() => accept(r.id)}>Accept</button>
                <button onClick={() => reject(r.id)}>Reject</button>
              </div>
            </div>
          ))}
          {notes.map(n => (
            <div key={n.id} className="notif-item">
              <span>{n.message}</span>
              {!n.is_read && (
                <button onClick={() => { markRead(n.id); }}>Mark read</button>
              )}
            </div>
          ))}
          {count === 0 && <div className="notif-item">No notifications</div>}
        </div>
      )}
    </div>
  );
}
