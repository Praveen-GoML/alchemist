import { useState, useMemo, useRef, useEffect } from 'react';
import { safeUrl } from '../../utils/safeUrl';
import { norm } from '../../utils/helpers';
import { 
  FolderPlus, 
  FileText, 
  FileSpreadsheet, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Search, 
  Folder, 
  Link as LinkIcon, 
  FileCheck, 
  Cloud, 
  HardDrive,
  Copy,
  Check,
  Download,
  Upload,
  Settings,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadProjectFile, ALLOWED_EXT, MAX_UPLOAD_MB } from '../../services/documentStorage';
import DocViewerModal from '../DocViewerModal';
import DocCard from '../DocCard';

import { dialog } from '../../utils/dialog';
const DEFAULT_CATEGORIES = [
  { id: 'brd', label: 'BRD & Specs', icon: FileText, color: '#3B82F6' },
  { id: 'excel', label: 'Excel & Trackers', icon: FileSpreadsheet, color: '#10B981' },
  { id: 'architecture', label: 'Architecture & Diagrams', icon: Cloud, color: '#8B5CF6' },
  { id: 'meeting_notes', label: 'MOM & Client Notes', icon: FileCheck, color: '#F59E0B' },
  { id: 'general', label: 'Other Cloud Links', icon: LinkIcon, color: '#6B7280' },
];

