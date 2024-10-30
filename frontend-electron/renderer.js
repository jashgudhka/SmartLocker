const axios = require('axios');
const { ipcRenderer } = require('electron');
    
const BASE_URL = 'http://localhost:3000';

// Select DOM elements
const uploadSection = document.getElementById('upload-section');
const receiveSection = document.getElementById('receive-section');
const uploadBtn = document.getElementById('upload-btn');
const receiveBtn = document.getElementById('receive-btn')
const fileUpload = document.getElementById('file-upload');
const fileList = document.getElementById('file-list');

let authToken = null;

ipcRenderer.on('user-inactive', () => {
    alert('User has been inactive for 10 minutes. \nLog in again.');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    uploadSection.style.display = 'none';
    receiveSection.style.display = 'none';
    logoutBtn.style.display = 'none';
});

uploadBtn.addEventListener('click', async () => {
    const receivers = document.getElementById('receivers').value.split(',');
    const files = fileUpload.files;
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    formData.append('receivers', JSON.stringify(receivers));

    try {
        const response = await axios.post(`${BASE_URL}/upload`, formData, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        alert('Files uploaded successfully!');
    } catch (error) {
        alert('File upload failed! ' + error.response.data.msg);
    }
});

receiveBtn.addEventListener('click', async () => {
    try {
        const response = await axios.post(`${BASE_URL}/receive`, {}, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        fileList.innerHTML = ''; // Clear existing list
        const files = response.data.files;
        files.forEach(file => {
            const listItem = document.createElement('li');
            listItem.textContent = file.filename;
            fileList.appendChild(listItem);
            
            // Add download functionality
            listItem.addEventListener('click', async () => {
                const downloadLink = document.createElement('a');
                downloadLink.href = `${BASE_URL}/download/${file.filename}`;
                downloadLink.download = file.filename;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            });
        });
    } catch (error) {
        alert('Failed to receive files! ' + error.response.data.msg);
    }
});
