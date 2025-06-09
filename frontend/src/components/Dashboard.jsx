import React, { useEffect, useState } from 'react'; 
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api';
import './Dashboard.css';
import Notifications from './Notifications';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const { logout } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    api.get('/files').then(res => setFiles(res.data));
  }, []);

  const handleDelete = async id => {
    try {
      await api.delete(`/files/${id}`);
      setFiles(prev => prev.filter(f => f.id !== id));
      addToast('File deleted successfully!', 'success');
    } catch {
      addToast('Delete failed. Please try again.', 'error');
    }
  };

  return (
    <div className="dashboard-hero">
      <div className="overlay"/>
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2>Your Files</h2>
          <Notifications />
          <button
            className="logout-btn"
            onClick={() => { logout(); addToast('Logged out','info'); }}
          >Logout</button>
        </div>

        <div className="upload-container">
          <Link to="/upload" className="upload-btn">
            <span className="upload-icon">📤</span>
            Upload New CSV
          </Link>
        </div>

        <div className="table-wrap">
          <table className="file-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Uploaded At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={f.id}>
                  <td>
                    <Link to={`/files/${f.id}`}>{f.filename}</Link>
                    {f.role==='collaborator' && (
                      <span className="tag-collab">Collaborated</span>
                    )}
                  </td>
                  <td>{new Date(f.uploaded_at).toLocaleString()}</td>
                  <td>
                    <Link to={`/files/${f.id}`}>
                      <button className="view-btn">View</button>
                    </Link>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(f.id)}
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
