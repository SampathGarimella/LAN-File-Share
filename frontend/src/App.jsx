import React, { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode.react'

function normalizeBaseUrl(url) {
  if (!url) return ''
  return url.replace(/\/+$/, '')
}

export default function App() {
  const queryApi = new URLSearchParams(window.location.search).get('api')
  const defaultApi = normalizeBaseUrl(queryApi || import.meta.env.VITE_API_URL || '')
  const hasDefaultApi = Boolean(defaultApi)
  const [backendUrl, setBackendUrl] = useState('')
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [shareLink, setShareLink] = useState('')
  const [error, setError] = useState('')
  const [showQR, setShowQR] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('lan_share_api_url')
    setBackendUrl(normalizeBaseUrl(saved || defaultApi))
  }, [defaultApi])

  const canUpload = useMemo(() => !!backendUrl && !!file && !isUploading, [backendUrl, file, isUploading])

  async function saveBackendUrl() {
    const url = normalizeBaseUrl(backendUrl)
    setBackendUrl(url)
    localStorage.setItem('lan_share_api_url', url)
  }

  function onFileChange(e) {
    setFile(e.target.files?.[0] || null)
    setShareLink('')
    setError('')
    setProgress(0)
  }

  function copyLink() {
    if (!shareLink) return
    navigator.clipboard?.writeText(shareLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }

  async function upload() {
    if (!file) return
    if (!backendUrl) {
      setError('Please set Backend URL (e.g., http://192.168.1.10:3000)')
      return
    }
    setIsUploading(true)
    setError('')
    setProgress(0)
    setShareLink('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${backendUrl}/upload`)
        xhr.responseType = 'json'
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const percent = Math.round((evt.loaded / evt.total) * 100)
            setProgress(percent)
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = xhr.response || JSON.parse(xhr.responseText || '{}')
            if (data?.shareUrl) {
              setShareLink(data.shareUrl)
              setProgress(100)
              resolve()
            } else {
              reject(new Error('Invalid server response'))
            }
          } else {
            reject(new Error(`Upload failed (${xhr.status})`))
          }
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(formData)
      })
    } catch (err) {
      console.error(err)
      setError('Local server not reachable — connect to same Wi‑Fi and verify Backend URL.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>LAN File Share</h1>
        <div style={{ color: '#6b7280' }}>Share large files over your local network</div>
      </header>

      <section className="card">
        {!hasDefaultApi && (
          <div className="row" style={{ marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Backend URL (e.g., http://192.168.1.10:3000)"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveBackendUrl() }}
            />
            <button onClick={saveBackendUrl} className="ghost">Save</button>
          </div>
        )}
        <input type="file" onChange={onFileChange} />
        <div className="row" style={{ marginTop: 10 }}>
          <button onClick={upload} disabled={!canUpload}>
            {isUploading ? 'Uploading…' : 'Upload'}
          </button>
          <button className="ghost" onClick={() => setShowQR((v) => !v)}>
            {showQR ? 'Hide QR' : 'Show QR'}
          </button>
        </div>
        {isUploading && (
          <div className="progress">
            <div style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <div className="notice" style={{ color: '#ef4444' }}>{error}</div>}
      </section>

      {shareLink && (
        <section className="card">
          <div className="link-row">
            <a className="link" href={shareLink} target="_blank" rel="noreferrer">{shareLink}</a>
            <button onClick={copyLink}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <div className="notice">Expires in 24 hours</div>
          {showQR && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
              <QRCode value={shareLink} size={192} includeMargin />
            </div>
          )}
        </section>
      )}

      <footer className="footer">
        Powered by Local Network
      </footer>
    </div>
  )
}


