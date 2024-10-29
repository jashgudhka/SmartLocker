const axios = require('axios');
const { ipcRenderer } = require('electron');

    
// Base URL for your backend
const BASE_URL = 'http://localhost:3000';

// Select DOM elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const uploadSection = document.getElementById('upload-section');
const receiveSection = document.getElementById('receive-section');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const uploadBtn = document.getElementById('upload-btn');
const receiveBtn = document.getElementById('receive-btn');
const fileUpload = document.getElementById('file-upload');
const fileList = document.getElementById('file-list');
const logoutBtn = document.getElementById('logout-btn');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');

let authToken = null;

// Switch to signup form
showSignup.addEventListener('click', () => {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
});

// Switch to login form
showLogin.addEventListener('click', () => {
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
});

ipcRenderer.on('user-inactive', () => {
    alert('User has been inactive for 10 minutes.');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    uploadSection.style.display = 'none';
    receiveSection.style.display = 'none';
    logoutBtn.style.display = 'none';
});

// Signup functionality
signupBtn.addEventListener('click', async () => {
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    try {
        const response = await axios.post(`${BASE_URL}/signup`, { username, password });
        alert('Signup successful!');

        // Switch to login form
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    } catch (error) {
        alert('Signup failed! ' + error.response.data.msg);
    }
});

// Login functionality
loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await axios.post(`${BASE_URL}/login`, { username, password });
        authToken = response.data.accessToken;
        alert('Login successful!');

        // Show upload and receive sections, hide login form
        loginForm.style.display = 'none';
        uploadSection.style.display = 'block';
        receiveSection.style.display = 'block';
        logoutBtn.style.display = 'inline-block'; // Show logout button
    } catch (error) {
        alert('Login failed! ' + error.response.data.msg);
    }
});

// Upload functionality
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

// Receive functionality
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

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    try {
        await axios.post(`${BASE_URL}/logout`, {}, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        alert('Logged out successfully!');
        
        // Reset the UI
        authToken = null;
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';

        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        uploadSection.style.display = 'none';
        receiveSection.style.display = 'none';
        logoutBtn.style.display = 'none'; // Hide logout button
    } catch (error) {
        alert('Logout failed! ' + error.response.data.msg);
    }
});
