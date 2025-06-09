import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth }  from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import useUndoable from '../contexts/useUndoable';
import api from '../api';
import './CSVViewer.css';


export default function CSVViewer() {
  const { id } = useParams();
  const nav  = useNavigate();
  const { logout } = useAuth();
  const { addToast }  = useToast();

  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileName, setFileName]     = useState('export');

  const {
    present: ui,
    set: setUI,
    undo,
    redo,
    reset,
    canUndo,
    canRedo
  } = useUndoable({
    data: [],
    cols: [],
    deletedCols: [],
    deletedRows: []
  });

  const { data, cols, deletedCols, deletedRows } = ui;

  // Load initial CSV
  useEffect(() => {
    setLoading(true);
    api.get(`/files/${id}/data`)
      .then(async res => {
        const rows = res.data;
        const headers = rows.length
          ? Object.keys(rows[0]).filter(k => k !== '_rowId') //Extracts column headers from the first row.
          : [];                             //Removes row id field

        // fetch filename metadata
        const filesRes = await api.get('/files');
        const meta = filesRes.data.find(f => f.id === Number(id));
        setFileName(meta?.filename.replace(/\.[^.]+$/, '') || 'export');  //Used later for Download CSV functionality.



        reset({  // function from your useUndoable hook to initialize the entire table state:
          data: rows,
          cols: headers,
          deletedCols: [],
          deletedRows: []
        });
      })
      .catch(() => addToast('Failed to load data','error'))
      .finally(() => setLoading(false));
  }, [id, addToast, reset]);

  // Filtered rows
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data;
    return data.filter(r =>
      cols.some(c =>
        String(r[c] ?? '').toLowerCase().includes(q)
      )
    );
  }, [searchTerm, data, cols]);

  // 3) Handlers 
  const handleEdit = (rowId, col, val) => {
    setUI(prev => ({
      ...prev,
      data: prev.data.map(r =>
        r._rowId === rowId
          ? { ...r, [col]: val, _isEdited: true }
          : r
      )
    }));
  };

  const handleAddColumn = () => {
    const name = prompt('Enter new column name:');
    if (!name || cols.includes(name)) return;
    setUI(prev => ({
      ...prev,
      cols: [...prev.cols, name],
      data: prev.data.map(r => ({ ...r, [name]: '', _isEdited: true }))
    }));
  };

  const handleDeleteColumn = col => {
    setUI(prev => ({
      ...prev,
      cols: prev.cols.filter(h => h !== col),  //Removes the column from cols array
      data: prev.data.map(({ [col]:_, ...rest }) => ({
        ...rest, _isEdited: true
      })),
      deletedCols: [...prev.deletedCols, col]//(important for updates in DB)
    }));
  };

  const handleAddRow = () => {
    const temp = `new_${Date.now()}`; //Creates a temporary row ID like new_1701234567890 (since it’s not saved in DB yet)
    const empty = cols.reduce((o,c)=>({ ...o,[c]:'' }),{}); //Builds an empty object for all current columns: 
    setUI(prev => ({
      ...prev,
      data: [...prev.data, { _rowId: temp, ...empty, _isNew: true }]
    }));
  };

  const handleDeleteRow = rowId => {
    setUI(prev => ({
      ...prev,
      data: prev.data.filter(r => r._rowId !== rowId), //Removes the row from data entirely based on _rowId.
      deletedRows: !String(rowId).startsWith('new_') // checks if its not a new row which is saved in db 
        ? [...prev.deletedRows, rowId]
        : prev.deletedRows
    }));
  };

  const handleSave = async () => {
    // new rows
    for (const r of data.filter(r=>r._isNew)) {
      const { _rowId, _isNew, _isEdited, ...rowData } = r;
      try {
        const res = await api.post(`/files/${id}/data`, { rowData });
        r._rowId = res.data.id; //We replace the temporary _rowId with the real DB ID.
        delete r._isNew;
      } catch {
        return addToast('Failed to add new row','error');
      }
    }
    // updates
    const updates = data
      .filter(r=>!r._isNew && r._isEdited)
      .map(r => {
        const { _rowId, _isEdited, ...rowData } = r;
        return { id: _rowId, rowData };
      });

    try {
      await api.put(`/files/${id}/data`, {
        updates,
        deletedColumns: deletedCols,
        deletedRows
      });
    } catch {
      return addToast('Failed to save changes','error');
    }

    // clear flags & history
    const fresh = {
      data: data.map(r=>{ delete r._isEdited; return r; }),
      cols,
      deletedCols: [],
      deletedRows: []
    };
    reset(fresh);
    addToast('Changes saved!','success');
  };

  // Download CSV 
  const handleDownload = () => {
    const lines = [cols.join(',')];
    filtered.forEach(r =>
      lines.push(
        cols.map(c => {
          let v = r[c] ?? '';
          if (typeof v==='string') v = `"${v.replace(/"/g,'""')}"`;
          return v;
        }).join(',')
      )
    );
    const blob = new Blob([lines.join('\n')], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${fileName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  //  Keyboard shortcuts 
  const saveRef = useRef(handleSave);
  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  useEffect(() => { saveRef.current = handleSave; }, [handleSave]);
  useEffect(() => { undoRef.current = undo; redoRef.current = redo; }, [undo,redo]);

  useEffect(() => {
    const onKey = e => {
      if (e.ctrlKey && e.key==='z') {
        e.preventDefault(); undoRef.current();
      }
      if (e.ctrlKey && (e.key==='y'||(e.shiftKey&&e.key==='Z'))) {
        e.preventDefault(); redoRef.current();
      }
      if (e.ctrlKey && e.key==='s') {
        e.preventDefault(); saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) return <div className="csv-viewer"><p>Loading…</p></div>;

  return (
    <div className="csv-viewer">
            <div className="csv-header">
        <button className="back-btn" onClick={() => nav('/dashboard')}>
          ← Back
        </button>
        <input
          className="search-input"
          placeholder="Search…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        {/* Undo / Redo */}
        <button
          className="icon-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >↺</button>
        <button
          className="icon-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >↻</button>

        {/* CSV actions */}
        <button className="add-column-btn" onClick={handleAddColumn}>
          + Column
        </button>
        <button className="add-row-btn" onClick={handleAddRow}>
          + Row
        </button>
        <button className="download-btn" onClick={handleDownload}>
          Download CSV
        </button>
        <button className="save-btn" onClick={handleSave} title="Save (Ctrl+S)">
          Save Changes
        </button>
        <button
          className="collab-btn"
          onClick={async () => {
            const email = prompt('Collaborator email:');
            if (!email) return;
            try {
              await api.post(`/files/${id}/collaborate`, { email });
              addToast('Request sent!','success');
            } catch (err) {
              addToast(err.response?.data?.error||'Failed','error');
            }
          }}
        >
          Collaborate
        </button>

        {/* Logout */}
        <button
          className="logout-btn"
          onClick={() => { logout(); nav('/login'); }}
        >
          Logout
        </button>
      </div>


      <div className="table-wrap">   {/*// wrap is to to make the table scrollable on small screens. */}
        <table className="data-table">
          <thead>
            <tr>
              {cols.map(c => (
               <th key={c}>  {/*This is a React requirement when rendering lists of elements.*/}
                  {c}
                  <button
                    className="del-col-btn"
                    onClick={()=>handleDeleteColumn(c)}
                    title="Delete column"
                  >✖</button>
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
             {/* Loops through filtered data */}
            {filtered.length > 0 ? filtered.map(r => ( 
              <tr key={r._rowId} className={r._isEdited?'edited-row':''}>
                {cols.map(col => (
                  <td key={col}>
                    <input
                      className="edit-input"
                      value={r[col] ?? ''}
                      onChange={e=>handleEdit(r._rowId,col,e.target.value)}
                    />
                  </td>
                ))}
                <td>
                  <button
                    className="del-row-btn"
                    onClick={()=>handleDeleteRow(r._rowId)}
                    title="Delete row"
                  >🗑️</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={cols.length+1} className="no-data">
                  No matching rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
