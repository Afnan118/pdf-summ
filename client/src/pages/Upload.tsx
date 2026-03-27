import { useState, useCallback } from "react";

export default function Upload() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle'|'uploading'|'success'|'error'>('idle');

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
      setUploadProgress('idle');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
      setUploadProgress('idle');
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress('uploading');

    try {
      // For now, we upload sequentially or just the first file as a demo
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      // Send to our Express backend
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      const data = await res.json();
      console.log('Upload success:', data);
      setUploadProgress('success');
      
      // Optional: Clear files after a delay
      setTimeout(() => {
        setFiles([]);
        setUploadProgress('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress('error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Upload Documents</h1>
      <p className="text-muted-foreground mb-8">Add PDF or TXT files to your knowledge base.</p>

      <div 
        className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="p-4 bg-muted rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
        </div>
        <p className="text-lg font-medium mb-1">Drag and drop your files here</p>
        <p className="text-sm text-muted-foreground mb-6">Support for PDF, TXT (Max 10MB)</p>
        
        <label className="cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 px-6 py-2 rounded-md font-medium transition-colors">
          Browse Files
          <input type="file" className="hidden" multiple accept=".pdf,.txt" onChange={handleFileChange} />
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-8 border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 border-b font-medium">Selected Files</div>
          <ul className="divide-y">
            {files.map((file, i) => (
              <li key={i} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </li>
            ))}
          </ul>
          <div className="p-4 bg-muted/50 border-t flex items-center justify-between">
            <div>
              {uploadProgress === 'success' && <span className="text-sm text-green-600 font-medium flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Upload complete!</span>}
              {uploadProgress === 'error' && <span className="text-sm text-destructive font-medium">Upload failed. Check logs.</span>}
            </div>
            <button 
              onClick={handleUpload} 
              disabled={isUploading}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                  Uploading...
                </>
              ) : (
                `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
