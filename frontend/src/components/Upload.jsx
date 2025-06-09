import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast }    from '../contexts/ToastContext';
import api from '../api';
import DropZone from './DropZone';
import './Upload.css';

export default function Upload() {
  const navigate     = useNavigate();
  const { addToast } = useToast();

  const handleFile = async (filename, content) => {
    try {
      await api.post('/files/upload', { filename, content });
      addToast('File uploaded successfully!', 'success');
      navigate('/dashboard');
    } catch {
      addToast('Upload failed. Please try again.', 'error');
    }
  };

  return (
    <div className="upload-hero">
      <div className="overlay" />
      <div className="upload-card">
        <h2>Upload Your CSV</h2>
        <p className="subtitle">Drag & drop or click to select a file</p>
        <DropZone onFile={handleFile} />
      </div>
    </div>
  );
}
