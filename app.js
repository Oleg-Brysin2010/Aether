import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let unsubscribeMessages = null; // Для очистки старых подписок

// --- ЛОГИКА ВХОДА ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        loadChats();
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
    }
});

// --- СОЗДАНИЕ ЧАТА ---
document.getElementById('btn-create-chat').onclick = async () => {
    const email = prompt("Введите Email друга:");
    if (!email || email === currentUser.email) return;

    const chatId = [currentUser.email, email].sort().join('_').replace(/\./g, ',');
    
    await setDoc(doc(db, "chats", chatId), {
        users: [currentUser.email, email],
        lastTimestamp: serverTimestamp()
    }, { merge: true });
    
    alert("Чат создан! Выберите его в списке.");
};

// --- ЗАГРУЗКА СПИСКА ЧАТОВ ---
function loadChats() {
    const q = query(collection(db, "chats"), where("users", "array-contains", currentUser.email));
    onSnapshot(q, (snap) => {
        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = '';
        snap.forEach(d => {
            const data = d.data();
            const friendEmail = data.users.find(u => u !== currentUser.email);
            const item = document.createElement('div');
            item.className = 'chat-item';
            item.innerHTML = `<strong>${friendEmail}</strong>`;
            item.onclick = () => openChat(d.id, friendEmail);
            chatList.appendChild(item);
        });
    });
}

// --- ОТКРЫТИЕ ЧАТА ---
function openChat(id, name) {
    activeChatId = id;
    document.getElementById('app-screen').classList.add('chat-open');
    document.getElementById('active-chat').classList.remove('hidden');
    document.getElementById('no-chat-selected').classList.add('hidden');
    document.getElementById('chat-with-name').innerText = name;

    // Отписываемся от сообщений предыдущего чата, если он был открыт
    if (unsubscribeMessages) unsubscribeMessages();

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
        container.scrollTop = container.scrollHeight; // Авто-скролл вниз
    });
}

// --- ОТПРАВКА СООБЩЕНИЯ ---
document.getElementById('message-form').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const text = input.value.trim();

    if (!text || !activeChatId) return;

    input.value = ''; // Очищаем сразу для скорости

    try {
        await addDoc(collection(db, "chats", activeChatId, "messages"), {
            text: text,
            sender: currentUser.email,
            timestamp: serverTimestamp()
        });
    } catch (err) {
        console.error("Ошибка отправки:", err);
    }
};

// Кнопка Назад
document.getElementById('btn-back').onclick = () => {
    document.getElementById('app-screen').classList.remove('chat-open');
};
