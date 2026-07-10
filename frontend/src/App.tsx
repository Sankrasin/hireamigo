import { useState, useRef, useEffect } from 'react'
import './index.css'

type TagCategory = 'Qualification' | 'Skill' | 'Domain' | 'Experience';

const PREDEFINED_TAGS = {
  Qualification: ['B.Tech Computer Science', 'M.Tech', 'MBA', 'BCA', 'MCA', 'B.Sc IT', 'Ph.D.', 'Any Engineering Degree', 'BBA', 'M.Sc Data Science'].sort((a, b) => a.localeCompare(b)),
  Skill: ['Python', 'React', 'FastAPI', 'Docker', 'PostgreSQL', 'TypeScript', 'SQL', 'AWS', 'JavaScript', 'Node.js', 'Go', 'C++', 'Java', 'Machine Learning', 'Data Analysis', 'Kubernetes'].sort((a, b) => a.localeCompare(b)),
  Domain: ['Full Stack Development', 'Data Science', 'AI/ML', 'Backend Development', 'Frontend Development', 'Cloud Computing', 'Cybersecurity', 'DevOps', 'Product Management'].sort((a, b) => a.localeCompare(b)),
  Experience: ['Fresher', 'Junior (1-2 years)', 'Mid-level (3-5 years)', 'Senior (5+ years)', 'Lead (8+ years)', 'Intern'].sort((a, b) => a.localeCompare(b))
};

interface JobTag {
  id: string;
  category: TagCategory;
  name: string;
  must_have: boolean;
}

interface CandidateResult {
  candidate_name: string;
  tag_score: number;
  semantic_score: number;
  final_score: number;
  resume_text: string;
  notes?: string;
  manualBucketId?: string;
}

interface Bucket {
  id: string;
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
}

