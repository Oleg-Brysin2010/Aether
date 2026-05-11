import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    serverTimestamp, 
    doc, 
    setDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Твой конфиг
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

let activeChatId = null;
let currentUser = null;

// --- АВТОРИЗАЦИЯ ---

// Следим за состоянием входа
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('messenger-container').classList.remove('hidden');
        document.getElementById('current-user-email').innerText = user.email;
        loadChats();
    } else {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('messenger-container').classList.add('hidden');
    }
});

// Регистрация
document.getElementById('btn-register').onclick = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    createUserWithEmailAndPassword(auth, email, pass).catch(err => alert(err.message));
};

// Вход
document.getElementById('btn-login').onclick = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert(err.message));
};

// Выход
document.getElementById('btn-logout').onclick = () => signOut(auth);

// --- ЛОГИКА ЧАТОВ ---

// Создание нового чата
document.getElementById('btn-add-chat').onclick = async () => {
    const targetEmail = document.getElementById('new-chat-email').value.trim();
    if (!targetEmail || targetEmail === currentUser.email) return;

    // Простая проверка на существование чата (в продакшене лучше делать сложнее)
    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("participants", "array-contains", currentUser.email));
    const snap = await getDocs(q);
    
    let exists = false;
    snap.forEach(doc => {
        if (doc.data().participants.includes(targetEmail)) exists = true;
    });

    if (!exists) {
        await addDoc(collection(db, "chats"), {
            participants: [currentUser.email, targetEmail],
            createdAt: serverTimestamp()
        });
        document.getElementById('new-chat-email').value = '';
    } else {
        alert("Чат уже существует");
    }
};

// Загрузка списка чатов
function loadChats() {
    const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.email));
    
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('chats-list');
        list.innerHTML = '';
        snapshot.forEach(chatDoc => {
            const data = chatDoc.data();
            const otherUser = data.participants.find(p => p !== currentUser.email);
            
            const div = document.createElement('div');
            div.className = `chat-item ${activeChatId === chatDoc.id ? 'active' : ''}`;
            div.innerText = otherUser;
            div.onclick = () => openChat(chatDoc.id, otherUser);
            list.appendChild(div);
        });
    });
}

// Открытие конкретного чата
function openChat(chatId, title) {
    activeChatId = chatId;
    document.getElementById('active-chat-name').innerText = title;
    
    // Подсветка активного чата в списке
    loadChats(); 

    // Слушаем сообщения
    const msgsRef = collection(db, "chats", chatId, "messages");
    const q = query(msgsRef, orderBy("timestamp", "asc"));

    onSnapshot(q, (snapshot) => {
        const display = document.getElementById('messages-display');
        display.innerHTML = '';
        snapshot.forEach(msgDoc => {
            const msgData = msgDoc.data();
            const isOwn = msgData.sender === currentUser.email;
            
            const time = msgData.timestamp ? new Date(msgData.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...';
            
            display.innerHTML += `
                <div class="msg ${isOwn ? 'msg-own' : 'msg-other'}">
                    ${msgData.text}
                    <span class="msg-time">${time}</span>
                </div>
            `;
        });
        display.scrollTop = display.scrollHeight; // Автоскролл
    });
}

// Отправка сообщения
document.getElementById('message-form').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const text = input.value.trim();

    if (text && activeChatId) {
        await addDoc(collection(db, "chats", activeChatId, "messages"), {
            text: text,
            sender: currentUser.email,
            timestamp: serverTimestamp()
        });
        input.value = '';
    }
};
