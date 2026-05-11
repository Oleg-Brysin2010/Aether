import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// State
let currentUser = null;
let activeChatId = null;

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const chatListDiv = document.getElementById('chat-list');
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');

/* --- AUTH LOGIC --- */

document.getElementById('btn-register').onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const name = document.getElementById('auth-name').value;
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: name });
        // Создаем запись пользователя в БД
        await addDoc(collection(db, "users"), { uid: res.user.uid, email, displayName: name });
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
        document.getElementById('current-user-name').innerText = user.displayName;
        loadChatList();
    } else {
        authScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
    }
});

/* --- CHAT LOGIC --- */

document.getElementById('btn-create-chat').onclick = async () => {
    const email = prompt("Введите email собеседника:");
    if (!email || email === currentUser.email) return alert("Некорректный email");

    // Проверка на дубликат
    const q = query(collection(db, "chats"), where("users", "array-contains", currentUser.email));
    const snap = await getDocs(q);
    const exists = snap.docs.some(doc => doc.data().users.includes(email));

    if (exists) return alert("Чат уже существует");

    await addDoc(collection(db, "chats"), {
        users: [currentUser.email, email],
        lastMessage: "Чат создан",
        timestamp: serverTimestamp()
    });
};

function loadChatList() {
    const q = query(collection(db, "chats"), where("users", "array-contains", currentUser.email), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snap) => {
        chatListDiv.innerHTML = '';
        snap.forEach(docSnap => {
            const chat = docSnap.data();
            const otherUser = chat.users.find(u => u !== currentUser.email);
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `
                <strong>${otherUser}</strong>
                <p style="font-size: 0.8rem; opacity: 0.6">${chat.lastMessage}</p>
            `;
            div.onclick = () => openChat(docSnap.id, otherUser);
            chatListDiv.appendChild(div);
        });
    });
}

function openChat(chatId, otherUserName) {
    activeChatId = chatId;
    document.getElementById('no-chat-selected').classList.add('hidden');
    document.getElementById('active-chat').classList.remove('hidden');
    document.getElementById('chat-with-name').innerText = otherUserName;
    
    // Mobile UI toggle
    appScreen.classList.add('chat-open');

    // Load Messages
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    onSnapshot(q, (snap) => {
        messagesContainer.innerHTML = '';
        snap.forEach(mDoc => {
            const m = mDoc.data();
            const time = m.timestamp ? new Date(m.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...';
            const isMine = m.senderId === currentUser.uid;
            
            const mDiv = document.createElement('div');
            mDiv.className = `msg ${isMine ? 'sent' : 'received'}`;
            mDiv.innerHTML = `${m.text} <span class="msg-time">${time}</span>`;
            messagesContainer.appendChild(mDiv);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

messageForm.onsubmit = async (e) => {
    e.preventDefault();
    const text = document.getElementById('message-input').value;
    if (!text || !activeChatId) return;

    document.getElementById('message-input').value = '';
    
    // Сохраняем сообщение
    await addDoc(collection(db, "chats", activeChatId, "messages"), {
        text,
        senderId: currentUser.uid,
        timestamp: serverTimestamp()
    });

    // Обновляем последнее сообщение в чате
    // В продакшене лучше использовать doc(db, "chats", activeChatId)
};

// Back button for mobile
document.getElementById('btn-back').onclick = () => {
    appScreen.classList.remove('chat-open');
};