export default function Docs({ data, updateData }) {
  const { canEditProjects, isManagementUser, user, isOwnMember } = useAuth();
  const canEdit = canEditProjects ? canEditProjects() : isManagementUser;
  const { projects = [], projectDocs = {} } = data;

  // Filter projects for members: PM/TL see all, members see their assigned projects
  const visibleProjects = useMemo(() => {
    if (!user || isManagementUser) return projects;
    const myMember = (data.members || []).find(m => isOwnMember(m.name, m.email));
    if (!myMember) return [];
    const myProjectNames = (myMember.projects || []).map(norm);
    return projects.filter(p => myProjectNames.includes(norm(p.name)));
  }, [user, isManagementUser, data.members, projects, isOwnMember]);

  const [selectedProject, setSelectedProject] = useState(() => {
    return visibleProjects[0]?.name || projects[0]?.name || '';
  });
  // if the chosen project is not available (data still loading, or access changed), fall back to the first one
  useEffect(() => {
    if (!visibleProjects.some(p => p.name === selectedProject)) setSelectedProject(visibleProjects[0]?.name || '');
  }, [visibleProjects, selectedProject]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Modal / Add form state
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [addMode, setAddMode] = useState('upload'); // 'upload' or 'link'
  const [isUploading, setIsUploading] = useState(false);
  const [viewing, setViewing] = useState(null); // the document open in the in-page viewer
  const [uploadError, setUploadError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    url: '',
    category: 'brd',
    notes: '',
  });

  const rawProjectDocs = (projectDocs && projectDocs[selectedProject]) || [];
  const activeProjectDocs = Array.isArray(rawProjectDocs) ? rawProjectDocs : (rawProjectDocs.docs || []);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!canEdit || !selectedFile) return;

    const allowedExtensions = ALLOWED_EXT;
    const fileExt = '.' + selectedFile.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      setUploadError(`${fileExt} files can't be uploaded. Allowed: ${ALLOWED_EXT.join(' ')}`);
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const res = await uploadProjectFile(selectedProject, selectedFile);
      
      // Auto-detect whether this is an Excel file or BRD document
      const isExcel = ['.xlsx', '.xls', '.csv'].includes(fileExt);
      const autoCategory = isExcel ? 'excel' : 'brd';

      const newDoc = {
        id: 'doc_' + Date.now(),
        title: form.title.trim() || selectedFile.name,
        url: res.publicUrl || '',
        path: res.filePath || '',
        isPrivate: !!res.isPrivate,
        size: selectedFile.size >= 1048576 ? `${(selectedFile.size / 1048576).toFixed(1)} MB` : `${(selectedFile.size / 1024).toFixed(1)} KB`,
        category: autoCategory,
        notes: form.notes.trim() || `${res.storageProvider} • ${isExcel ? 'Excel Sheet' : 'BRD Document'} (${(selectedFile.size / 1024).toFixed(1)} KB)`,
        isUploaded: true,
        fileName: selectedFile.name,
        storageProvider: res.storageProvider,
        addedBy: user?.name || 'Team Lead',
        addedAt: new Date().toISOString(),
      };

      updateData(prev => {
        const existing = prev.projectDocs || {};
        const projList = existing[selectedProject] || [];
        return {
          ...prev,
          projectDocs: {
            ...existing,
            [selectedProject]: [newDoc, ...projList]
          }
        };
      });

      setSelectedFile(null);
      setForm({ title: '', url: '', category: 'brd', notes: '' });
      setIsAddingDoc(false);
    } catch (err) {
      console.error(err);
      setUploadError(err.message || 'Upload failed. Check file size or connection.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!canEdit || !form.title.trim() || !form.url.trim()) return;

    let cleanUrl = form.url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const newDoc = {
      id: 'doc_' + Date.now(),
      title: form.title.trim(),
      url: cleanUrl,
      category: form.category,
      notes: form.notes.trim(),
      isUploaded: false,
      addedBy: user?.name || 'Team Lead',
      addedAt: new Date().toISOString(),
    };

    updateData(prev => {
      const existing = prev.projectDocs || {};
      const projList = existing[selectedProject] || [];
      return {
        ...prev,
        projectDocs: {
          ...existing,
          [selectedProject]: [newDoc, ...projList]
        }
      };
    });

    setForm({ title: '', url: '', category: 'brd', notes: '' });
    setIsAddingDoc(false);
  };

  const handleDeleteDoc = async (docId) => {
    if (!canEdit || !(await dialog.confirm('The file stays in Dropbox or Drive; only this entry is removed from the project.', { title: 'Remove this document?', variant: 'danger', confirmLabel: 'Remove' }))) return;
    updateData(prev => {
      const existing = prev.projectDocs || {};
      const projList = existing[selectedProject] || [];
      return {
        ...prev,
        projectDocs: {
          ...existing,
          [selectedProject]: projList.filter(d => d.id !== docId)
        }
      };
    });
  };

  // Filter documents
  const filteredDocs = activeProjectDocs.filter(d => {
    const matchCat = selectedCategory === 'all' || d.category === selectedCategory;
    const matchSearch = !searchQuery.trim() || 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.notes && d.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.url || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="docs2">
      {/* Top Banner / Header */}
      <div className="greet" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Folder color="var(--accent)" size={24} />
              Project Docs & Cloud Storage
            </h2>
            <p className="hint" style={{ margin: '4px 0 0' }}>
              One place for every project's BRDs, trackers and specs. Upload a file to Dropbox, or paste a Drive / SharePoint link.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

            {canEdit && (
              <button
                className="tb on"
                style={{ padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => {
                  setAddMode('upload');
                  setIsAddingDoc(true);
                }}
              >
                <Plus size={16} />
                <span>Add / Upload Document</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Project Selector Bar */}
      <div className="chips" role="tablist" style={{ marginBottom: '20px' }}>
        {visibleProjects.map(p => {
          const docCount = (projectDocs[p.name] || []).length;
          const isSelected = p.name === selectedProject;
          return (
            <button
              key={p.name}
              role="tab"
              aria-selected={isSelected}
              className={`chip ${isSelected ? 'on' : ''}`}
              onClick={() => setSelectedProject(p.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              <Folder size={15} color={isSelected ? 'var(--accent)' : 'var(--muted)'} />
              <span>{p.name}</span>
              {docCount > 0 && (
                <span style={{
                  fontSize: '11px',
                  background: isSelected ? 'var(--accent-soft)' : 'var(--soft)',
                  color: isSelected ? 'var(--accent-text)' : 'var(--muted)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {docCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Navigation: Categories / Folders */}
        <div className="card" style={{ padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Document Folders
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                background: selectedCategory === 'all' ? 'var(--accent-soft)' : 'transparent',
                color: selectedCategory === 'all' ? 'var(--accent-text)' : 'var(--ink)',
                fontWeight: selectedCategory === 'all' ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '13.5px',
                transition: 'background 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Folder size={16} />
                <span>All Documents</span>
              </div>
              <span style={{ fontSize: '12px', opacity: 0.7, fontFamily: "'JetBrains Mono', monospace" }}>
                {activeProjectDocs.length}
              </span>
            </button>

            {DEFAULT_CATEGORIES.map(cat => {
              const CatIcon = cat.icon;
              const count = activeProjectDocs.filter(d => d.category === cat.id).length;
              const isCatActive = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isCatActive ? 'var(--accent-soft)' : 'transparent',
                    color: isCatActive ? 'var(--accent-text)' : 'var(--ink)',
                    fontWeight: isCatActive ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13.5px',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CatIcon size={16} color={cat.color} />
                    <span>{cat.label}</span>
                  </div>
                  <span style={{ fontSize: '12px', opacity: 0.7, fontFamily: "'JetBrains Mono', monospace" }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

        {/* Right Content Area: Document List */}
        <div>
          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder={`Search ${selectedProject} docs, Excel sheets, BRD...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--surface)',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Document Cards */}
          {filteredDocs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '12px' }}>
              <Folder size={40} color="var(--muted)" style={{ opacity: 0.4, marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--ink)' }}>No documents found for {selectedProject}</h3>
              <p className="muted" style={{ margin: '0 0 16px', fontSize: '13px' }}>
                {canEdit ? 'Paste links to Google Drive, SharePoint Excel, or cloud specs to get started.' : 'No files have been attached to this project yet.'}
              </p>
              {canEdit && (
                <button className="tb on" onClick={() => setIsAddingDoc(true)}>
                  <Plus size={15} /> Add first document
                </button>
              )}
            </div>
          ) : (
            <div className="dc-grid">
              {filteredDocs.map(doc => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  category={DEFAULT_CATEGORIES.find(c => c.id === doc.category) || DEFAULT_CATEGORIES[0]}
                  canEdit={canEdit}
                  copied={copiedId === doc.id}
                  onCopy={() => handleCopy(doc.id, doc.url)}
                  onDelete={() => handleDeleteDoc(doc.id)}
                  onRead={() => setViewing(doc)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {viewing && (
        <DocViewerModal
          doc={viewing}
          canDownload={canEdit}
          categoryLabel={(DEFAULT_CATEGORIES.find(c => c.id === viewing.category) || DEFAULT_CATEGORIES[0]).label}
          onClose={() => setViewing(null)}
        />
      )}

      {/* Modal: Add Document (Dual Mode: Direct File Upload to MEGA OR Paste Link) */}
      {isAddingDoc && (
        <div className="dia-bg" onClick={() => !isUploading && setIsAddingDoc(false)}>
          <div className="dia" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="dh">
              <h3>{addMode === 'upload' ? 'Upload File to Cloud Storage' : 'Attach Document or Cloud Link'}</h3>
              <button className="tb icn" disabled={isUploading} onClick={() => setIsAddingDoc(false)}>✕</button>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'var(--soft)', borderRadius: '8px', marginTop: '12px' }}>
              <button
                type="button"
                className={`tb ${addMode === 'upload' ? 'on' : ''}`}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setAddMode('upload')}
              >
                <Upload size={15} />
                <span>Upload File (Cloud Storage)</span>
              </button>
              <button
                type="button"
                className={`tb ${addMode === 'link' ? 'on' : ''}`}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setAddMode('link')}
              >
                <LinkIcon size={15} />
                <span>Paste Cloud Link</span>
              </button>
            </div>

            {uploadError && (
              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#B91C1C',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            {addMode === 'upload' ? (
              <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    Target Project
                  </label>
                  <select
                    value={selectedProject}
                    onChange={e => setSelectedProject(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  >
                    {visibleProjects.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Drag and drop / file selector box */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    Select File (max {MAX_UPLOAD_MB} MB) *
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--line)',
                      borderRadius: '10px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: selectedFile ? 'var(--accent-soft)' : 'var(--soft)',
                      borderColor: selectedFile ? 'var(--accent)' : 'var(--line)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_EXT.join(',')}
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          const ext = '.' + file.name.split('.').pop().toLowerCase();
                          if (!['.xlsx', '.xls', '.csv', '.pdf', '.docx', '.doc'].includes(ext)) {
                            setUploadError(`Invalid file format. Only BRD (.pdf, .docx) and Excel (.xlsx, .xls, .csv) are allowed.`);
                            setSelectedFile(null);
                            return;
                          }
                          setUploadError('');
                          setSelectedFile(file);
                          if (!form.title) {
                            setForm(f => ({ ...f, title: file.name.replace(/\.[^/.]+$/, '') }));
                          }
                        }
                      }}
                    />
                    <Upload size={28} color={selectedFile ? 'var(--accent)' : 'var(--muted)'} style={{ margin: '0 auto 8px' }} />
                    {selectedFile ? (
                      <div>
                        <strong style={{ color: 'var(--ink)', display: 'block', fontSize: '13.5px' }}>{selectedFile.name}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {(selectedFile.size / 1024).toFixed(1)} KB · Ready to upload
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)', display: 'block' }}>
                          Click to browse or drop file here
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          Strictly: BRD (.pdf, .docx) & Excel (.xlsx, .xls, .csv) only
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    Type / Category
                  </label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  >
                    <option value="brd">BRD & Specs</option>
                    <option value="excel">Excel & Trackers</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    Notes (Optional)
                  </label>
                  <textarea
                    placeholder="Brief description or instructions for the team..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="tb" disabled={isUploading} onClick={() => setIsAddingDoc(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="tb on" disabled={isUploading || !selectedFile} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isUploading ? (
                      <>
                        <span className="spinner" style={{ width: '14px', height: '14px' }}></span>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>Upload File</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddLink} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    Target Project
                  </label>
                  <select
                    value={selectedProject}
                    onChange={e => setSelectedProject(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  >
                    {visibleProjects.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    Document / Sheet Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Project BRD v1.0 or Master Excel Tracker"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    Document URL / Cloud Link *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://sharepoint.com/... or https://drive.google.com/..."
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    Folder / Category
                  </label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  >
                    {DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    Notes / Brief Description (Optional)
                  </label>
                  <textarea
                    placeholder="Any access instructions or details for the team..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="tb" onClick={() => setIsAddingDoc(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="tb on">
                    Save Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

