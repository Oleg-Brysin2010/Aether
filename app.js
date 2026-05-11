import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, getDocs, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQ48D6o7kr-JgifJTwKhWx45zWoHlleZQ",
  authDomain: "aether-1a555.firebaseapp.com",
  projectId: "aether-1a555",
  storageBucket: "aether-1a555.firebasestorage.app",
  messagingSenderId: "798141171445",
  appId: "1:798141171445:web:ba604aee38141e14d727bc"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI Elements
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const messagesContainer = document.getElementById('messages-container');
let currentChatId = null;

// --- AUTH LOGIC ---
document.getElementById('btn-register').onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: email.split('@')[0] });
    } catch (e) { alert(e.message); }
};

document.getElementById('btn-login').onclick = () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    signInWithEmailAndPassword(auth, email, pass).catch(e => alert(e.message));
};

document.getElementById('btn-logout').onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    if (user) {
        authScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        document.getElementById('user-display').innerText = user.displayName;
        loadChats();
    } else {
        authScreen.classList.remove('hidden');
        chatScreen.classList.add('hidden');
    }
});

// --- CHAT LOGIC ---
document.getElementById('btn-create-chat').onclick = async () => {
    const email = prompt("Введите email собеседника:");
    if (!email || email === auth.currentUser.email) return;

    const q = query(collection(db, "chats"), where("participants", "array-contains", auth.currentUser.email));
    const snap = await getDocs(q);
    const exists = snap.docs.some(d => d.data().participants.includes(email));

    if (!exists) {
        await addDoc(collection(db, "chats"), {
            participants: [auth.currentUser.email, email],
            lastMsg: "",
            time: serverTimestamp()
        });
    }
};

function loadChats() {
    const q = query(collection(db, "chats"), where("participants", "array-contains", auth.currentUser.email));
    onSnapshot(q, (snap) => {
        const list = document.getElementById('chats-list');
        list.innerHTML = "";
        snap.forEach(doc => {
            const data = doc.data();
            const otherUser = data.participants.find(p => p !== auth.currentUser.email);
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `<strong>${otherUser}</strong><p>${data.lastMsg}</p>`;
            div.onclick = () => openChat(doc.id, otherUser);
            list.appendChild(div);
        });
    });
}

function openChat(id, title) {
    currentChatId = id;
    document.getElementById('chat-title').innerText = title;
    messagesContainer.innerHTML = "";
    
    const q = query(collection(db, `chats/${id}/messages`), orderBy("time", "asc"));
    onSnapshot(q, (snap) => {
        messagesContainer.innerHTML = "";
        snap.forEach(m => {
            const d = m.data();
            const div = document.createElement('div');
            div.className = `msg ${d.sender === auth.currentUser.email ? 'own' : 'other'}`;
            div.innerText = d.text;
            messagesContainer.appendChild(div);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

document.getElementById('btn-send').onclick = sendMessage;
document.getElementById('msg-input').onkeypress = (e) => e.key === 'Enter' && sendMessage();

async function sendMessage() {
    const input = document.getElementById('msg-input');
    if (!input.value || !currentChatId) return;

    const text = input.value;
    input.value = "";
    
    await addDoc(collection(db, `chats/${currentChatId}/messages`), {
        text,
        sender: auth.currentUser.email,
        time: serverTimestamp()
    });
}
