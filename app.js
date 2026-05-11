import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let currentUser = null;
let activeChatId = null;
let unsubscribeMessages = null;
let typingTimeout = null;

// СТАТУС В СЕТИ
const updateStatus = (state) => {
    if (!currentUser) return;
    setDoc(doc(db, "status", currentUser.email.replace(/\./g, ',')), {
        state: state,
        last_changed: serverTimestamp()
    }, { merge: true });
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        updateStatus("online");
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        loadChats();
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
    }
});

window.addEventListener('beforeunload', () => updateStatus("offline"));

// СОЗДАНИЕ ЧАТА
document.getElementById('btn-create-chat').onclick = async () => {
    const email = prompt("Email друга:");
    if (!email || email === currentUser.email) return;
    const chatId = [currentUser.email, email].sort().join('_').replace(/\./g, ',');
    await setDoc(doc(db, "chats", chatId), {
        users: [currentUser.email, email],
        lastTimestamp: serverTimestamp()
    }, { merge: true });
};

// СПИСОК ЧАТОВ С ЗЕЛЕНЫМИ КРУЖКАМИ
function loadChats() {
    const q = query(collection(db, "chats"), where("users", "array-contains", currentUser.email));
    onSnapshot(q, (snap) => {
        const list = document.getElementById('chat-list');
        list.innerHTML = '';
        snap.forEach(d => {
            const friend = d.data().users.find(u => u !== currentUser.email);
            const friendId = friend.replace(/\./g, ',');
            const item = document.createElement('div');
            item.className = 'chat-item';
            item.innerHTML = `
                <div class="chat-item-content">
                    <div id="dot-${friendId}" class="status-dot"></div>
                    <strong>${friend}</strong>
                </div>`;
            item.onclick = () => openChat(d.id, friend);
            list.appendChild(item);

            onSnapshot(doc(db, "status", friendId), (sDoc) => {
                const dot = document.getElementById(`dot-${friendId}`);
                if (dot) dot.style.background = sDoc.data()?.state === "online" ? "#2ecc71" : "#95a5a6";
            });
        });
    });
}

// ОТКРЫТИЕ ЧАТА И ПЕЧАТЬ
function openChat(id, name) {
    activeChatId = id;
    document.getElementById('app-screen').classList.add('chat-open');
    document.getElementById('chat-with-name').innerText = name;

    if (unsubscribeMessages) unsubscribeMessages();

    // Слушаем "Печатает..."
    onSnapshot(collection(db, "chats", id, "typing"), (snap) => {
        let typing = false;
        snap.forEach(t => {
            if (t.id !== currentUser.email.replace(/\./g, ',') && t.data().isTyping) typing = true;
        });
        document.getElementById('typing-indicator').innerText = typing ? "печатает..." : "";
    });

    const q = query(collection(db, "chats", id, "messages"), orderBy("timestamp", "asc"));
    unsubscribeMessages = onSnapshot(q, (snap) => {
        const container = document.getElementById('messages-container');
        container.innerHTML = '';
        snap.forEach(mDoc => {
            const m = mDoc.data();
            const div = document.createElement('div');
            div.className = `msg ${m.sender === currentUser.email ? 'sent' : 'received'}`;
            div.innerText = m.text;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}

// ВВОД И АВТО-ЭМОДЗИ
document.getElementById('message-input').oninput = () => {
    if (!activeChatId) return;
    setDoc(doc(db, "chats", activeChatId, "typing", currentUser.email.replace(/\./g, ',')), { isTyping: true });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        setDoc(doc(db, "chats", activeChatId, "typing", currentUser.email.replace(/\./g, ',')), { isTyping: false });
    }, 2000);
};

document.getElementById('message-form').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('message-input');
    let text = input.value.trim();
    if (!text || !activeChatId) return;

    text = text.replace(':)', '😊').replace('<3', '❤️').replace(':(', '😟');
    input.value = '';

    await addDoc(collection(db, "chats", activeChatId, "messages"), {
        text: text,
        sender: currentUser.email,
        timestamp: serverTimestamp()
    });
    setDoc(doc(db, "chats", activeChatId, "typing", currentUser.email.replace(/\./g, ',')), { isTyping: false });
};

document.getElementById('btn-back').onclick = () => {
    document.getElementById('app-screen').classList.remove('chat-open');
};
