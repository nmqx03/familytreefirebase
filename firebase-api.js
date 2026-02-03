// Firebase API Client for Family Tree - FIXED VERSION
// ✅ FIX: Sử dụng numeric IDs thay vì Firebase auto-generated IDs

class FirebaseFamilyTreeAPI {
    constructor() {
        this.db = firebase.database();
        this.auth = firebase.auth();
        this.membersRef = this.db.ref('members');
        this.spousesRef = this.db.ref('spouses');
        this.metadataRef = this.db.ref('metadata');
    }

    // ============================================================================
    // AUTHENTICATION
    // ============================================================================

    /**
     * Đăng nhập với email và password
     */
    async login(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            return {
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                },
                message: 'Đăng nhập thành công'
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: this.getErrorMessage(error.code)
            };
        }
    }

    /**
     * Đăng xuất
     */
    async logout() {
        try {
            await this.auth.signOut();
            return { success: true, message: 'Đã đăng xuất' };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, message: 'Lỗi khi đăng xuất' };
        }
    }

    /**
     * Kiểm tra trạng thái đăng nhập
     */
    onAuthStateChanged(callback) {
        return this.auth.onAuthStateChanged(callback);
    }

    /**
     * Lấy user hiện tại
     */
    getCurrentUser() {
        return this.auth.currentUser;
    }

    // ============================================================================
    // MEMBERS - CRUD OPERATIONS
    // ============================================================================

    /**
     * Lấy tất cả thành viên
     */
    async getAllMembers() {
        try {
            const snapshot = await this.membersRef.once('value');
            const data = snapshot.val();
            
            if (!data) return { members: [] };
            
            // Convert object to array
            const members = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            
            return { members };
        } catch (error) {
            console.error('Get members error:', error);
            return { members: [], error: error.message };
        }
    }

    /**
     * Lấy thành viên theo ID
     */
    async getMember(id) {
        try {
            const snapshot = await this.membersRef.child(id).once('value');
            const data = snapshot.val();
            
            if (!data) {
                return { success: false, message: 'Không tìm thấy thành viên' };
            }
            
            return { success: true, member: { id, ...data } };
        } catch (error) {
            console.error('Get member error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * ✅ FIXED: Thêm thành viên mới với numeric ID
     * @param {string} memberId - ID dạng "member_166"
     * @param {object} memberData - Dữ liệu thành viên
     */
    async addMember(memberId, memberData) {
        try {
            // ✅ FIX: Sử dụng ID truyền vào thay vì push()
            const timestamp = Date.now();
            
            const member = {
                ...memberData,
                createdAt: timestamp,
                updatedAt: timestamp
            };
            
            // ✅ FIX: Dùng set() với ID cụ thể, KHÔNG dùng push()
            await this.membersRef.child(memberId).set(member);
            
            return {
                success: true,
                member: { id: memberId, ...member },
                message: 'Thêm thành viên thành công'
            };
        } catch (error) {
            console.error('Add member error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Cập nhật thành viên
     */
    async updateMember(id, memberData) {
        try {
            const updates = {
                ...memberData,
                updatedAt: Date.now()
            };
            
            await this.membersRef.child(id).update(updates);
            
            return {
                success: true,
                member: { id, ...updates },
                message: 'Cập nhật thành công'
            };
        } catch (error) {
            console.error('Update member error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Xóa thành viên
     */
    async deleteMember(id) {
        try {
            await this.membersRef.child(id).remove();
            return { success: true, message: 'Xóa thành công' };
        } catch (error) {
            console.error('Delete member error:', error);
            return { success: false, message: error.message };
        }
    }

    // ============================================================================
    // SPOUSES - CRUD OPERATIONS
    // ============================================================================

    /**
     * Lấy tất cả vợ/chồng
     */
    async getAllSpouses() {
        try {
            const snapshot = await this.spousesRef.once('value');
            const data = snapshot.val();
            
            if (!data) return { spouses: [] };
            
            const spouses = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            
            return { spouses };
        } catch (error) {
            console.error('Get spouses error:', error);
            return { spouses: [], error: error.message };
        }
    }

    /**
     * ✅ FIXED: Thêm vợ/chồng với numeric ID
     * @param {string} spouseId - ID dạng "spouse_172"
     * @param {object} spouseData - Dữ liệu vợ/chồng
     */
    async addSpouse(spouseId, spouseData) {
        try {
            const timestamp = Date.now();
            
            const spouse = {
                ...spouseData,
                createdAt: timestamp,
                updatedAt: timestamp
            };
            
            // ✅ FIX: Dùng set() với ID cụ thể
            await this.spousesRef.child(spouseId).set(spouse);
            
            return {
                success: true,
                spouse: { id: spouseId, ...spouse },
                message: 'Thêm vợ/chồng thành công'
            };
        } catch (error) {
            console.error('Add spouse error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Cập nhật vợ/chồng
     */
    async updateSpouse(id, spouseData) {
        try {
            const updates = {
                ...spouseData,
                updatedAt: Date.now()
            };
            
            await this.spousesRef.child(id).update(updates);
            
            return {
                success: true,
                spouse: { id, ...updates },
                message: 'Cập nhật thành công'
            };
        } catch (error) {
            console.error('Update spouse error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Xóa vợ/chồng
     */
    async deleteSpouse(id) {
        try {
            await this.spousesRef.child(id).remove();
            return { success: true, message: 'Xóa thành công' };
        } catch (error) {
            console.error('Delete spouse error:', error);
            return { success: false, message: error.message };
        }
    }

    // ============================================================================
    // METADATA
    // ============================================================================

    /**
     * Lấy metadata
     */
    async getMetadata() {
        try {
            const snapshot = await this.metadataRef.once('value');
            return snapshot.val() || { currentId: 1 };
        } catch (error) {
            console.error('Get metadata error:', error);
            return { currentId: 1 };
        }
    }

    /**
     * Cập nhật currentId
     */
    async updateCurrentId(currentId) {
        try {
            await this.metadataRef.update({ currentId });
            return { success: true };
        } catch (error) {
            console.error('Update currentId error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Backup database
     */
    async backup() {
        try {
            const snapshot = await this.db.ref('/').once('value');
            const data = snapshot.val();
            
            await this.metadataRef.update({ lastBackup: Date.now() });
            
            return { success: true, data };
        } catch (error) {
            console.error('Backup error:', error);
            return { success: false, message: error.message };
        }
    }

    // ============================================================================
    // ERROR MESSAGES
    // ============================================================================

    getErrorMessage(code) {
        const messages = {
            'auth/invalid-email': 'Email không hợp lệ',
            'auth/user-disabled': 'Tài khoản đã bị vô hiệu hóa',
            'auth/user-not-found': 'Không tìm thấy tài khoản',
            'auth/wrong-password': 'Mật khẩu không đúng',
            'auth/email-already-in-use': 'Email đã được sử dụng',
            'auth/weak-password': 'Mật khẩu quá yếu',
            'auth/network-request-failed': 'Lỗi kết nối mạng'
        };
        
        return messages[code] || 'Đã xảy ra lỗi';
    }
}