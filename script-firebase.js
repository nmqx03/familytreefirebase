// Firebase Integration for Family Tree - FIXED VERSION
// ✅ FIX: Sử dụng numeric IDs, không gộp với Firebase auto-generated IDs

(function() {
    'use strict';
    
    // Khởi tạo Firebase API
    const firebaseAPI = new FirebaseFamilyTreeAPI();
    let isAuthenticated = false;
    let currentUser = null;
    
    // Override loadFromStorage để load từ Firebase
    const originalLoadFromStorage = FamilyTree.prototype.loadFromStorage;
    FamilyTree.prototype.loadFromStorage = async function() {
        try {
            console.log('📥 Đang tải dữ liệu từ Firebase...');
            
            // Lấy members
            const membersResult = await firebaseAPI.getAllMembers();
            this.members = membersResult.members || [];
            
            // Lấy spouses và convert thành members với isSpouse = true
            const spousesResult = await firebaseAPI.getAllSpouses();
            const spouses = spousesResult.spouses || [];
            
            console.log('📊 Raw spouses from Firebase:', spouses);
            console.log('📊 Sample member IDs:', this.members.slice(0, 3).map(m => m.id));
            
            // Convert spouses sang format của script.js
            const spouseMembers = spouses.map(s => {
                // ✅ FIX: memberId trong Firebase đã có prefix "member_"
                const actualMemberId = s.memberId;
                const member = this.members.find(m => m.id == actualMemberId);
                
                if (!member) {
                    console.warn('⚠️ Không tìm thấy member cho spouse:', s.name, 'memberId:', s.memberId);
                }
                
                return {
                    id: s.id,
                    name: s.name,
                    birthYear: s.birthYear || null,
                    deathYear: s.deathYear || null,
                    hometown: s.hometown || null,
                    notes: s.notes || null,
                    spouseOrder: s.spouseOrder !== null && s.spouseOrder !== undefined ? s.spouseOrder : 0,
                    spouseOf: actualMemberId,
                    isSpouse: true,
                    gender: member ? (member.gender === 'male' ? 'female' : 'male') : 'female',
                    parentId: actualMemberId,
                    motherSpouseId: null,
                    childOrder: null,
                    isMainTree: member ? member.isMainTree : true
                };
            });
            
            console.log('✨ Converted spouse members:', spouseMembers);
            
            // Gộp spouses vào members array
            this.members = [...this.members, ...spouseMembers];
            
            // ✅ FIX: Lấy currentId từ metadata Firebase
            const metadata = await firebaseAPI.getMetadata();
            this.currentId = metadata.currentId || 1;
            
            console.log('🔢 Current ID from Firebase:', this.currentId);
            
            this.updateDropdowns();
            this.renderTree();
            this.saveState();
            
            console.log('✅ Đã tải', this.members.filter(m => !m.isSpouse).length, 'thành viên và', spouseMembers.length, 'vợ/chồng từ Firebase');
            console.log('👥 Total members in array:', this.members.length);
            
        } catch (error) {
            console.error('❌ Lỗi khi tải từ Firebase:', error);
            // Fallback về localStorage
            originalLoadFromStorage.call(this);
        }
    };
    
    // Override saveToStorage để lưu lên Firebase
    const originalSaveToStorage = FamilyTree.prototype.saveToStorage;
    FamilyTree.prototype.saveToStorage = async function() {
        try {
            // Nếu chưa đăng nhập, không lưu lên Firebase
            if (!isAuthenticated) {
                console.log('⚠️ Chưa đăng nhập, chỉ lưu local');
                originalSaveToStorage.call(this);
                return;
            }
            
            console.log('📤 Đang lưu lên Firebase...');
            
            // Lưu cũng vào localStorage để backup
            originalSaveToStorage.call(this);
            
            // Hiển thị sync indicator
            if (typeof showSyncIndicator === 'function') {
                showSyncIndicator();
            }
            
            // ✅ FIX: Update currentId lên Firebase
            await firebaseAPI.updateCurrentId(this.currentId);
            
        } catch (error) {
            console.error('❌ Lỗi khi lưu lên Firebase:', error);
        }
    };
    
    // ✅ FIXED: Method lưu member lên Firebase
    FamilyTree.prototype.saveMemberToFirebase = async function(member) {
        if (!isAuthenticated) {
            console.log('⚠️ Chưa đăng nhập, không lưu member');
            return;
        }
        
        try {
            console.log('💾 Saving member:', member.name, 'ID:', member.id);
            
            // ✅ FIX: ID đã có format đúng từ script.js, KHÔNG update lại
            let memberId = member.id;
            
            // Chỉ convert nếu vẫn còn dạng numeric (backward compatibility)
            if (typeof memberId === 'number') {
                memberId = `member_${memberId}`;
                console.warn('⚠️ Converting numeric ID to string:', memberId);
            }
            
            // ✅ FIX: Đảm bảo parentId và motherSpouseId có prefix
            let parentId = member.parentId;
            if (parentId && typeof parentId === 'number') {
                parentId = `member_${parentId}`;
            }
            
            let motherSpouseId = member.motherSpouseId;
            if (motherSpouseId && typeof motherSpouseId === 'number') {
                motherSpouseId = `spouse_${motherSpouseId}`;
            }
            
            const memberData = {
                name: member.name,
                gender: member.gender,
                birthYear: member.birthYear || null,
                deathYear: member.deathYear || null,
                hometown: member.hometown || null,
                parentId: parentId || null,
                notes: member.notes || null,
                childOrder: member.childOrder !== null && member.childOrder !== undefined ? member.childOrder : null,
                motherSpouseId: motherSpouseId || null
            };
            
            console.log('💾 Member data to save:', memberData);
            
            // Check xem member đã tồn tại chưa
            const existingMember = await firebaseAPI.getMember(memberId);
            
            if (existingMember.success) {
                // UPDATE
                console.log('🔄 Updating existing member:', memberId);
                const result = await firebaseAPI.updateMember(memberId, memberData);
                
                if (result.success) {
                    console.log('✅ Updated member in Firebase');
                } else {
                    console.error('❌ Failed to update:', result.message);
                }
            } else {
                // CREATE NEW
                console.log('➕ Creating new member in Firebase with ID:', memberId);
                
                // ✅ FIX: Truyền memberId vào hàm addMember
                const result = await firebaseAPI.addMember(memberId, memberData);
                
                if (result.success) {
                    console.log('✅ Created member in Firebase with ID:', memberId);
                } else {
                    console.error('❌ Failed to create:', result.message);
                }
            }
            
        } catch (error) {
            console.error('❌ Lỗi khi lưu member:', error);
            alert('Lỗi khi lưu thành viên: ' + error.message);
        }
    };
    
    // ✅ FIXED: Method lưu spouse lên Firebase  
    FamilyTree.prototype.saveSpouseToFirebase = async function(memberId, spouse) {
        if (!isAuthenticated) {
            console.log('⚠️ Chưa đăng nhập, không lưu spouse');
            return;
        }
        
        try {
            console.log('💾 Saving spouse:', spouse.name, 'for member:', memberId);
            
            // ✅ FIX: ID đã có format đúng từ script.js, KHÔNG update lại
            let spouseId = spouse.id;
            
            // Chỉ convert nếu vẫn còn dạng numeric (backward compatibility)
            if (typeof spouseId === 'number') {
                spouseId = `spouse_${spouseId}`;
                console.warn('⚠️ Converting numeric ID to string:', spouseId);
            }
            
            // ✅ FIX: Đảm bảo memberId có prefix
            if (memberId && typeof memberId === 'number') {
                memberId = `member_${memberId}`;
            }
            
            const spouseData = {
                memberId: memberId,
                name: spouse.name,
                birthYear: spouse.birthYear || null,
                deathYear: spouse.deathYear || null,
                hometown: spouse.hometown || null,
                notes: spouse.notes || null,
                spouseOrder: spouse.spouseOrder !== null && spouse.spouseOrder !== undefined ? spouse.spouseOrder : 0
            };
            
            console.log('💾 Spouse data to save:', spouseData);
            
            // Check xem spouse đã tồn tại chưa (có thể không có getSpouse method)
            try {
                const existingMember = await firebaseAPI.getMember(spouseId);
                
                if (existingMember.success) {
                    // Có thể là update
                    console.log('🔄 Might be updating spouse');
                }
            } catch (e) {
                // Ignore
            }
            
            // CREATE NEW (hoặc sẽ overwrite nếu đã tồn tại - Firebase set() behavior)
            console.log('➕ Saving spouse to Firebase with ID:', spouseId);
            
            // ✅ FIX: Truyền spouseId vào hàm addSpouse
            const result = await firebaseAPI.addSpouse(spouseId, spouseData);
            
            if (result.success) {
                console.log('✅ Saved spouse in Firebase with ID:', spouseId);
                this.renderTree();
            } else {
                console.error('❌ Failed to save spouse:', result.message);
            }
            
        } catch (error) {
            console.error('❌ Lỗi khi lưu spouse:', error);
            alert('Lỗi khi lưu vợ/chồng: ' + error.message);
        }
    };
    
    // Method xóa member từ Firebase
    FamilyTree.prototype.deleteMemberFromFirebase = async function(memberId) {
        if (!isAuthenticated) return;
        
        try {
            // ✅ FIX: Đảm bảo ID có prefix
            if (typeof memberId === 'number') {
                memberId = `member_${memberId}`;
            }
            
            await firebaseAPI.deleteMember(memberId);
            console.log('✅ Đã xóa member khỏi Firebase');
        } catch (error) {
            console.error('❌ Lỗi khi xóa member:', error);
        }
    };
    
    // Method xóa spouse từ Firebase
    FamilyTree.prototype.deleteSpouseFromFirebase = async function(spouseId) {
        if (!isAuthenticated) return;
        
        try {
            // ✅ FIX: Đảm bảo ID có prefix
            if (typeof spouseId === 'number') {
                spouseId = `spouse_${spouseId}`;
            }
            
            await firebaseAPI.deleteSpouse(spouseId);
            console.log('✅ Đã xóa spouse khỏi Firebase');
        } catch (error) {
            console.error('❌ Lỗi khi xóa spouse:', error);
        }
    };
    
    // ============================================================================
    // UI: LOGIN/LOGOUT
    // ============================================================================
    
    function showAdminPanel() {
        const adminContainer = document.getElementById('adminContainer');
        const loginSection = document.getElementById('loginSection');
        const loggedInSection = document.getElementById('loggedInSection');
        
        if (adminContainer) adminContainer.style.display = 'block';
        if (loginSection) loginSection.style.display = 'none';
        if (loggedInSection) loggedInSection.style.display = 'block';
        
        // Hiện nút Undo/Redo
        const undoRedoContainer = document.getElementById('undoRedoContainer');
        if (undoRedoContainer) {
            undoRedoContainer.style.display = 'flex';
        }
    }
    
    function hideAdminPanel() {
        const adminContainer = document.getElementById('adminContainer');
        const loginSection = document.getElementById('loginSection');
        const loggedInSection = document.getElementById('loggedInSection');
        
        if (adminContainer) adminContainer.style.display = 'none';
        if (loginSection) loginSection.style.display = 'block';
        if (loggedInSection) loggedInSection.style.display = 'none';
        
        // Ẩn nút Undo/Redo
        const undoRedoContainer = document.getElementById('undoRedoContainer');
        if (undoRedoContainer) {
            undoRedoContainer.style.display = 'none';
        }
    }
    
    // Login handler
    async function handleLogin() {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const statusEl = document.getElementById('loginStatus');
        
        if (!email || !password) {
            statusEl.textContent = 'Vui lòng nhập email và password!';
            statusEl.className = 'error';
            return;
        }
        
        statusEl.textContent = 'Đang đăng nhập...';
        statusEl.className = 'info';
        
        const result = await firebaseAPI.login(email, password);
        
        if (result.success) {
            isAuthenticated = true;
            currentUser = result.user;
            statusEl.textContent = `Đăng nhập thành công: ${result.user.email}`;
            statusEl.className = 'success';
            
            // Hiện admin panel
            showAdminPanel();
            
            // Update user info
            const userEmailEl = document.getElementById('userEmail');
            if (userEmailEl) {
                userEmailEl.textContent = result.user.email;
            }
            
            console.log('✅ Đã đăng nhập Firebase');
        } else {
            statusEl.textContent = result.message;
            statusEl.className = 'error';
        }
    }
    
    // Logout handler
    async function handleLogout() {
        await firebaseAPI.logout();
        isAuthenticated = false;
        currentUser = null;
        hideAdminPanel();
        
        const statusEl = document.getElementById('loginStatus');
        if (statusEl) {
            statusEl.textContent = '';
        }
        
        console.log('✅ Đã đăng xuất Firebase');
    }
    
    // Auto login nếu có session
    firebaseAPI.onAuthStateChanged(user => {
        if (user) {
            isAuthenticated = true;
            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName
            };
            showAdminPanel();
            
            const userEmailEl = document.getElementById('userEmail');
            if (userEmailEl) {
                userEmailEl.textContent = user.email;
            }
            
            console.log('✅ Auto login:', user.email);
        } else {
            isAuthenticated = false;
            currentUser = null;
            hideAdminPanel();
        }
    });
    
    // Export functions to global scope
    window.handleLogin = handleLogin;
    window.handleLogout = handleLogout;
    
    // Export indicator
    window.showSyncIndicator = function() {
        const indicator = document.getElementById('syncIndicator');
        if (indicator) {
            indicator.style.display = 'block';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 2000);
        }
    };
    
    console.log('✅ Firebase integration loaded (FIXED VERSION)');
})();