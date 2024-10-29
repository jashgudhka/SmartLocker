const { ipcRenderer } = require('electron');
const container = F.G.id('container');
const registerBtn = F.G.id('register');
const loginBtn = F.G.id('login');

registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

class login {
    constructor() {
        this.loginBtn = F.G.id("lBtn")
        this.regBtn = F.G.id("sBtn")
        F.l("click", this.loginBtn, async () => { this.login() })
        F.l("click", this.regBtn, async () => { this.signUp() })
    }

    async login() {
        var email = F.G.id('lEmail').value,
            password = F.G.id('lPass').value,
            result = await ipcRenderer.invoke('login', { email, password })
        if (!result.success) {
            alert("Invalid Login Credentials.")
        }
    }

    async signUp() {
        var email = F.G.id('sEmail').value,
            password = F.G.id('sPass').value,
            result = await ipcRenderer.invoke('signup', { email, password })
        if (result.success) {
            alert("Invalid Login Credentials")
        }
    }
}
new login