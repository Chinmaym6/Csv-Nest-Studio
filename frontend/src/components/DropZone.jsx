import React, { useState, useRef, useCallback } from 'react';
import './DropZone.css';

export default function DropZone({ onFile }) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef();

  const handleFiles = useCallback(file => {
    const reader = new FileReader();
    reader.onprogress = e => {
      if (e.lengthComputable) {
        setProgress((e.loaded / e.total) * 100);
      }
    };
    reader.onloadend = () => {
      setProgress(0);
      onFile(file.name, reader.result);
    };
    reader.readAsText(file);
  }, [onFile]);

  const onDrop = e => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFiles(file);
  };

  return (
    <div
      className={`dropzone ${dragging ? 'drag-over' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files[0])}
      />
      {progress > 0
        ? <progress value={progress} max="100">{Math.round(progress)}%</progress>
        : <p>Drag &amp; drop a CSV here, or click to select</p>
      }
    </div>
  );
}
