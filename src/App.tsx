import React, { useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { 
  Upload, 
  File, 
  CheckCircle, 
  Copy, 
  RefreshCw,
  Download,
  FolderUp,
  XCircle,
  Share2,
  Clock,
  Sparkles
} from 'lucide-react'

import process from 'process';
window.process = process;

const API_URL = ' ';

interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setError('')
      setShareUrl('')
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      setFile(dropped)
      setError('')
      setShareUrl('')
    }
  }, [])

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      })

      const data: UploadResponse = await res.json()
      
      if (data.success && data.url) {
        setShareUrl(data.url)
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch (err) {
      setError('Upload failed - server might be down')
    } finally {
      setUploading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 p-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-3 rounded-2xl">
              <Share2 className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
            FileShare
          </h1>
          <p className="text-gray-400 text-center mb-8 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Drop any file • Share instantly
            <Sparkles className="w-4 h-4 text-blue-400" />
          </p>

          {!shareUrl ? (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-600 rounded-xl p-8 mb-6 text-center hover:border-purple-400 transition-colors cursor-pointer group"
              >
                <input
                  type="file"
                  id="file-input"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <div className="mb-3 flex justify-center">
                    <div className="p-4 bg-gray-700/50 rounded-full group-hover:bg-purple-500/20 transition-all">
                      {file ? (
                        <File className="w-10 h-10 text-purple-400" />
                      ) : (
                        <FolderUp className="w-10 h-10 text-gray-400 group-hover:text-purple-400 transition-colors" />
                      )}
                    </div>
                  </div>
                  <p className="text-gray-300 mb-1">
                    {file ? file.name : 'Drop or click to upload'}
                  </p>
                  {file && (
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4 justify-center bg-red-400/10 p-3 rounded-lg">
                  <XCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                  !file || uploading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 hover:shadow-lg hover:shadow-purple-500/25'
                }`}
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload & Share
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-500/20 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
              </div>
              <p className="text-gray-300 mb-4 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Your file is ready to share!
                <Sparkles className="w-4 h-4 text-blue-400" />
              </p>
              
              <div className="bg-gray-900/50 rounded-lg p-4 mb-4 break-all border border-gray-700">
                <p className="text-sm text-blue-400 mb-2 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download link:
                </p>
                <a 
                  href={shareUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline break-all flex items-center justify-center gap-1"
                >
                  {shareUrl}
                  <Download className="w-4 h-4 inline-block ml-1" />
                </a>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy Link
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setFile(null)
                    setShareUrl('')
                  }}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Upload Another
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center mt-6 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            Any file type accepted • Files auto-delete after 24h
          </p>
        </div>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
