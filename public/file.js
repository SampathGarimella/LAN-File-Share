// File page functionality
let collectionId = null;
let uploadedFiles = [];

document.addEventListener('DOMContentLoaded', async () => {
    const fileIdDisplay = document.getElementById('file-id-display');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const uploadArea = document.getElementById('upload-area');
    const filesContainer = document.getElementById('files-container');
    
    // Get collection ID from URL or create new one
    const pathParts = window.location.pathname.split('/').filter(p => p);
    collectionId = pathParts[pathParts.length - 1] || null;
    
    console.log('Page loaded. Path parts:', pathParts, 'Collection ID:', collectionId);
    
    // If no ID in URL or ID is 'file', create a new collection
    if (!collectionId || collectionId === 'file') {
        console.log('Creating new file collection...');
        try {
            const response = await fetch('/api/file/collection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            collectionId = data.id;
            console.log('New collection created:', collectionId);
            window.history.pushState({}, '', `/file/${collectionId}`);
            fileIdDisplay.textContent = `ID: ${collectionId.substring(0, 8)}...`;
        } catch (error) {
            console.error('Error creating collection:', error);
            fileIdDisplay.textContent = 'Error';
            alert('Failed to create file collection. Please refresh the page.');
        }
    } else {
        // Load existing collection
        console.log('Loading existing collection:', collectionId);
        fileIdDisplay.textContent = `ID: ${collectionId.substring(0, 8)}...`;
        await loadFiles();
    }
    
    // Function to trigger file selection
    function triggerFileSelect() {
        // Reset the input to ensure change event fires on subsequent selections
        fileInput.value = '';
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            fileInput.click();
        });
    }
    
    // Browse button
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerFileSelect();
    });
    
    // Upload area click
    uploadArea.addEventListener('click', (e) => {
        // Don't trigger if clicking the button
        if (e.target !== browseBtn && !browseBtn.contains(e.target)) {
            triggerFileSelect();
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            // Create a copy of the FileList as an array since FileList is not a real array
            const files = Array.from(e.target.files);
            console.log(`Selected ${files.length} file(s):`, files.map(f => f.name));
            handleFiles(files);
            
            // Reset input after handling to allow selecting the same files again
            // Use setTimeout to ensure the event completes first
            setTimeout(() => {
                e.target.value = '';
            }, 50);
        }
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files);
        }
    });
    
    async function handleFiles(fileList) {
        if (!fileList || fileList.length === 0) {
            console.warn('No files to upload');
            return;
        }
        
        // Ensure we have an array
        const files = Array.isArray(fileList) ? fileList : Array.from(fileList);
        
        if (files.length === 0) {
            console.warn('No files to upload');
            return;
        }
        
        console.log(`Handling ${files.length} file(s):`, files.map(f => f.name));
        
        // Process files sequentially to avoid overwhelming the server
        for (let file of files) {
            await uploadFile(file);
        }
    }
    
    async function uploadFile(file) {
        // Ensure collectionId is set
        if (!collectionId || collectionId === 'file') {
            console.error('Collection ID not set, creating new collection...');
            try {
                const response = await fetch('/api/file/collection', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                collectionId = data.id;
                window.history.pushState({}, '', `/file/${collectionId}`);
                document.getElementById('file-id-display').textContent = `ID: ${collectionId.substring(0, 8)}...`;
                console.log('Created new collection for upload:', collectionId);
            } catch (error) {
                console.error('Error creating collection:', error);
                alert('Error: Failed to create file collection. Please refresh the page.');
                return;
            }
        }
        
        if (!file || !file.name) {
            console.error('Invalid file:', file);
            alert('Invalid file selected. Please try again.');
            return;
        }
        
        console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type, 'to collection:', collectionId);
        
        // Show upload progress (optional visual feedback)
        const uploadArea = document.getElementById('upload-area');
        const uploadText = uploadArea.querySelector('.upload-text');
        const originalText = uploadText.textContent;
        uploadText.textContent = `Uploading ${file.name}...`;
        uploadArea.style.opacity = '0.7';
        uploadArea.style.pointerEvents = 'none';
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`/api/file/collection/${collectionId}`, {
                method: 'POST',
                body: formData
            });
            
            console.log('Upload response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Upload error:', errorData);
                alert(`Error uploading file "${file.name}": ${errorData.error || response.statusText}`);
                uploadText.textContent = originalText;
                uploadArea.style.opacity = '1';
                uploadArea.style.pointerEvents = 'auto';
                return;
            }
            
            const data = await response.json();
            console.log('Upload successful:', data);
            
            // Add to uploadedFiles array and display immediately
            if (data.file) {
                uploadedFiles.push(data.file);
                displayFile(data.file);
            }

            // Remove empty-state message if present
            const noFilesMsg = filesContainer.querySelector('p');
            if (noFilesMsg && (noFilesMsg.textContent.includes('No files') || noFilesMsg.textContent.includes('New collection'))) {
                noFilesMsg.remove();
            }
            
            // Reset upload area
            uploadText.textContent = originalText;
            uploadArea.style.opacity = '1';
            uploadArea.style.pointerEvents = 'auto';
        } catch (error) {
            console.error('Error uploading file:', error);
            alert(`Error uploading file "${file.name}": ${error.message}. Please try again.`);
            uploadText.textContent = originalText;
            uploadArea.style.opacity = '1';
            uploadArea.style.pointerEvents = 'auto';
        }
    }
    
    async function loadFiles() {
        if (!collectionId || collectionId === 'file') return;
        
        try {
            console.log('Loading files for collection ID:', collectionId);
            const response = await fetch(`/api/file/collection/${collectionId}`);
            console.log('Response status:', response.status);
            
            if (response.ok) {
                const collectionData = await response.json();
                console.log('Collection data loaded:', collectionData);
                uploadedFiles = collectionData.files || [];
                displayAllFiles();
                
                // Show message if no files
                if (uploadedFiles.length === 0) {
                    filesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px; grid-column: 1 / -1;">No files uploaded yet. Upload files above!</p>';
                }
            } else if (response.status === 404) {
                // Collection doesn't exist yet - it will be created when first file is uploaded
                uploadedFiles = [];
                filesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px; grid-column: 1 / -1;">New collection. Upload files above to get started!</p>';
            } else {
                console.error('Error response:', response.status, response.statusText);
                filesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px; grid-column: 1 / -1;">Error loading files. Please try again.</p>';
            }
        } catch (error) {
            console.error('Error loading files:', error);
            filesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px; grid-column: 1 / -1;">Error loading files. Please try again.</p>';
        }
    }
    
    function displayAllFiles() {
        filesContainer.innerHTML = '';
        uploadedFiles.forEach(file => {
            displayFile(file);
        });
    }
    
    function displayFile(fileData) {
        // Check if file already displayed
        const existing = filesContainer.querySelector(`[data-file-id="${fileData.id}"]`);
        if (existing) return;
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.setAttribute('data-file-id', fileData.id);
        
        const icon = getFileIcon(fileData.mimetype);
        const size = formatFileSize(fileData.size);
        
        fileItem.innerHTML = `
            <div class="file-icon">${icon}</div>
            <div class="file-name">${fileData.originalName}</div>
            <div class="file-info">Size: ${size}</div>
            <button class="download-btn" onclick="downloadFile('${fileData.id}')">Download</button>
        `;
        
        filesContainer.appendChild(fileItem);
    }
    
    function getFileIcon(mimetype) {
        if (mimetype.startsWith('image/')) return '🖼️';
        if (mimetype.startsWith('video/')) return '🎥';
        if (mimetype.startsWith('audio/')) return '🎵';
        if (mimetype.includes('pdf')) return '📄';
        if (mimetype.includes('zip') || mimetype.includes('archive')) return '📦';
        return '📁';
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    // Make downloadFile available globally
    window.downloadFile = async (fileId) => {
        window.location.href = `/api/file/${collectionId}/download/${fileId}`;
    };
});