export default function App() {
  const [jobDescription, setJobDescription] = useState('')
  const [tags, setTags] = useState<JobTag[]>([])
  const [newTagInputs, setNewTagInputs] = useState<Record<TagCategory, string>>({
    Qualification: '', Skill: '', Domain: '', Experience: ''
  })
  
  const [buckets, setBuckets] = useState<Bucket[]>([
    { id: '1', name: 'High', minScore: 70, maxScore: 100, color: 'var(--accent-success)' },
    { id: '2', name: 'Medium', minScore: 40, maxScore: 70, color: 'var(--accent-warning)' },
    { id: '3', name: 'Low', minScore: 0, maxScore: 40, color: 'var(--accent-danger)' }
  ])

  const [isBlindMode, setIsBlindMode] = useState(true)

  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<CandidateResult[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // states for the drag and drop stuff
  const [previewCandidate, setPreviewCandidate] = useState<CandidateResult | null>(null);
  const [draggedCandidate, setDraggedCandidate] = useState<string | null>(null);

  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);

  useEffect(() => {
    const wakeUpBackend = async () => {
      setIsWakingUp(true);
      const API_URL = import.meta.env.VITE_API_URL || 'https://sankrasin-hireamigo.hf.space';
      try {
        await fetch(`${API_URL}/`);
        setIsBackendReady(true);
      } catch (err) {
        console.error("Failed to wake up backend", err);
      } finally {
        setIsWakingUp(false);
      }
    };
    wakeUpBackend();
  }, []);

  const handleTagInputChange = (category: TagCategory, value: string) => {
    setNewTagInputs(prev => ({...prev, [category]: value}));
    if (PREDEFINED_TAGS[category].includes(value)) {
      addTag(category, value);
    }
  }

  const addTag = (category: TagCategory, value?: string) => {
    const val = (value || newTagInputs[category]).trim();
    if (!val) return;
    setTags(prev => {
      if (prev.some(t => t.category === category && t.name.toLowerCase() === val.toLowerCase())) return prev;
      return [...prev, { id: Math.random().toString(36).substr(2, 9), category, name: val, must_have: false }];
    });
    setNewTagInputs(prev => ({...prev, [category]: ''}));
  }

  const toggleMustHave = (id: string) => {
    setTags(tags.map(t => t.id === id ? { ...t, must_have: !t.must_have } : t));
  }

  const removeTag = (id: string) => {
    setTags(tags.filter(t => t.id !== id));
  }

  const addBucket = () => {
    setBuckets(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: 'New Bucket', 
      minScore: 0, 
      maxScore: 100, 
      color: '#ffffff' 
    }]);
  }

  const updateBucket = (id: string, field: keyof Bucket, value: string | number) => {
    setBuckets(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  }

  const removeBucket = (id: string) => {
    setBuckets(prev => prev.filter(b => b.id !== id));
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.pdf'))]);
    }
  }

  const handleProcess = async () => {
    if (files.length === 0) return alert("Upload resumes first.");
    if (buckets.length === 0) return alert("Please create at least one score bucket.");

    // check if buckets are valid
    const sortedBuckets = [...buckets].sort((a, b) => a.minScore - b.minScore);
    for (let i = 0; i < sortedBuckets.length; i++) {
      if (sortedBuckets[i].minScore >= sortedBuckets[i].maxScore) {
        return alert(`Bucket "${sortedBuckets[i].name}" has an invalid range (Min must be less than Max).`);
      }
      if (i > 0 && sortedBuckets[i].minScore < sortedBuckets[i - 1].maxScore) {
        return alert(`Error: Buckets overlap! "${sortedBuckets[i-1].name}" and "${sortedBuckets[i].name}" are overlapping.`);
      }
    }
    if (sortedBuckets[0].minScore !== 0) {
      return alert("Error: Buckets must start exactly at 0%.");
    }
    if (sortedBuckets[sortedBuckets.length - 1].maxScore !== 100) {
      return alert("Error: Buckets must end exactly at 100%.");
    }
    for (let i = 0; i < sortedBuckets.length - 1; i++) {
      if (sortedBuckets[i].maxScore !== sortedBuckets[i + 1].minScore) {
        return alert(`Error: Gap detected between "${sortedBuckets[i].name}" and "${sortedBuckets[i+1].name}".`);
      }
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('job_description', jobDescription);
      formData.append('tags', JSON.stringify(tags.map(t => ({ category: t.category, name: t.name, must_have: t.must_have }))));
      files.forEach(f => formData.append('files', f));
      
      // use the hf api url
      const API_URL = import.meta.env.VITE_API_URL || 'https://sankrasin-hireamigo.hf.space';
      const res = await fetch(`${API_URL}/api/v1/process`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Processing failed");
      setResults(await res.json());
    } catch (err) {
      console.error(err);
      alert("Error processing resumes");
    } finally {
      setIsProcessing(false);
    }
  }

  const exportBucketToCSV = (bucket: Bucket) => {
    const bucketResults = results.filter(r => 
      r.manualBucketId === bucket.id || 
      (!r.manualBucketId && r.final_score >= bucket.minScore && (bucket.maxScore === 100 ? r.final_score <= 100 : r.final_score < bucket.maxScore))
    );
    if (bucketResults.length === 0) return alert("No candidates in this bucket to export.");

    const headers = ["Candidate Name,Tag Score,Semantic Score,Final Score,Manually Overridden,Notes"];
    const rows = bucketResults.map(r => {
      const name = isBlindMode ? `Candidate #${results.findIndex(res => res.candidate_name === r.candidate_name) + 1}` : r.candidate_name;
      const overridden = r.manualBucketId ? "Yes" : "No";
      const note = r.notes ? `"${r.notes.replace(/"/g, '""')}"` : "";
      return `"${name}",${r.tag_score.toFixed(1)},${r.semantic_score.toFixed(1)},${r.final_score.toFixed(1)},"${overridden}",${note}`;
    });
    const csvContent = headers.concat(rows).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${bucket.name.replace(/\s+/g, '_')}_Candidates.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const updateCandidateNote = (name: string, note: string) => {
    setResults(prev => prev.map(r => r.candidate_name === name ? { ...r, notes: note } : r));
  }

  const handleCandidateDrop = (bucketId: string) => {
    if (!draggedCandidate) return;
    
    const targetBucket = buckets.find(b => b.id === bucketId);
    
    setResults(prev => prev.map(r => {
      if (r.candidate_name === draggedCandidate) {
        if (targetBucket && r.final_score >= targetBucket.minScore && (targetBucket.maxScore === 100 ? r.final_score <= 100 : r.final_score < targetBucket.maxScore)) {
          return { ...r, manualBucketId: undefined };
        }
        return { ...r, manualBucketId: bucketId };
      }
      return r;
    }));
    setDraggedCandidate(null);
  }

  const getPreviewFileUrl = (candidate_name: string) => {
    // match the backend name extraction
    const file = files.find(f => f.name.replace(".pdf", "").replace(/_/g, " ") === candidate_name);
    return file ? URL.createObjectURL(file) : null;
  }

  return (
    <div className="container" style={{ position: 'relative' }}>
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '4.5rem', marginBottom: '0.25rem', letterSpacing: '4px' }}>
          HIREAMIGO
        </h1>
        <p style={{ color: 'var(--text-light)', fontSize: '1.1rem', fontWeight: 500 }}>Stateless AI Resume Screening</p>
        
        {isWakingUp && (
          <div style={{ marginTop: '1rem', color: 'var(--accent-warning)', fontWeight: 'bold' }}>
            🟡 Waking up AI backend (this may take 1-2 mins)...
          </div>
        )}
        {isBackendReady && !isWakingUp && (
          <div style={{ marginTop: '1rem', color: 'var(--accent-success)', fontWeight: 'bold' }}>
            🟢 AI Backend Ready
          </div>
        )}
      </header>

      {results.length > 0 ? (
        <div className="vibrant-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>Analysis Results ({results.length} Candidates)</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                onClick={() => setIsBlindMode(!isBlindMode)} 
                style={{ 
                  background: isBlindMode ? 'var(--accent-neon)' : 'transparent', 
                  color: isBlindMode ? 'white' : 'var(--accent-neon)', 
                  border: '1px solid var(--accent-neon)', 
                  borderRadius: '4px', 
                  padding: '0.8rem 1.5rem', 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  boxShadow: isBlindMode ? '0 0 15px var(--accent-glow)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                {isBlindMode ? '🔒 Anti-Bias Mode: ON' : '🔓 Anti-Bias Mode: OFF'}
              </button>
              <button onClick={() => { setResults([]); setFiles([]); }} className="vibrant-btn">
                Scan More Resumes
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem', alignItems: 'stretch' }}>
            {buckets.map(bucket => (
              <div 
                key={bucket.id} 
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleCandidateDrop(bucket.id)}
                style={{ backgroundColor: 'var(--bg-input)', border: `1px solid ${bucket.color}`, borderRadius: '8px', padding: '1rem', boxShadow: `inset 0 0 15px ${bucket.color}22`, minHeight: '100px' }}
              >
                <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: bucket.color, borderBottom: `1px solid ${bucket.color}`, paddingBottom: '0.5rem', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px' }}>
                  <span>{bucket.name} ({bucket.minScore}% - {bucket.maxScore}%)</span>
                  <button onClick={() => exportBucketToCSV(bucket)} style={{ background: 'transparent', border: `1px solid ${bucket.color}`, color: bucket.color, padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    📥 CSV
                  </button>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {results
                    .filter(r => r.manualBucketId === bucket.id || (!r.manualBucketId && r.final_score >= bucket.minScore && (bucket.maxScore === 100 ? r.final_score <= 100 : r.final_score < bucket.maxScore)))
                    .map((r, i) => (
                    <div 
                      key={i} 
                      draggable
                      onDragStart={() => setDraggedCandidate(r.candidate_name)}
                      onClick={() => setPreviewCandidate(r)}
                      style={{ backgroundColor: 'var(--bg-card)', padding: '0.75rem', borderRadius: '6px', borderLeft: `4px solid ${bucket.color}`, cursor: 'grab', position: 'relative' }}
                    >
                      {r.manualBucketId && (
                        <div style={{ position: 'absolute', top: '-8px', right: '8px', background: 'var(--accent-warning)', color: 'white', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                          🖐️ Moved
                        </div>
                      )}
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem', transition: 'all 0.3s ease' }}>
                        {isBlindMode ? `Candidate #${results.findIndex(res => res.candidate_name === r.candidate_name) + 1}` : r.candidate_name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                        <span>Tags: {r.tag_score.toFixed(1)}</span>
                        <span>Semantic: {r.semantic_score.toFixed(1)}</span>
                      </div>
                      <div style={{ marginTop: '0.25rem', color: bucket.color, fontWeight: 700, fontSize: '1rem', textAlign: 'right' }}>
                        {r.final_score.toFixed(1)}%
                      </div>
                      
                      {/* HR Notes Area */}
                      <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }} onClick={e => e.stopPropagation()}>
                        <textarea 
                          value={r.notes || ''} 
                          onChange={e => updateCandidateNote(r.candidate_name, e.target.value)}
                          placeholder="Add private HR notes..."
                          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid transparent', color: 'var(--text-light)', fontSize: '0.75rem', borderRadius: '4px', padding: '0.25rem', minHeight: '30px', resize: 'vertical', outline: 'none', transition: 'all 0.2s ease' }}
                          onFocus={e => e.target.style.border = `1px solid ${bucket.color}`}
                          onBlur={e => e.target.style.border = '1px solid transparent'}
                        />
                      </div>
                    </div>
                  ))}
                  {results.filter(r => r.manualBucketId === bucket.id || (!r.manualBucketId && r.final_score >= bucket.minScore && (bucket.maxScore === 100 ? r.final_score <= 100 : r.final_score < bucket.maxScore))).length === 0 && (
                    <div style={{ color: 'var(--text-light)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>No candidates</div>
                  )}
                </div>
              </div>
            ))}
            {buckets.length === 0 && <div style={{ color: 'var(--text-light)' }}>No buckets configured. Please configure buckets to see results.</div>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          <div className="vibrant-card">
            <h2 style={{ marginBottom: '2rem' }}>1. Job Requirements</h2>
            
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: 'var(--text-light)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                JOB DESCRIPTION
              </label>
              <textarea 
                className="vibrant-input"
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                style={{ height: '180px', resize: 'vertical' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
                <label style={{ fontWeight: 600, color: 'var(--text-light)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                  KEY TAGS & REQUIREMENTS
                </label>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  <strong>MH</strong> = Must Have &nbsp;|&nbsp; <strong>NH</strong> = Nice to Have
                </span>
              </div>
              
              {(['Qualification', 'Skill', 'Domain', 'Experience'] as TagCategory[]).map(category => (
                <div key={category} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <input 
                      type="text" list={`list-${category}`}
                      className="vibrant-input"
                      value={newTagInputs[category]} onChange={e => handleTagInputChange(category, e.target.value)}
                      placeholder={`Add ${category}...`}
                      onKeyDown={e => e.key === 'Enter' && addTag(category)}
                    />
                    <datalist id={`list-${category}`}>
                      {PREDEFINED_TAGS[category].map(t => <option key={t} value={t} />)}
                    </datalist>
                    <button onClick={() => addTag(category)} className="vibrant-btn" style={{ padding: '0 2rem' }}>Add</button>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                    {tags.filter(t => t.category === category).map(tag => (
                      <div key={tag.id} className={`vibrant-tag ${tag.must_have ? 'must-have' : 'nice-to-have'}`}>
                        <span>{tag.name}</span>
                        <button 
                          onClick={() => toggleMustHave(tag.id)}
                          className={`vibrant-toggle ${tag.must_have ? 'mh' : 'nh'}`}
                          title="Toggle Must-Have"
                        >
                          {tag.must_have ? 'MH' : 'NH'}
                        </button>
                        <button 
                          onClick={() => removeTag(tag.id)} 
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'inherit', opacity: 0.6 }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="vibrant-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2>2. Custom Score Buckets</h2>
              <button onClick={addBucket} className="vibrant-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>+ Add Bucket</button>
            </div>
            
            <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Configure how candidates are sorted based on their AI score. Ensure your min/max ranges cover 0 to 100 without overlapping.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {buckets.map(bucket => (
                <div key={bucket.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Bucket Name</label>
                    <input type="text" value={bucket.name} onChange={e => updateBucket(bucket.id, 'name', e.target.value)} className="vibrant-input" style={{ padding: '0.5rem' }} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Min Score (%)</label>
                    <input type="number" value={bucket.minScore} onChange={e => updateBucket(bucket.id, 'minScore', parseInt(e.target.value) || 0)} className="vibrant-input" style={{ padding: '0.5rem' }} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Max Score (%)</label>
                    <input type="number" value={bucket.maxScore} onChange={e => updateBucket(bucket.id, 'maxScore', parseInt(e.target.value) || 0)} className="vibrant-input" style={{ padding: '0.5rem' }} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Color</label>
                    <input type="color" value={bucket.color.startsWith('var') ? '#E50914' : bucket.color} onChange={e => updateBucket(bucket.id, 'color', e.target.value)} style={{ height: '38px', width: '100%', cursor: 'pointer', background: 'none', border: 'none' }} />
                  </div>
                  
                  <button onClick={() => removeBucket(bucket.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', cursor: 'pointer', fontSize: '1.5rem', marginTop: '1rem', opacity: buckets.length > 1 ? 1 : 0.2 }} disabled={buckets.length <= 1}>×</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h2 style={{ paddingLeft: '1rem' }}>3. Analyze Resumes</h2>
            <div 
              className={`vibrant-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.8 }}>📄</div>
              <h3 style={{ marginBottom: '0.5rem' }}>Drag & drop resumes here</h3>
              <p style={{ color: 'var(--text-light)' }}>or click to browse PDF files</p>
              <input type="file" ref={fileInputRef} multiple accept=".pdf" style={{ display: 'none' }} onChange={e => {
                if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
              }} />
            </div>

            {files.length > 0 && (
              <div className="vibrant-card" style={{ padding: '1.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-light)', fontWeight: 600 }}>
                  <span>{files.length} files queued</span>
                  <button onClick={() => setFiles([])} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontWeight: 600 }}>
                    Clear All
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                      <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={files.length === 0 || isProcessing || buckets.length === 0}
              className="vibrant-btn"
              style={{ width: '100%', padding: '1.5rem', fontSize: '1.25rem', marginTop: 'auto', opacity: (files.length === 0 || buckets.length === 0) ? 0.5 : 1 }}
            >
              {isProcessing ? 'Analyzing Resumes...' : 'Run AI Analysis'}
            </button>
          </div>
        </div>
      )}

      {/* Slide-in Preview Panel */}
      {previewCandidate && (
        <>
          <div 
            onClick={() => setPreviewCandidate(null)} 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 999 }}
          />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '50vw', minWidth: '600px', backgroundColor: 'var(--bg-card)', zIndex: 1000, boxShadow: '-10px 0 30px rgba(0,0,0,0.8)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: 'var(--accent-neon)', margin: 0 }}>
                {isBlindMode ? `Candidate #${results.findIndex(res => res.candidate_name === previewCandidate.candidate_name) + 1}` : previewCandidate.candidate_name} Preview
              </h2>
              <button onClick={() => setPreviewCandidate(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', fontSize: '2rem', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>OVERALL SCORE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{previewCandidate.final_score.toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>TAG MATCH</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{previewCandidate.tag_score.toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>SEMANTIC MATCH</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{previewCandidate.semantic_score.toFixed(1)}%</div>
              </div>
            </div>

            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
              {getPreviewFileUrl(previewCandidate.candidate_name) ? (
                <iframe 
                  src={getPreviewFileUrl(previewCandidate.candidate_name)!} 
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: '4px' }}
                />
              ) : (
                <div style={{ padding: '2rem', backgroundColor: 'var(--bg-input)', borderRadius: '8px', color: 'var(--text-main)', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {previewCandidate.resume_text}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
