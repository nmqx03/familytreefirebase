// Firebase Configuration - FORCE WEBSOCKET
// Fix lỗi ERR_NAME_NOT_RESOLVED khi dùng Long Polling

const firebaseConfig = {
    apiKey: "AIzaSyCgZC4k0edOzSHx-z6fjr1uaaL9vODuoB0",
    authDomain: "familytree-2ee61.firebaseapp.com",
    databaseURL: "https://familytree-2ee61-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "familytree-2ee61",
    storageBucket: "familytree-2ee61.firebasestorage.app",
    messagingSenderId: "852759729015",
    appId: "1:852759729015:web:2f4d0697e4115fe0404772",
    measurementId: "G-1VJ6YDQ4MP"
};

// Initialize Firebase (compat version)
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const database = firebase.database();

// ✅ FIX: Bắt buộc dùng WebSocket, không dùng Long Polling
// Long Polling bị lỗi DNS ở một số ISP Việt Nam
database.INTERNAL.forceWebSockets();

// Export để sử dụng
window.firebaseAuth = auth;
window.firebaseDB = database;

console.log('✅ Firebase đã được khởi tạo (WebSocket only)');
console.log('🔗 Database URL:', firebaseConfig.databaseURL);

// Test connection (chỉ log console)
database.ref('.info/connected').on('value', function(snapshot) {
    if (snapshot.val() === true) {
        console.log('✅ Đã kết nối Firebase Realtime Database');
    } else {
        console.log('⚠️ Chưa kết nối Firebase Realtime Database');
    }
});