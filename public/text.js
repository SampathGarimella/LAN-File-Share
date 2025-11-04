// Text page functionality
let noteId = null;
let notes = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Get note ID from URL or create new one
    const pathParts = window.location.pathname.split('/');
    noteId = pathParts[pathParts.length - 1] || null;
    
    const noteIdDisplay = document.getElementById('note-id-display');
    const textInput = document.getElementById('text-input');
    const addBtn = document.getElementById('add-text-btn');
    const notesContainer = document.getElementById('notes-container');
    
    // If no ID in URL, create a new note
    if (!noteId || noteId === 'text') {
        try {
            const response = await fetch('/api/text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: '' })
            });
            
            const data = await response.json();
            noteId = data.id;
            window.history.pushState({}, '', `/text/${noteId}`);
            noteIdDisplay.textContent = `ID: ${noteId.substring(0, 8)}...`;
        } catch (error) {
            console.error('Error creating note:', error);
            noteIdDisplay.textContent = 'Error';
        }
    } else {
        // Load existing note
        noteIdDisplay.textContent = `ID: ${noteId.substring(0, 8)}...`;
        await loadNote();
    }
    
    // Add text button handler
    addBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (text) {
            await addNote(text);
            textInput.value = '';
        }
    });
    
    // Auto-save on input (debounced)
    let saveTimeout;
    textInput.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveNote();
        }, 1000);
    });
    
    // Load note on page load if ID exists
    async function loadNote() {
        try {
            console.log('Loading note with ID:', noteId);
            const response = await fetch(`/api/text/${noteId}`);
            console.log('Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Note data loaded:', data);
                
                if (data.content && data.content.trim()) {
                    // Split by separator to get individual notes
                    // If content doesn't have separator, treat entire content as one note
                    const allNotes = data.content.includes('\n---\n') 
                        ? data.content.split('\n---\n').filter(n => n.trim())
                        : [data.content].filter(n => n.trim());
                    
                    notes = allNotes;
                    console.log('Notes array:', notes);
                    displayNotes();
                } else {
                    // If no content, show empty state
                    notes = [];
                    notesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No notes yet. Add your first note above!</p>';
                }
            } else if (response.status === 404) {
                // If note doesn't exist, it's okay - user can start adding notes
                notes = [];
                notesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">New note. Start adding notes above!</p>';
            } else {
                // Other error
                console.error('Error response:', response.status, response.statusText);
                notes = [];
                notesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Error loading note. You can still add new notes above!</p>';
            }
        } catch (error) {
            console.error('Error loading note:', error);
            notes = [];
            notesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Error loading note. Please try again.</p>';
        }
    }
    
    async function addNote(text) {
        notes.push(text);
        await saveNote();
        displayNotes();
    }
    
    async function saveNote() {
        if (!noteId) return;
        
        const content = notes.join('\n---\n');
        try {
            const response = await fetch(`/api/text/${noteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: content })
            });
            
            if (response.ok) {
                // Note saved successfully
                console.log('Note saved');
            } else {
                console.error('Error saving note:', response.status);
            }
        } catch (error) {
            console.error('Error saving note:', error);
        }
    }
    
    function displayNotes() {
        notesContainer.innerHTML = '';
        
        if (notes.length === 0) {
            notesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No notes yet. Add your first note above!</p>';
            return;
        }
        
        notes.forEach(note => {
            if (note && note.trim()) {
                const noteElement = document.createElement('div');
                noteElement.className = 'note-item';
                noteElement.textContent = note;
                notesContainer.appendChild(noteElement);
            }
        });
    }
});

