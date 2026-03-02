const express = require('express')
const multer = require('multer')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { nanoid } = require('nanoid')
const sqlite3 = require('sqlite3').verbose()
const { open } = require('sqlite')

const app = express()
const PORT = 3000
let db

async function initializeDB() {
  db = await open({
    filename: path.join(__dirname, 'files.db'),
    driver: sqlite3.Database
  })

  await db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      upload_date INTEGER NOT NULL,
      expiry_date INTEGER NOT NULL,
      size INTEGER NOT NULL,
      mime_type TEXT
    )
  `)

  await cleanupExpiredFiles()
    setInterval(cleanupExpiredFiles, 60 * 60 * 1000)  
  console.log('Database initialized successfully')
}

const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const id = nanoid(10)
    const ext = path.extname(file.originalname)
    cb(null, id + ext)
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1gb limit
})

app.use(cors())
app.use(express.json())
app.use('/files', express.static(uploadDir))

// Get file info endpoint
app.get('/file/:id', async (req, res) => {
  try {
    const file = await db.get(
      'SELECT id, filename, upload_date, expiry_date, size FROM files WHERE id = ?',
      req.params.id
    )
    
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' })
    }
    
    res.json({ success: true, file })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get file info' })
  }
})

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }
    
    const protocol = req.protocol
    const host = req.get('host')
    const baseUrl = `${protocol}://${host}`
    const fileId = path.basename(req.file.filename, path.extname(req.file.filename))
    const fileUrl = `${baseUrl}/files/${req.file.filename}`
    const now = Date.now()
    const expiryDate = now + (720 * 60 * 60 * 1000) // 720 hours (30 days) from now
    
    await db.run(
      'INSERT INTO files (id, filename, stored_filename, upload_date, expiry_date, size, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [fileId, req.file.originalname, req.file.filename, now, expiryDate, req.file.size, req.file.mimetype]
    )

    setTimeout(async () => {
      await deleteFile(req.file.filename, fileId)
    }, 24 * 60 * 60 * 1000)

    res.json({ 
      success: true, 
      url: fileUrl,
      fileId: fileId,
      filename: req.file.originalname,
      expiresIn: '24 hours'
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ success: false, error: 'Upload failed' })
  }
})

async function deleteFile(storedFilename, fileId) {
  try {
    const filePath = path.join(uploadDir, storedFilename)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    
    await db.run('DELETE FROM files WHERE id = ?', fileId)
    console.log(`Deleted expired file: ${storedFilename}`)
  } catch (error) {
    console.error('Failed to delete file:', error)
  }
}

async function cleanupExpiredFiles() {
  try {
    const now = Date.now()    
    const expiredFiles = await db.all(
      'SELECT id, stored_filename FROM files WHERE expiry_date <= ?',
      now
    )
    
    for (const file of expiredFiles) {
      await deleteFile(file.stored_filename, file.id)
    }
    
    if (expiredFiles.length > 0) {
      console.log(`Cleaned up ${expiredFiles.length} expired files`)
    }
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

initializeDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
})
