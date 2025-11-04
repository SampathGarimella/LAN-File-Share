// Home page navigation
document.addEventListener('DOMContentLoaded', () => {
    const textChoice = document.getElementById('text-choice');
    const fileChoice = document.getElementById('file-choice');
    
    textChoice.addEventListener('click', (e) => {
        e.preventDefault();
        // Generate a new unique ID and navigate to text page
        window.location.href = '/text';
    });
    
    fileChoice.addEventListener('click', (e) => {
        e.preventDefault();
        // Navigate to file page
        window.location.href = '/file';
    });
});

