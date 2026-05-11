import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAQ48D6o7kr-JgifJTwKhWx45zWoHlleZQ",
    authDomain: "aether-1a555.firebaseapp.com",
    projectId: "aether-1a555",
    storageBucket: "aether-1a555.firebasestorage.app",
    messagingSenderId: "798141171445",
    appId: "1:798141171445:web:ba604aee38141e14d727bc",
    measurementId: "G-707FP0H10M"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let activeChatId = null;

// Элементы
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');

// Auth Logic
document.getElementById('btn-register').onclick = async () => {
    const name = document.getElementById('auth-name').value;
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if (!name || !email || !pass) return alert("Заполни все поля");
    
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: name });
    } catch (e) { alert(e.message); }
};

document.getElementById('btn-login').onclick = () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    signInWithEmailAndPassword(auth, email, pass).catch(e => alert(e.message));
};

document.getElementById('btn-logout').onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        document.getElementById('current-user-name').innerText = user.displayName || user.email;
        loadChats();
    } else {
        authScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
    }
});

// Chat Logic
async function loadChats() {
    const q = query(collection(db, "chats"), where("users", "array-contains", currentUser.email));
    onSnapshot(q, (snap) => {
        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            const other = data.users.find(u => u !== currentUser.email);
            const item = document.createElement('div');
            item.className = 'chat-item';
            item.innerHTML = `<strong>${other}</strong><br><small>${data.lastMessage || ''}</small>`;
            item.onclick = () => openChat(doc.id, other);
            chatList.appendChild(item);
        });
    });
}

function openChat(id, name) {
    activeChatId = id;
    appScreen.classList.add('chat-open');
    document.getElementById('active-chat').classList.remove('hidden');
    document.getElementById('no-chat-selected').classList.add('hidden');
    document.getElementById('chat-with-name').innerText = name;

    const q = query(collection(db, "chats", id, "messages"), orderBy("timestamp", "asc"));
    onSnapshot(q, (snap) => {
        const container = document.getElementById('messages-container');
        container.innerHTML = '';
        snap.forEach(mDoc => {
            const m = mDoc.data();
            const div = document.createElement('div');
            div.className = `msg ${m.senderId === currentUser.uid ? 'sent' : 'received'}`;
            div.innerText = m.text;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}

document.getElementById('message-form').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('message-input');
    if (!input.value || !activeChatId) return;
    
    const text = input.value;
    input.value = '';
    await addDoc(collection(db, "chats", activeChatId, "messages"), {
        text,
        senderId: currentUser.uid,
        timestamp: serverTimestamp()
    });
};

document.getElementById('btn-back').onclick = () => appScreen.classList.remove('chat-open');

document.getElementById('btn-create-chat').onclick = async () => {
    const email = prompt("Email собеседника:");
    if (!email || email === currentUser.email) return;
    await addDoc(collection(db, "chats"), {
        users: [currentUser.email, email],
        lastMessage: "Новый чат",
        timestamp: serverTimestamp()
    });
};
