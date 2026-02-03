class FamilyTree {
    constructor() {
        this.members = [];
        this.currentId = 1;
        this.scale = 1;
        this.translateX = -100;
        this.translateY = -100;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.nodePositions = new Map();
        
        // Touch support for pinch-to-zoom
        this.initialDistance = 0;
        this.initialScale = 1;
        this.touches = [];
        
        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        this.isUndoRedoAction = false;
        
        // Flag để kiểm soát notification
        this.notificationShown = false;
        
        this.init();
        this.loadFromStorage();
        this.setupKeyboardShortcuts();
    }

    init() {
        this.setupEventListeners();
        this.setupSearchableSelects();
        this.updateDropdowns();
        this.renderTree();
    }

    setupEventListeners() {
        // Form thêm thành viên
        document.getElementById('addMemberForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMember();
        });

        // Form thêm vợ/chồng
        document.getElementById('addSpouseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSpouse();
        });

        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('zoomReset').addEventListener('click', () => this.resetZoom());
        
        // Undo/Redo buttons
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());

        // Tree canvas drag
        const canvas = document.getElementById('treeCanvas');
        canvas.addEventListener('mousedown', (e) => this.startDrag(e));
        canvas.addEventListener('mousemove', (e) => this.drag(e));
        canvas.addEventListener('mouseup', () => this.endDrag());
        canvas.addEventListener('mouseleave', () => this.endDrag());

        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // Mouse wheel zoom
        canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Search
        document.getElementById('searchName').addEventListener('input', (e) => {
            this.searchMembers(e.target.value);
        });

        // Reset, Export, Import
        document.getElementById('resetBtn').addEventListener('click', () => this.resetData());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        document.getElementById('importFile').addEventListener('change', (e) => this.importData(e));

        // Modal controls
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('editModal').style.display = 'none';
        });

        document.querySelector('.close-spouse-modal').addEventListener('click', () => {
            document.getElementById('editSpouseModal').style.display = 'none';
        });
        
        // Detail modal controls
        document.querySelector('.close-detail-modal').addEventListener('click', () => {
            document.getElementById('detailModal').style.display = 'none';
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            const editModal = document.getElementById('editModal');
            const spouseModal = document.getElementById('editSpouseModal');
            const detailModal = document.getElementById('detailModal');
            
            if (e.target === editModal) {
                editModal.style.display = 'none';
            }
            if (e.target === spouseModal) {
                spouseModal.style.display = 'none';
            }
            if (e.target === detailModal) {
                detailModal.style.display = 'none';
            }
        });

        // Edit form submit
        document.getElementById('editMemberForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateMember();
        });

        document.getElementById('editSpouseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateSpouse();
        });

        // Checkbox handlers for death year
        this.setupDeathYearCheckboxes();
    }

    setupDeathYearCheckboxes() {
        // Add member form
        const isDeceased = document.getElementById('isDeceased');
        const deathYear = document.getElementById('deathYear');
        if (isDeceased && deathYear) {
            isDeceased.addEventListener('change', (e) => {
                if (e.target.checked) {
                    deathYear.value = 'Chưa rõ';
                } else {
                    deathYear.value = '';
                }
            });
        }

        // Add spouse form
        const spouseIsDeceased = document.getElementById('spouseIsDeceased');
        const spouseDeathYear = document.getElementById('spouseDeathYear');
        if (spouseIsDeceased && spouseDeathYear) {
            spouseIsDeceased.addEventListener('change', (e) => {
                if (e.target.checked) {
                    spouseDeathYear.value = 'Chưa rõ';
                } else {
                    spouseDeathYear.value = '';
                }
            });
        }

        // Edit member form
        const editIsDeceased = document.getElementById('editIsDeceased');
        const editDeathYear = document.getElementById('editDeathYear');
        if (editIsDeceased && editDeathYear) {
            editIsDeceased.addEventListener('change', (e) => {
                if (e.target.checked) {
                    editDeathYear.value = 'Chưa rõ';
                } else {
                    editDeathYear.value = '';
                }
            });
        }

        // Edit spouse form
        const editSpouseIsDeceased = document.getElementById('editSpouseIsDeceased');
        const editSpouseDeathYear = document.getElementById('editSpouseDeathYear');
        if (editSpouseIsDeceased && editSpouseDeathYear) {
            editSpouseIsDeceased.addEventListener('change', (e) => {
                if (e.target.checked) {
                    editSpouseDeathYear.value = 'Chưa rõ';
                } else {
                    editSpouseDeathYear.value = '';
                }
            });
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z for Undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            // Ctrl+Y or Ctrl+Shift+Z for Redo
            if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                this.redo();
            }
        });
    }

    setupSearchableSelects() {
        this.initSearchableSelect('parentSearch', 'parentOptions', 'parentId', () => {
            const value = document.getElementById('parentId').value;
            this.updateChildrenInfo(value);
            this.updateSpouseParentDropdown(value);
            this.updateChildOrderSelect(); // Thêm dòng này để tự động cập nhật thứ tự con
        });

        this.initSearchableSelect('spouseMemberSearch', 'spouseMemberOptions', 'spouseMemberId', () => {
            this.updateSpouseOrderSelect(); // Thêm dòng này để tự động cập nhật thứ tự vợ/chồng
        });
        this.initSearchableSelect('editParentSearch', 'editParentOptions', 'editParentId', () => {
            const value = document.getElementById('editParentId').value;
            const memberId = document.getElementById('editMemberId').value;
            const currentMember = this.members.find(m => m.id == memberId);
            this.updateEditSpouseParentDropdown(value, currentMember);
        });
        this.initSearchableSelect('spouseParentSearch', 'spouseParentOptions', 'spouseParentId');
        this.initSearchableSelect('editSpouseParentSearch', 'editSpouseParentOptions', 'editSpouseParentId');

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.searchable-select')) {
                document.querySelectorAll('.select-options').forEach(opt => {
                    opt.classList.remove('active');
                });
            }
        });
    }

    initSearchableSelect(searchId, optionsId, hiddenId, onSelect) {
        const searchInput = document.getElementById(searchId);
        const optionsDiv = document.getElementById(optionsId);
        const hiddenInput = document.getElementById(hiddenId);

        if (!searchInput || !optionsDiv || !hiddenInput) return;

        searchInput.addEventListener('focus', () => {
            optionsDiv.classList.add('active');
        });

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const options = optionsDiv.querySelectorAll('.select-option');
            
            options.forEach(option => {
                const text = option.textContent.toLowerCase();
                if (text.includes(query)) {
                    option.classList.remove('hidden');
                } else {
                    option.classList.add('hidden');
                }
            });
        });

        optionsDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('select-option')) {
                const value = e.target.dataset.value;
                const text = e.target.textContent;
                
                searchInput.value = text;
                hiddenInput.value = value;
                optionsDiv.classList.remove('active');
                
                optionsDiv.querySelectorAll('.select-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                e.target.classList.add('selected');

                if (onSelect) onSelect();
            }
        });
    }

    updateChildrenInfo(parentId) {
        const infoDiv = document.getElementById('childrenInfo');
        if (!parentId) {
            infoDiv.textContent = '';
            return;
        }

        const parent = this.members.find(m => m.id == parentId);
        if (!parent) return;

        const children = this.members.filter(m => m.parentId == parent.id && !m.isSpouse);
        if (children.length > 0) {
            infoDiv.textContent = `${parent.name} đã có ${children.length} con`;
        } else {
            infoDiv.textContent = `${parent.name} chưa có con`;
        }
    }

    updateSpouseParentDropdown(parentId) {
        const spouseGroup = document.getElementById('spouseParentGroup');
        const optionsDiv = document.getElementById('spouseParentOptions');
        const searchInput = document.getElementById('spouseParentSearch');
        const hiddenInput = document.getElementById('spouseParentId');

        if (!parentId) {
            spouseGroup.style.display = 'none';
            return;
        }

        // ✅ FIX: Tìm parent theo cả string và number ID
        const parent = this.members.find(m => m.id == parentId);
        if (!parent) {
            spouseGroup.style.display = 'none';
            return;
        }

        // Lấy danh sách vợ/chồng của cha/mẹ được chọn
        const spouses = this.members.filter(m => m.spouseOf == parent.id && m.isSpouse);

        console.log('✅ Spouse parent dropdown:', {
            parentId,
            parentName: parent.name,
            spousesCount: spouses.length,
            spouseNames: spouses.map(s => s.name)
        });

        if (spouses.length === 0) {
            // Không có vợ/chồng nào → ẩn dropdown
            spouseGroup.style.display = 'none';
            hiddenInput.value = '';
            searchInput.value = '';
        } else {
            // ✅ CÓ VỢ/CHỒNG → LUÔN HIỂN THỊ dropdown (kể cả khi chỉ có 1 người)
            spouseGroup.style.display = 'block';
            optionsDiv.innerHTML = '';

            spouses.forEach(spouse => {
                const option = document.createElement('div');
                option.className = 'select-option';
                option.dataset.value = spouse.id;
                
                // Hiển thị đầy đủ: Tên (Năm sinh - Năm mất) [Vợ thứ X]
                let displayText = spouse.name;
                if (spouse.birthYear || spouse.deathYear) {
                    const years = `${spouse.birthYear || '?'} - ${spouse.deathYear || 'nay'}`;
                    displayText += ` (${years})`;
                }
                if (spouse.spouseOrder !== undefined && spouse.spouseOrder !== null) {
                    displayText += ` [${parent.gender === 'male' ? 'Vợ' : 'Chồng'} ${spouse.spouseOrder + 1}]`;
                }
                
                option.textContent = displayText;
                optionsDiv.appendChild(option);
            });

            // Tự động điền vợ/chồng đầu tiên vào ô search
            if (spouses.length > 0) {
                hiddenInput.value = spouses[0].id;
                let displayText = spouses[0].name;
                if (spouses[0].birthYear || spouses[0].deathYear) {
                    const years = `${spouses[0].birthYear || '?'} - ${spouses[0].deathYear || 'nay'}`;
                    displayText += ` (${years})`;
                }
                if (spouses[0].spouseOrder !== undefined && spouses[0].spouseOrder !== null) {
                    displayText += ` [${parent.gender === 'male' ? 'Vợ' : 'Chồng'} ${spouses[0].spouseOrder + 1}]`;
                }
                searchInput.value = displayText;
            }
        }
    }

    updateEditSpouseParentDropdown(parentId, currentMember = null) {
        const spouseGroup = document.getElementById('editSpouseParentGroup');
        const optionsDiv = document.getElementById('editSpouseParentOptions');
        const searchInput = document.getElementById('editSpouseParentSearch');
        const hiddenInput = document.getElementById('editSpouseParentId');

        if (!parentId) {
            spouseGroup.style.display = 'none';
            return;
        }

        // ✅ FIX: Tìm parent theo cả string và number ID
        const parent = this.members.find(m => m.id == parentId);
        if (!parent) {
            spouseGroup.style.display = 'none';
            return;
        }

        // Lấy danh sách vợ/chồng của cha/mẹ được chọn
        const spouses = this.members.filter(m => m.spouseOf == parent.id && m.isSpouse);

        if (spouses.length === 0) {
            // Không có vợ/chồng nào → ẩn dropdown
            spouseGroup.style.display = 'none';
            hiddenInput.value = '';
            searchInput.value = '';
        } else {
            // ✅ CÓ VỢ/CHỒNG → LUÔN HIỂN THỊ dropdown (kể cả khi chỉ có 1 người)
            spouseGroup.style.display = 'block';
            optionsDiv.innerHTML = '';

            spouses.forEach(spouse => {
                const option = document.createElement('div');
                option.className = 'select-option';
                option.dataset.value = spouse.id;
                
                // Hiển thị đầy đủ: Tên (Năm sinh - Năm mất)
                let displayText = spouse.name;
                if (spouse.birthYear || spouse.deathYear) {
                    const years = `${spouse.birthYear || '?'} - ${spouse.deathYear || 'nay'}`;
                    displayText += ` (${years})`;
                }
                
                option.textContent = displayText;
                optionsDiv.appendChild(option);
            });

            // ✅ Tự động chọn vợ/chồng hiện tại nếu có currentMember
            if (currentMember && currentMember.motherSpouseId) {
                const currentSpouse = spouses.find(s => s.id == currentMember.motherSpouseId);
                if (currentSpouse) {
                    hiddenInput.value = currentSpouse.id;
                    let displayText = currentSpouse.name;
                    if (currentSpouse.birthYear || currentSpouse.deathYear) {
                        const years = `${currentSpouse.birthYear || '?'} - ${currentSpouse.deathYear || 'nay'}`;
                        displayText += ` (${years})`;
                    }
                    searchInput.value = displayText;
                } else {
                    // Nếu không tìm thấy spouse hiện tại, chọn người đầu tiên
                    hiddenInput.value = spouses[0].id;
                    let displayText = spouses[0].name;
                    if (spouses[0].birthYear || spouses[0].deathYear) {
                        const years = `${spouses[0].birthYear || '?'} - ${spouses[0].deathYear || 'nay'}`;
                        displayText += ` (${years})`;
                    }
                    searchInput.value = displayText;
                }
            } else if (spouses.length > 0) {
                // Nếu không có currentMember, chọn người đầu tiên
                hiddenInput.value = spouses[0].id;
                let displayText = spouses[0].name;
                if (spouses[0].birthYear || spouses[0].deathYear) {
                    const years = `${spouses[0].birthYear || '?'} - ${spouses[0].deathYear || 'nay'}`;
                    displayText += ` (${years})`;
                }
                searchInput.value = displayText;
            }
        }
    }

    addMember() {
        const name = document.getElementById('memberName').value.trim();
        const gender = document.getElementById('memberGender').value;
        const birthYear = document.getElementById('birthYear').value.trim();
        const deathYear = document.getElementById('deathYear').value.trim();
        const hometown = document.getElementById('hometown').value.trim();
        const parentId = document.getElementById('parentId').value;
        const spouseParentId = document.getElementById('spouseParentId').value;
        const childOrder = document.getElementById('childOrder').value;
        const notes = document.getElementById('notes').value.trim();

        if (!name) {
            alert('Vui lòng nhập họ và tên!');
            return;
        }

        // ✅ KIỂM TRA: Nếu cha/mẹ có vợ/chồng thì phải chọn vợ/chồng
        if (parentId) {
            const parent = this.members.find(m => m.id == parentId);
            if (parent) {
                const spouses = this.members.filter(m => m.spouseOf == parent.id && m.isSpouse);
                // Nếu có vợ/chồng (>= 1) mà không chọn → báo lỗi
                if (spouses.length > 0 && !spouseParentId) {
                    alert('Vui lòng chọn Cha/Mẹ (vợ/chồng của người đã chọn)!');
                    return;
                }
            }
        }

        // Kiểm tra xem có phải người đầu tiên không
        const isFirstMember = this.members.filter(m => !m.isSpouse).length === 0;
        
        // Nếu không phải người đầu tiên VÀ không có cha/mẹ -> đánh dấu là "chờ xử lý"
        const isMainTree = isFirstMember || parentId ? true : false;

        // ✅ FIX: Tạo ID với format đúng ngay từ đầu
        const numericId = this.currentId++;
        const memberId = `member_${numericId}`;

        const newMember = {
            id: memberId,  // ✅ Dùng format member_XXX ngay từ đầu
            name: name,
            gender: gender,
            birthYear: birthYear || null,
            deathYear: deathYear || null,
            hometown: hometown || null,
            parentId: parentId ? parentId : null,
            childOrder: childOrder ? parseInt(childOrder) : null,
            notes: notes.trim() !== '' ? notes.trim() : null,
            isSpouse: false,
            spouseOf: null,
            spouseOrder: 0,
            motherSpouseId: spouseParentId ? spouseParentId : null,
            isMainTree: isMainTree
        };

        this.members.push(newMember);
        this.saveToStorage();
        this.saveState();
        
        // ✅ LƯU LÊN FIREBASE ngay sau khi thêm
        if (this.saveMemberToFirebase) {
            this.saveMemberToFirebase(newMember);
        }
        
        this.updateDropdowns();
        this.renderTree();
        
        if (!isMainTree) {
            this.showNotification(`Đã thêm ${name} vào khu vực chờ xử lý. Hãy sửa để gán cha/mẹ!`);
        } else {
            this.showNotification(`Đã thêm ${name}!`);
        }

        document.getElementById('addMemberForm').reset();
        document.getElementById('parentSearch').value = '';
        document.getElementById('spouseParentSearch').value = '';
        document.getElementById('childrenInfo').textContent = '';
        document.getElementById('spouseParentGroup').style.display = 'none';
        document.getElementById('childOrderGroup').style.display = 'none';
    }

    addSpouse() {
        const memberIdStr = document.getElementById('spouseMemberId').value;
        const spouseName = document.getElementById('spouseName').value.trim();
        const spouseBirthYear = document.getElementById('spouseBirthYear').value.trim();
        const spouseDeathYear = document.getElementById('spouseDeathYear').value.trim();
        const spouseHometown = document.getElementById('spouseHometown').value.trim();
        const spouseOrder = document.getElementById('spouseOrder').value;
        const spouseNotes = document.getElementById('spouseNotes').value.trim();

        if (!memberIdStr) {
            alert('Vui lòng chọn người cần thêm vợ/chồng!');
            return;
        }

        if (!spouseName) {
            alert('Vui lòng nhập tên vợ/chồng!');
            return;
        }

        const memberId = memberIdStr;
        const member = this.members.find(m => m.id == memberId);

        if (!member) {
            alert('Không tìm thấy người này!');
            return;
        }

        // Tính thứ tự vợ/chồng tiếp theo
        const existingSpouses = this.members.filter(m => m.spouseOf == memberId);
        const nextOrder = spouseOrder ? parseInt(spouseOrder) : existingSpouses.length;

        // ✅ FIX: Tạo ID với format đúng ngay từ đầu
        const numericId = this.currentId++;
        const spouseId = `spouse_${numericId}`;

        const newSpouse = {
            id: spouseId,  // ✅ Dùng format spouse_XXX ngay từ đầu
            name: spouseName,
            gender: member.gender === 'male' ? 'female' : 'male',
            birthYear: spouseBirthYear || null,
            deathYear: spouseDeathYear || null,
            hometown: spouseHometown || null,
            parentId: member.id,
            notes: spouseNotes.trim() !== '' ? spouseNotes.trim() : null,
            isSpouse: true,
            spouseOf: memberId,
            spouseOrder: nextOrder,
            motherSpouseId: null,
            isMainTree: member.isMainTree
        };

        this.members.push(newSpouse);
        this.saveToStorage();
        this.saveState();
        
        // ✅ LƯU LÊN FIREBASE ngay sau khi thêm
        if (this.saveSpouseToFirebase) {
            this.saveSpouseToFirebase(memberId, newSpouse);
        }
        
        this.updateDropdowns();
        this.renderTree();
        this.showNotification(`Đã thêm vợ/chồng ${spouseName}!`);

        document.getElementById('addSpouseForm').reset();
        document.getElementById('spouseMemberSearch').value = '';
    }

    updateDropdowns() {
        // Update parent selects
        this.updateParentDropdown('parentOptions', 'parentSearch');
        this.updateParentDropdown('editParentOptions', 'editParentSearch');
        
        // Update spouse member select
        this.updateSpouseMemberDropdown('spouseMemberOptions', 'spouseMemberSearch');
    }

    updateParentDropdown(optionsId, searchId, excludeMemberId = null) {
    const optionsDiv = document.getElementById(optionsId);
    if (!optionsDiv) return;

    // Xóa toàn bộ options hiện tại
    optionsDiv.innerHTML = '';
    
    // Thêm option "Không có cha/mẹ" đầu tiên
    const noneOption = document.createElement('div');
    noneOption.className = 'select-option';
    noneOption.dataset.value = '';
    noneOption.textContent = '-- Không có cha/mẹ --';
    optionsDiv.appendChild(noneOption);
    
    // Lọc và hiển thị những người không phải là vợ/chồng và không phải chính người đang sửa
    this.members
        .filter(member => {
            // Loại bỏ người là vợ/chồng
            if (member.isSpouse) return false;
            
            // Loại bỏ chính người đang sửa (nếu có)
            if (excludeMemberId && member.id == excludeMemberId) return false;
            
            return true;
        })
        .forEach(member => {
            const option = document.createElement('div');
            option.className = 'select-option';
            option.dataset.value = member.id;
            
            // Tạo text hiển thị với thông tin đầy đủ hơn
            let displayText = member.name;
            if (member.birthYear || member.deathYear) {
                const years = `${member.birthYear || '?'} - ${member.deathYear || 'nay'}`;
                displayText += ` (${years})`;
            }
            
            option.textContent = displayText;
            optionsDiv.appendChild(option);
        });
}

    updateSpouseMemberDropdown(optionsId, searchId) {
        const optionsDiv = document.getElementById(optionsId);
        if (!optionsDiv) return;

        optionsDiv.innerHTML = '';
        
        // Chỉ hiển thị những người không phải là vợ/chồng
        this.members
            .filter(m => !m.isSpouse)
            .forEach(member => {
                const option = document.createElement('div');
                option.className = 'select-option';
                option.dataset.value = member.id;
                
                const spouseCount = this.members.filter(m => m.spouseOf == member.id).length;
                const spouseInfo = spouseCount > 0 ? `` : '';
                
                // Hiển thị đầy đủ: Tên (Năm sinh - Năm mất)
                let displayText = member.name;
                if (member.birthYear || member.deathYear) {
                    const years = `${member.birthYear || '?'} - ${member.deathYear || 'nay'}`;
                    displayText += ` (${years})`;
                }
                displayText += spouseInfo;
                
                option.textContent = displayText;
                optionsDiv.appendChild(option);
            });
    }

    renderTree() {
        const canvas = document.getElementById('treeCanvas');
        canvas.innerHTML = '';

        const content = document.createElement('div');
        content.className = 'tree-content';
        canvas.appendChild(content);

        // Tìm tất cả người không phải vợ/chồng và không có cha/mẹ
        const rootMembers = this.members.filter(m => !m.isSpouse && !m.parentId);

        if (rootMembers.length === 0) {
            content.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 40px;">Chưa có thành viên nào. Hãy thêm thành viên đầu tiên!</div>';
            this.updateStatistics(); // Cập nhật thống kê ngay cả khi không có thành viên
            return;
        }

        // Phân chia: Người đầu tiên và những người được đánh dấu isMainTree = true là sơ đồ chính
        // Những người còn lại là "chờ xử lý"
        const mainTreeRoots = rootMembers.filter(m => m.isMainTree !== false);
        const pendingMembers = rootMembers.filter(m => m.isMainTree === false);

        // Vẽ sơ đồ chính
        let currentX = 50;
        const startY = 50;

        mainTreeRoots.forEach((root, index) => {
            const width = this.renderPerson(content, root, currentX, startY);
            currentX += width + 150;  // Tăng từ 100 lên 150
        });

        // Vẽ khu vực chờ xử lý
        if (pendingMembers.length > 0) {
            this.renderPendingMembers(content, pendingMembers);
        }

        this.updateTransform();
        this.updateStatistics(); // Cập nhật thống kê sau khi render
    }

    renderPendingMembers(container, pendingMembers) {
        // Tính toán vị trí khu vực "chờ xử lý"
        // Đặt ở góc trên bên phải, cách xa sơ đồ chính
        const pendingStartX = 5500; // Xa về bên phải
        const pendingStartY = 50;
        const nodeWidth = 180;
        const gap = 30;

        // Tạo tiêu đề cho khu vực chờ xử lý
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = `
            position: absolute;
            left: ${pendingStartX}px;
            top: ${pendingStartY - 35}px;
            font-family: 'Crimson Pro', serif;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--accent-color);
            background: rgba(255, 255, 255, 0.9);
            padding: 8px 16px;
            border-radius: 8px;
            border: 2px dashed var(--accent-color);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        titleDiv.textContent = '📌 Chờ xử lý (chưa gán cha/mẹ)';
        container.appendChild(titleDiv);

        // Vẽ từng người trong khu vực chờ
        let currentY = pendingStartY;
        pendingMembers.forEach((member, index) => {
            const node = this.createPersonNode(member);
            node.style.left = pendingStartX + 'px';
            node.style.top = currentY + 'px';
            
            // Thêm viền đặc biệt để phân biệt
            node.style.borderStyle = 'dashed';
            node.style.borderWidth = '3px';
            node.style.opacity = '0.85';
            
            container.appendChild(node);
            currentY += 140 + gap; // Chiều cao node + khoảng cách
        });
    }

    renderPerson(container, person, x, y) {
        const nodeWidth = 250;
        const nodeHeight = 144;
        const verticalGap = 180;  // Tăng từ 120 lên 180
        const horizontalGap = 160;  // Tăng từ 120 lên 160 để tránh node con cháu dính nhau

        // Vẽ node người chính
        const personNode = this.createPersonNode(person);
        personNode.style.left = x + 'px';
        personNode.style.top = y + 'px';
        container.appendChild(personNode);

        // Lấy vợ/chồng
        const spouses = this.members
            .filter(m => m.spouseOf == person.id && m.isSpouse)
            .sort((a, b) => a.spouseOrder - b.spouseOrder);

        let maxWidth = nodeWidth;

        if (spouses.length === 0) {
            // Không có vợ/chồng - vẽ con trực tiếp xuống dưới
            const children = this.members.filter(m => 
                m.parentId == person.id && !m.isSpouse
            );

            if (children.length > 0) {
                const childrenY = y + nodeHeight + verticalGap;
                const totalChildrenWidth = this.calculateTotalWidth(children, horizontalGap);
                const childrenStartX = x + (nodeWidth - totalChildrenWidth) / 2;

                // Chỉ vẽ đường ngang nối các con nếu có nhiều hơn 1 con
                if (children.length > 1) {
                    // Tính vị trí thực tế của node đầu và cuối
                    const firstChildWidth = this.calculatePersonWidth(children[0]);
                    const firstChildNodeX = childrenStartX + (firstChildWidth - nodeWidth) / 2;
                    const firstChildCenterX = firstChildNodeX + nodeWidth / 2;
                    
                    let lastChildX = childrenStartX;
                    for (let i = 0; i < children.length - 1; i++) {
                        lastChildX += this.calculatePersonWidth(children[i]) + horizontalGap;
                    }
                    const lastChildWidth = this.calculatePersonWidth(children[children.length - 1]);
                    const lastChildNodeX = lastChildX + (lastChildWidth - nodeWidth) / 2;
                    const lastChildCenterX = lastChildNodeX + nodeWidth / 2;
                    
                    // Vẽ đường dọc từ cha xuống đến đường ngang
                    this.drawLine(container,
                        x + nodeWidth / 2, y + nodeHeight,
                        x + nodeWidth / 2, childrenY - 50,
                        'vertical'
                    );

                    // Vẽ đường ngang nối các con
                    this.drawLine(container,
                        firstChildCenterX, childrenY - 50,
                        lastChildCenterX, childrenY - 50,
                        'horizontal'
                    );
                } else {
                    // Chỉ có 1 con - vẽ đường thẳng xuống
                    const childWidth = this.calculatePersonWidth(children[0]);
                    const childNodeX = childrenStartX + (childWidth - nodeWidth) / 2;
                    const childCenterX = childNodeX + nodeWidth / 2;
                    this.drawLine(container,
                        x + nodeWidth / 2, y + nodeHeight,
                        childCenterX, childrenY,
                        'vertical'
                    );
                }

                // Vẽ các con
                let childX = childrenStartX;
                children.forEach(child => {
                    const childWidth = this.calculatePersonWidth(child);
                    const childNodeX = childX + (childWidth - nodeWidth) / 2;
                    const childCenterX = childNodeX + nodeWidth / 2;
                    
                    // Chỉ vẽ đường dọc xuống con nếu có nhiều hơn 1 con
                    if (children.length > 1) {
                        this.drawLine(container,
                            childCenterX, childrenY - 50,
                            childCenterX, childrenY,
                            'vertical'
                        );
                    }

                    this.renderPerson(container, child, childNodeX, childrenY);
                    childX += childWidth + horizontalGap;
                });

                maxWidth = Math.max(maxWidth, totalChildrenWidth);
            }
        } else if (spouses.length === 1) {
            // Có 1 vợ/chồng - vẽ xuống dưới
            const spouse = spouses[0];
            const spouseY = y + nodeHeight + verticalGap;
            
            // Vẽ đường xuống từ người chính đến vợ/chồng (màu đỏ)
            this.drawLine(container,
                x + nodeWidth / 2, y + nodeHeight,
                x + nodeWidth / 2, spouseY,
                'vertical', true  // true = đường nối vợ chồng
            );

            // Vẽ node vợ/chồng
            const spouseNode = this.createPersonNode(spouse);
            spouseNode.style.left = x + 'px';
            spouseNode.style.top = spouseY + 'px';
            container.appendChild(spouseNode);

            // Lấy con của cặp này
            // Nếu là vợ đầu tiên (spouseOrder = 0): lấy cả con có motherSpouseId = null (con cũ)
            // Nếu là vợ khác: chỉ lấy con có motherSpouseId = spouse.id
            const children = this.members.filter(m => 
                m.parentId == person.id && 
                !m.isSpouse &&
                (m.motherSpouseId === spouse.id || (spouse.spouseOrder === 0 && m.motherSpouseId === null))
            );

            if (children.length > 0) {
                const childrenY = spouseY + nodeHeight + verticalGap;
                const totalChildrenWidth = this.calculateTotalWidth(children, horizontalGap);
                const childrenStartX = x + (nodeWidth - totalChildrenWidth) / 2;

                // Chỉ vẽ đường ngang nối các con nếu có nhiều hơn 1 con
                if (children.length > 1) {
                    // Tính vị trí thực tế của node đầu và cuối
                    const firstChildWidth = this.calculatePersonWidth(children[0]);
                    const firstChildNodeX = childrenStartX + (firstChildWidth - nodeWidth) / 2;
                    const firstChildCenterX = firstChildNodeX + nodeWidth / 2;
                    
                    let lastChildX = childrenStartX;
                    for (let i = 0; i < children.length - 1; i++) {
                        lastChildX += this.calculatePersonWidth(children[i]) + horizontalGap;
                    }
                    const lastChildWidth = this.calculatePersonWidth(children[children.length - 1]);
                    const lastChildNodeX = lastChildX + (lastChildWidth - nodeWidth) / 2;
                    const lastChildCenterX = lastChildNodeX + nodeWidth / 2;
                    
                    // Vẽ đường dọc từ vợ/chồng xuống đến đường ngang
                    this.drawLine(container,
                        x + nodeWidth / 2, spouseY + nodeHeight,
                        x + nodeWidth / 2, childrenY - 50,
                        'vertical'
                    );

                    // Vẽ đường ngang nối các con
                    this.drawLine(container,
                        firstChildCenterX, childrenY - 50,
                        lastChildCenterX, childrenY - 50,
                        'horizontal'
                    );
                } else {
                    // Chỉ có 1 con - vẽ đường thẳng xuống
                    const childWidth = this.calculatePersonWidth(children[0]);
                    const childNodeX = childrenStartX + (childWidth - nodeWidth) / 2;
                    const childCenterX = childNodeX + nodeWidth / 2;
                    this.drawLine(container,
                        x + nodeWidth / 2, spouseY + nodeHeight,
                        childCenterX, childrenY,
                        'vertical'
                    );
                }

                // Vẽ các con
                let childX = childrenStartX;
                children.forEach(child => {
                    const childWidth = this.calculatePersonWidth(child);
                    const childNodeX = childX + (childWidth - nodeWidth) / 2;
                    const childCenterX = childNodeX + nodeWidth / 2;
                    
                    // Chỉ vẽ đường dọc xuống con nếu có nhiều hơn 1 con
                    if (children.length > 1) {
                        this.drawLine(container,
                            childCenterX, childrenY - 50,
                            childCenterX, childrenY,
                            'vertical'
                        );
                    }

                    this.renderPerson(container, child, childNodeX, childrenY);
                    childX += childWidth + horizontalGap;
                });

                maxWidth = Math.max(maxWidth, totalChildrenWidth);
            }
        } else {
            // Có 2+ vợ/chồng - vẽ tách nhánh sang ngang
            const currentY = y + nodeHeight + verticalGap;

            // Tính chiều rộng cho từng nhánh (bao gồm cả con cháu)
            const branchWidths = [];
            spouses.forEach(spouse => {
                // Nếu là vợ đầu tiên (spouseOrder = 0): lấy cả con có motherSpouseId = null (con cũ)
                // Nếu là vợ khác: chỉ lấy con có motherSpouseId = spouse.id
                const children = this.members.filter(m => 
                    m.parentId == person.id && 
                    !m.isSpouse &&
                    (m.motherSpouseId === spouse.id || (spouse.spouseOrder === 0 && m.motherSpouseId === null))
                );
                
                if (children.length === 0) {
                    branchWidths.push(nodeWidth);
                } else {
                    const totalChildrenWidth = this.calculateTotalWidth(children, horizontalGap);
                    branchWidths.push(Math.max(nodeWidth, totalChildrenWidth));
                }
            });

            const totalBranchWidth = branchWidths.reduce((sum, w) => sum + w, 0) + 
                                     (spouses.length - 1) * horizontalGap;

            // SỬA LỖI: Tính toán vị trí đầu và cuối của đường ngang chính xác hơn
            // Tính vị trí center của nhánh đầu tiên
            const firstBranchCenterX = x + nodeWidth / 2 - totalBranchWidth / 2 + branchWidths[0] / 2;
            
            // Tính vị trí center của nhánh cuối cùng
            let lastBranchStartX = x + nodeWidth / 2 - totalBranchWidth / 2;
            for (let i = 0; i < spouses.length - 1; i++) {
                lastBranchStartX += branchWidths[i] + horizontalGap;
            }
            const lastBranchCenterX = lastBranchStartX + branchWidths[branchWidths.length - 1] / 2;

            // Vẽ đường dọc từ người chính xuống đến đường ngang (màu đỏ - nối vợ chồng)
            this.drawLine(container,
                x + nodeWidth / 2, y + nodeHeight,
                x + nodeWidth / 2, currentY - 50,
                'vertical', true  // true = đường nối vợ chồng
            );
            
            // Vẽ đường ngang nối các nhánh - SỬA LỖI: từ center nhánh đầu đến center nhánh cuối (màu đỏ - nối vợ chồng)
            this.drawLine(container,
                firstBranchCenterX, currentY - 50,
                lastBranchCenterX, currentY - 50,
                'horizontal', true  // true = đường nối vợ chồng
            );

            // Vẽ từng nhánh vợ/chồng
            let branchX = x + nodeWidth / 2 - totalBranchWidth / 2;

            spouses.forEach((spouse, index) => {
                const branchWidth = branchWidths[index];
                const branchCenterX = branchX + branchWidth / 2;
                const spouseX = branchCenterX - nodeWidth / 2;

                // SỬA LỖI: Vẽ đường dọc vào chính giữa node spouse (màu đỏ - nối vợ chồng)
                this.drawLine(container,
                    branchCenterX, currentY - 50,
                    branchCenterX, currentY,
                    'vertical', true  // true = đường nối vợ chồng
                );

                // Vẽ node vợ/chồng
                const spouseNode = this.createPersonNode(spouse);
                spouseNode.style.left = spouseX + 'px';
                spouseNode.style.top = currentY + 'px';
                container.appendChild(spouseNode);

                // Lấy con của nhánh này
                // Nếu là vợ đầu tiên (spouseOrder = 0): lấy cả con có motherSpouseId = null (con cũ)
                // Nếu là vợ khác: chỉ lấy con có motherSpouseId = spouse.id
                const children = this.members.filter(m => 
                    m.parentId == person.id && 
                    !m.isSpouse &&
                    (m.motherSpouseId === spouse.id || (spouse.spouseOrder === 0 && m.motherSpouseId === null))
                );

                if (children.length > 0) {
                    const childrenY = currentY + nodeHeight + verticalGap;
                    const totalChildrenWidth = this.calculateTotalWidth(children, horizontalGap);
                    const childrenStartX = branchX + (branchWidth - totalChildrenWidth) / 2;

                    // Chỉ vẽ đường ngang nối các con nếu có nhiều hơn 1 con
                    if (children.length > 1) {
                        // Tính vị trí thực tế của node đầu và cuối
                        const firstChildWidth = this.calculatePersonWidth(children[0]);
                        const firstChildNodeX = childrenStartX + (firstChildWidth - nodeWidth) / 2;
                        const firstChildCenterX = firstChildNodeX + nodeWidth / 2;
                        
                        let lastChildX = childrenStartX;
                        for (let i = 0; i < children.length - 1; i++) {
                            lastChildX += this.calculatePersonWidth(children[i]) + horizontalGap;
                        }
                        const lastChildWidth = this.calculatePersonWidth(children[children.length - 1]);
                        const lastChildNodeX = lastChildX + (lastChildWidth - nodeWidth) / 2;
                        const lastChildCenterX = lastChildNodeX + nodeWidth / 2;
                        
                        // SỬA LỖI: Vẽ đường dọc từ center của spouse node xuống
                        this.drawLine(container,
                            branchCenterX, currentY + nodeHeight,
                            branchCenterX, childrenY - 50,
                            'vertical'
                        );

                        // Vẽ đường ngang nối các con
                        this.drawLine(container,
                            firstChildCenterX, childrenY - 50,
                            lastChildCenterX, childrenY - 50,
                            'horizontal'
                        );
                    } else {
                        // Chỉ có 1 con - vẽ đường thẳng xuống
                        const childWidth = this.calculatePersonWidth(children[0]);
                        const childNodeX = childrenStartX + (childWidth - nodeWidth) / 2;
                        const childCenterX = childNodeX + nodeWidth / 2;
                        this.drawLine(container,
                            branchCenterX, currentY + nodeHeight,
                            childCenterX, childrenY,
                            'vertical'
                        );
                    }

                    // Vẽ các con
                    let childX = childrenStartX;
                    children.forEach(child => {
                        const childWidth = this.calculatePersonWidth(child);
                        const childNodeX = childX + (childWidth - nodeWidth) / 2;
                        const childCenterX = childNodeX + nodeWidth / 2;
                        
                        // Chỉ vẽ đường dọc xuống con nếu có nhiều hơn 1 con
                        if (children.length > 1) {
                            this.drawLine(container,
                                childCenterX, childrenY - 50,
                                childCenterX, childrenY,
                                'vertical'
                            );
                        }

                        this.renderPerson(container, child, childNodeX, childrenY);
                        childX += childWidth + horizontalGap;
                    });
                }

                branchX += branchWidth + horizontalGap;
            });

            maxWidth = Math.max(maxWidth, totalBranchWidth);
        }

        return maxWidth;
    }

    calculateTotalWidth(persons, gap) {
        if (persons.length === 0) return 0;
        
        let totalWidth = 0;
        persons.forEach((person, index) => {
            totalWidth += this.calculatePersonWidth(person);
            if (index < persons.length - 1) {
                totalWidth += gap;
            }
        });
        
        return totalWidth;
    }

    calculatePersonWidth(person) {
        const nodeWidth = 250;  // Khớp với nodeWidth trong renderPerson
        const horizontalGap = 160;  // Tăng từ 120 lên 160 để tránh node con cháu dính nhau

        // Lấy vợ/chồng
        const spouses = this.members
            .filter(m => m.spouseOf == person.id && m.isSpouse)
            .sort((a, b) => a.spouseOrder - b.spouseOrder);

        if (spouses.length === 0) {
            // Không có vợ/chồng - tính chiều rộng dựa trên con
            const children = this.members.filter(m => 
                m.parentId == person.id && !m.isSpouse
            );
            
            if (children.length === 0) return nodeWidth;
            
            // Tính tổng chiều rộng của tất cả con (đệ quy)
            let totalChildrenWidth = 0;
            children.forEach((child, index) => {
                totalChildrenWidth += this.calculatePersonWidth(child);
                if (index < children.length - 1) {
                    totalChildrenWidth += horizontalGap;
                }
            });
            
            return Math.max(nodeWidth, totalChildrenWidth);
        } else if (spouses.length === 1) {
            // Có 1 vợ/chồng - tính chiều rộng dựa trên con
            const spouse = spouses[0];
            const children = this.members.filter(m => 
                m.parentId == person.id && 
                !m.isSpouse &&
                (m.motherSpouseId === spouse.id || (spouse.spouseOrder === 0 && m.motherSpouseId === null))
            );
            
            if (children.length === 0) return nodeWidth;
            
            // Tính tổng chiều rộng của tất cả con (đệ quy)
            let totalChildrenWidth = 0;
            children.forEach((child, index) => {
                totalChildrenWidth += this.calculatePersonWidth(child);
                if (index < children.length - 1) {
                    totalChildrenWidth += horizontalGap;
                }
            });
            
            return Math.max(nodeWidth, totalChildrenWidth);
        } else {
            // Có 2+ vợ/chồng - tính tổng chiều rộng các nhánh
            let totalBranchWidth = 0;
            
            spouses.forEach((spouse, index) => {
                const children = this.members.filter(m => 
                    m.parentId == person.id && 
                    !m.isSpouse &&
                    (m.motherSpouseId === spouse.id || (spouse.spouseOrder === 0 && m.motherSpouseId === null))
                );
                
                let branchWidth = nodeWidth;
                
                if (children.length > 0) {
                    // Tính tổng chiều rộng của tất cả con trong nhánh này
                    let childrenWidth = 0;
                    children.forEach((child, childIndex) => {
                        childrenWidth += this.calculatePersonWidth(child);
                        if (childIndex < children.length - 1) {
                            childrenWidth += horizontalGap;
                        }
                    });
                    branchWidth = Math.max(nodeWidth, childrenWidth);
                }
                
                totalBranchWidth += branchWidth;
                if (index < spouses.length - 1) {
                    totalBranchWidth += horizontalGap;
                }
            });
            
            return Math.max(nodeWidth, totalBranchWidth);
        }
    }

    createPersonNode(person) {
        const node = document.createElement('div');
        node.className = `person-node ${person.gender}`;
        
        if (person.isSpouse) {
            node.classList.add('spouse-node');
        }
        
        if (person.deathYear) {
            node.classList.add('deceased');
        }

        node.dataset.memberId = person.id;

        // Thêm badge thế hệ
        const generationMap = this.calculateAllGenerations();
        const generation = generationMap.get(person.id);
        if (generation) {
            const badge = document.createElement('div');
            badge.className = 'generation-badge';
            badge.textContent = generation;
            badge.title = `Thế hệ thứ ${generation}`;
            node.appendChild(badge);
        }

        const nameDiv = document.createElement('div');
        nameDiv.className = 'person-name';
        nameDiv.textContent = person.name;
        node.appendChild(nameDiv);

        if (person.birthYear || person.deathYear) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'person-info';
            const birth = person.birthYear || '?';
            // Kiểm tra nếu deathYear là "Chưa rõ" thì hiển thị "Chưa rõ"
            // Nếu là số năm thì hiển thị số năm
            // Nếu null/empty thì không hiển thị gì (người còn sống)
            let death = '';
            if (person.deathYear) {
                // Kiểm tra xem deathYear có phải là "Chưa rõ" hay là số năm
                if (person.deathYear === 'Chưa rõ') {
                    death = 'Chưa rõ';
                } else {
                    death = person.deathYear;
                }
            }
            infoDiv.textContent = death ? `${birth} - ${death}` : birth;
            node.appendChild(infoDiv);
        }

        // Hiển thị thứ tự con hoặc thứ tự vợ/chồng
        let orderText = '';
        if (person.isSpouse) {
            // Hiển thị thứ tự vợ/chồng
            if (person.spouseOrder !== undefined && person.spouseOrder !== null) {
                const partner = this.members.find(m => m.id == person.spouseOf);
                if (partner) {
                    orderText = partner.gender === 'male' ? `Vợ ${person.spouseOrder + 1}` : `Chồng ${person.spouseOrder + 1}`;
                }
            }
        } else {
            // Hiển thị thứ tự con
            if (person.childOrder) {
                orderText = `Con thứ ${person.childOrder}`;
            }
        }
        
        if (orderText) {
            const orderDiv = document.createElement('div');
            orderDiv.className = 'person-notes';
            orderDiv.textContent = orderText;
            node.appendChild(orderDiv);
        }

        // Nút sửa (chỉ hiện khi đã đăng nhập)
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = '✎';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            if (person.isSpouse) {
                this.openEditSpouseModal(person.id);
            } else {
                this.openEditModal(person.id);
            }
        };
        // ✅ Ẩn nút edit khi chưa đăng nhập
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        if (!isLoggedIn) {
            editBtn.style.display = 'none';
        }
        node.appendChild(editBtn);

        // Nút xóa (chỉ hiện khi đã đăng nhập)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '❌';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteMember(person.id);
        };
        // ✅ Ẩn nút delete khi chưa đăng nhập
        if (!isLoggedIn) {
            deleteBtn.style.display = 'none';
        }
        node.appendChild(deleteBtn);
        
        // Click vào node để xem chi tiết
        node.addEventListener('click', (e) => {
            if (!e.target.classList.contains('edit-btn') && !e.target.classList.contains('delete-btn')) {
                this.showPersonDetail(person.id);
            }
        });

        return node;
    }

    drawLine(container, x1, y1, x2, y2, type, isSpouseConnection = false) {
        const line = document.createElement('div');
        line.className = `tree-line ${type}`;
        
        // Thêm class spouse-connection nếu là đường nối vợ chồng
        if (isSpouseConnection) {
            line.classList.add('spouse-connection');
        }

        if (type === 'horizontal') {
            line.style.left = Math.min(x1, x2) + 'px';
            line.style.top = y1 + 'px';
            line.style.width = Math.abs(x2 - x1) + 'px';
        } else {
            line.style.left = x1 + 'px';
            line.style.top = Math.min(y1, y2) + 'px';
            line.style.height = Math.abs(y2 - y1) + 'px';
        }

        container.appendChild(line);
    }

    openEditModal(memberId) {
        const member = this.members.find(m => m.id == memberId);
        if (!member) return;

        document.getElementById('editMemberId').value = member.id;
        document.getElementById('editMemberName').value = member.name;
        document.getElementById('editMemberGender').value = member.gender;
        document.getElementById('editBirthYear').value = member.birthYear || '';
        document.getElementById('editDeathYear').value = member.deathYear || '';
        document.getElementById('editHometown').value = member.hometown || '';
        
        // Set checkbox năm mất
        const editIsDeceased = document.getElementById('editIsDeceased');
        if (editIsDeceased) {
            editIsDeceased.checked = !!member.deathYear;
        }
        
        // Cập nhật dropdown cha/mẹ, loại bỏ chính người đang sửa
        this.updateParentDropdown('editParentOptions', 'editParentSearch', memberId);
        
        // Nếu là vợ/chồng, parentId là spouseOf
        if (member.isSpouse) {
            document.getElementById('editParentId').value = member.spouseOf || '';
            const spouse = this.members.find(m => m.id == member.spouseOf);
            if (spouse) {
                let displayText = spouse.name;
                if (spouse.birthYear || spouse.deathYear) {
                    const years = `${spouse.birthYear || '?'} - ${spouse.deathYear || 'nay'}`;
                    displayText += ` (${years})`;
                }
                document.getElementById('editParentSearch').value = displayText;
            }
            document.getElementById('editChildOrderGroup').style.display = 'none';
        } else {
            document.getElementById('editParentId').value = member.parentId || '';
            if (member.parentId) {
                const parent = this.members.find(m => m.id == member.parentId);
                if (parent) {
                    let displayText = parent.name;
                    if (parent.birthYear || parent.deathYear) {
                        const years = `${parent.birthYear || '?'} - ${parent.deathYear || 'nay'}`;
                        displayText += ` (${years})`;
                    }
                    document.getElementById('editParentSearch').value = displayText;
                }
                // Update spouse parent dropdown - PASS member để set đúng spouse hiện tại
                this.updateEditSpouseParentDropdown(member.parentId, member);
                // Update child order select
                this.updateEditChildOrderSelect(member);
            } else {
                document.getElementById('editParentSearch').value = '';
                document.getElementById('editSpouseParentGroup').style.display = 'none';
                document.getElementById('editChildOrderGroup').style.display = 'none';
            }
        }
        
        document.getElementById('editNotes').value = member.notes || '';

        document.getElementById('editModal').style.display = 'block';
    }

    openEditSpouseModal(spouseId) {
        const spouse = this.members.find(m => m.id == spouseId);
        if (!spouse || !spouse.isSpouse) return;

        document.getElementById('editSpouseMemberId').value = spouse.spouseOf;
        document.getElementById('editSpouseIndex').value = spouse.spouseOrder || 0;
        document.getElementById('editSpouseNameInput').value = spouse.name;
        document.getElementById('editSpouseBirthYear').value = spouse.birthYear || '';
        document.getElementById('editSpouseDeathYear').value = spouse.deathYear || '';
        document.getElementById('editSpouseHometown').value = spouse.hometown || '';
        document.getElementById('editSpouseNotes').value = spouse.notes || '';
        
        // Set checkbox năm mất
        const editSpouseIsDeceased = document.getElementById('editSpouseIsDeceased');
        if (editSpouseIsDeceased) {
            editSpouseIsDeceased.checked = !!spouse.deathYear;
        }
        
        // Update spouse order select
        this.updateEditSpouseOrderSelect(spouse);

        document.getElementById('editSpouseModal').style.display = 'block';
    }

    updateMember() {
        const memberIdStr = document.getElementById('editMemberId').value;
        const member = this.members.find(m => m.id == memberIdStr);

        if (!member) return;

        member.name = document.getElementById('editMemberName').value.trim();
        member.gender = document.getElementById('editMemberGender').value;
        member.birthYear = document.getElementById('editBirthYear').value.trim() || null;
        member.deathYear = document.getElementById('editDeathYear').value.trim() || null;
        member.hometown = document.getElementById('editHometown').value.trim() || null;
        
        const newParentId = document.getElementById('editParentId').value || null;
        const newSpouseParentId = document.getElementById('editSpouseParentId').value || null;
        const childOrder = document.getElementById('editChildOrder').value;
        
        // ✅ VALIDATION: Kiểm tra nếu parent có spouse thì phải chọn spouse
        if (newParentId && !member.isSpouse) {
            const parent = this.members.find(m => m.id == newParentId);
            if (parent) {
                const spouses = this.members.filter(m => m.spouseOf == parent.id && m.isSpouse);
                if (spouses.length > 0 && !newSpouseParentId) {
                    alert('Vui lòng chọn Cha/Mẹ (vợ/chồng của người đã chọn)!');
                    return;
                }
            }
        }
        
        if (childOrder) {
            member.childOrder = parseInt(childOrder);
        }
        
        if (member.isSpouse) {
            member.spouseOf = newParentId;
        } else {
            const oldParentId = member.parentId;
            
            // Kiểm tra xem member có phải là người đứng đầu cây gia phả không
            // Người đứng đầu = người không có cha/mẹ và không phải vợ/chồng (thế hệ 1)
            const isTreeRoot = !oldParentId && !member.isSpouse;
            
            // Nếu đang là người đứng đầu và thêm cha/mẹ mới
            if (isTreeRoot && newParentId) {
                // Cha/mẹ mới sẽ trở thành người đứng đầu
                const newParent = this.members.find(m => m.id == newParentId);
                if (newParent) {
                    // Chuyển cha/mẹ từ "chờ xử lý" vào cây chính
                    newParent.isMainTree = true;
                }
                
                // Cập nhật parentId cho member
                member.parentId = newParentId;
                member.motherSpouseId = newSpouseParentId;
                member.isMainTree = true;
                
                // Lưu ngay để tính toán thế hệ
                this.saveToStorage();
                
                // Thông báo người dùng
                this.showNotification('Đã cập nhật! Cha/mẹ mới đã trở thành người đứng đầu cây gia phả.');
            } else {
                // Trường hợp thông thường
                member.parentId = newParentId;
                member.motherSpouseId = newSpouseParentId;
                
                if (newParentId) {
                    // Có cha/mẹ -> chuyển vào cây chính
                    member.isMainTree = true;
                    
                    // Nếu cha/mẹ đang ở "chờ xử lý", chuyển vào cây chính
                    const parent = this.members.find(m => m.id == newParentId);
                    if (parent && parent.isMainTree === false) {
                        parent.isMainTree = true;
                    }
                } else {
                    // Không có cha/mẹ
                    // Kiểm tra xem có phải người gốc duy nhất không
                    const rootMembers = this.members.filter(m => !m.parentId && !m.isSpouse);
                    if (rootMembers.length === 1 && rootMembers[0].id === memberId) {
                        // Là người gốc duy nhất -> giữ isMainTree = true
                        member.isMainTree = true;
                    } else {
                        // Không phải người gốc duy nhất -> chuyển về "chờ xử lý"
                        member.isMainTree = false;
                    }
                }
            }
        }
        
        member.notes = document.getElementById('editNotes').value.trim() !== '' ? document.getElementById('editNotes').value.trim() : null;

        this.saveToStorage();
        this.saveState();
        
        // ✅ LƯU LÊN FIREBASE sau khi cập nhật
        if (this.saveMemberToFirebase) {
            this.saveMemberToFirebase(member);
        }
        
        this.updateDropdowns();
        this.renderTree();
        document.getElementById('editModal').style.display = 'none';
        
        if (!this.notificationShown) {
            this.showNotification('Đã cập nhật thông tin!');
        }
        this.notificationShown = false;
    }

    deleteMember(memberId) {
        const member = this.members.find(m => m.id == memberId);
        if (!member) return;

        // Kiểm tra xem có con cái không
        const children = this.members.filter(m => 
            (member.isSpouse ? false : m.parentId == memberId)
        );
        
        const spouses = this.members.filter(m => m.spouseOf == memberId);
        
        let confirmMessage = `Bạn có chắc muốn xóa ${member.name}?`;
        if (children.length > 0) {
            confirmMessage += `\n\nCảnh báo: Người này có ${children.length} con. Các con sẽ mất liên kết cha/mẹ.`;
        }
        if (spouses.length > 0) {
            confirmMessage += `\n\nCảnh báo: Người này có ${spouses.length} vợ/chồng sẽ bị xóa.`;
        }

        if (!confirm(confirmMessage)) return;

        // Xóa các vợ/chồng của người này
        const spousesToDelete = this.members.filter(m => m.spouseOf == memberId);
        spousesToDelete.forEach(spouse => {
            // ✅ XÓA KHỎI FIREBASE
            if (this.deleteSpouseFromFirebase) {
                this.deleteSpouseFromFirebase(spouse.id);
            }
        });
        
        this.members = this.members.filter(m => m.spouseOf != memberId);
        
        // ✅ XÓA MEMBER KHỎI FIREBASE
        if (this.deleteMemberFromFirebase) {
            this.deleteMemberFromFirebase(member.id);
        }
        
        // Xóa người này
        this.members = this.members.filter(m => m.id != memberId);
        
        // Cập nhật các con - xóa liên kết cha/mẹ
        children.forEach(child => {
            child.parentId = null;
        });

        // Sắp xếp lại thứ tự các vợ/chồng còn lại nếu người này là vợ/chồng
        if (member.isSpouse && member.spouseOf) {
            const remainingSpouses = this.members
                .filter(m => m.spouseOf == member.spouseOf && m.spouseOrder > member.spouseOrder);
            remainingSpouses.forEach(s => s.spouseOrder--);
        }

        this.saveToStorage();
        this.saveState();
        this.updateDropdowns();
        this.renderTree();
        this.showNotification('Đã xóa thành viên!');
    }

    /**
     * ✨ IMPROVED: Tìm kiếm thông minh với ưu tiên tên riêng
     * Tách họ tên thành các phần và so sánh theo thứ tự ưu tiên:
     * 1. Tên riêng (chữ cuối) bắt đầu bằng query
     * 2. Tên đệm có chứa query
     * 3. Họ hoặc bất kỳ phần nào chứa query
     */
    smartNameMatch(fullName, query) {
        const nameParts = fullName.trim().split(/\s+/);
        const queryLower = query.toLowerCase();
        
        // Tên riêng (chữ cuối cùng)
        const firstName = nameParts[nameParts.length - 1].toLowerCase();
        
        // Tên đệm (các chữ giữa, nếu có)
        const middleNames = nameParts.slice(1, -1).map(n => n.toLowerCase());
        
        // Họ (chữ đầu tiên)
        const lastName = nameParts[0].toLowerCase();
        
        // Điểm ưu tiên (càng thấp càng ưu tiên)
        let priority = 100;
        let matchType = '';
        
        // Priority 1: Tên riêng bắt đầu bằng query (VD: "Q" khớp "Quang")
        if (firstName.startsWith(queryLower)) {
            priority = 1;
            matchType = 'firstName-start';
        }
        // Priority 2: Tên riêng chứa query (VD: "uan" khớp "Quang")
        else if (firstName.includes(queryLower)) {
            priority = 2;
            matchType = 'firstName-contains';
        }
        // Priority 3: Tên đệm bắt đầu bằng query
        else if (middleNames.some(m => m.startsWith(queryLower))) {
            priority = 3;
            matchType = 'middleName-start';
        }
        // Priority 4: Tên đệm chứa query
        else if (middleNames.some(m => m.includes(queryLower))) {
            priority = 4;
            matchType = 'middleName-contains';
        }
        // Priority 5: Họ bắt đầu bằng query
        else if (lastName.startsWith(queryLower)) {
            priority = 5;
            matchType = 'lastName-start';
        }
        // Priority 6: Họ chứa query
        else if (lastName.includes(queryLower)) {
            priority = 6;
            matchType = 'lastName-contains';
        }
        // Priority 7: Toàn bộ tên chứa query (fallback)
        else if (fullName.toLowerCase().includes(queryLower)) {
            priority = 7;
            matchType = 'fullName-contains';
        }
        // Không khớp
        else {
            return null;
        }
        
        return {
            priority,
            matchType,
            firstName,
            fullName
        };
    }

    /**
     * Highlight phần tên khớp với query
     */
    highlightMatchInName(fullName, query, matchType) {
        const queryLower = query.toLowerCase();
        const nameParts = fullName.split(/(\s+)/); // Giữ lại khoảng trắng
        
        return nameParts.map(part => {
            if (part.trim() === '') return part; // Giữ nguyên khoảng trắng
            
            const partLower = part.toLowerCase();
            if (partLower.includes(queryLower)) {
                const index = partLower.indexOf(queryLower);
                const before = part.substring(0, index);
                const match = part.substring(index, index + query.length);
                const after = part.substring(index + query.length);
                return `${before}<mark class="search-highlight">${match}</mark>${after}`;
            }
            return part;
        }).join('');
    }

    /**
     * Lấy text cho badge match type
     */
    getMatchBadgeText(matchType) {
        const badges = {
            'firstName-start': '📌 Tên',
            'firstName-contains': '✓ Tên',
            'middleName-start': '📌 Đệm',
            'middleName-contains': '✓ Đệm',
            'lastName-start': '📌 Họ',
            'lastName-contains': '✓ Họ',
            'fullName-contains': '✓'
        };
        return badges[matchType] || '';
    }

    searchMembers(query) {
        const resultsDiv = document.getElementById('searchResults');
        
        if (!query.trim()) {
            resultsDiv.innerHTML = '';
            return;
        }

        // Tìm và sắp xếp theo độ ưu tiên
        const matchedMembers = this.members
            .map(member => {
                const match = this.smartNameMatch(member.name, query);
                if (match) {
                    return {
                        member,
                        ...match
                    };
                }
                return null;
            })
            .filter(item => item !== null)
            // Sắp xếp theo priority (thấp = ưu tiên cao)
            .sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                // Nếu cùng priority, sắp xếp theo tên
                return a.fullName.localeCompare(b.fullName, 'vi');
            });

        if (matchedMembers.length === 0) {
            resultsDiv.innerHTML = '<div class="no-results">Không tìm thấy kết quả</div>';
            return;
        }

        resultsDiv.innerHTML = '';
        matchedMembers.forEach(({ member, matchType }) => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            // Highlight phần khớp
            const nameSpan = document.createElement('span');
            nameSpan.className = 'search-result-name';
            
            // Tạo HTML highlight
            const highlightedName = this.highlightMatchInName(member.name, query, matchType);
            nameSpan.innerHTML = highlightedName;
            
            const infoSpan = document.createElement('span');
            infoSpan.className = 'search-result-info';
            const birth = member.birthYear || '?';
            const death = member.deathYear || '';
            infoSpan.textContent = death ? `${birth} - ${death}` : birth;
            
            // Badge hiển thị loại khớp (optional, có thể bỏ)
            const badgeSpan = document.createElement('span');
            badgeSpan.className = 'search-match-badge';
            badgeSpan.textContent = this.getMatchBadgeText(matchType);
            
            item.appendChild(nameSpan);
            item.appendChild(badgeSpan);
            item.appendChild(infoSpan);
            
            item.onclick = () => {
                this.highlightMember(member.id);
            };
            
            resultsDiv.appendChild(item);
        });
    }

    highlightMember(memberId) {
        // Xóa highlight cũ
        document.querySelectorAll('.person-node').forEach(node => {
            node.style.animation = '';
        });

        // Highlight member mới
        const node = document.querySelector(`[data-member-id="${memberId}"]`);
        if (node) {
            // SỬA: Scroll canvas vào view trước
            const canvas = document.getElementById('treeCanvas');
            canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Đợi scroll xong rồi mới di chuyển
            setTimeout(() => {
                // Lấy vị trí của node
                const nodeRect = node.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();
                
                // Tính toán vị trí để đưa node vào giữa canvas
                const nodeCenterX = nodeRect.left + nodeRect.width / 2;
                const nodeCenterY = nodeRect.top + nodeRect.height / 2;
                const canvasCenterX = canvasRect.left + canvasRect.width / 2;
                const canvasCenterY = canvasRect.top + canvasRect.height / 2;
                
                // Di chuyển canvas để node ở giữa
                this.translateX += (canvasCenterX - nodeCenterX);
                this.translateY += (canvasCenterY - nodeCenterY);
                this.updateTransform();
                
                // Highlight với animation
                setTimeout(() => {
                    node.style.animation = 'pulse 1s ease-in-out 3';
                }, 300);
            }, 500);  // Đợi 500ms cho scroll animation
        }
    }

    calculateGeneration(memberId, generationMap = new Map(), generation = 1) {
        if (generationMap.has(memberId)) {
            return generationMap.get(memberId);
        }
        
        const member = this.members.find(m => m.id == memberId);
        if (!member) return generation;
        
        generationMap.set(memberId, generation);
        
        // Tính thế hệ cho các con
        const children = this.members.filter(m => m.parentId == memberId && !m.isSpouse);
        children.forEach(child => {
            this.calculateGeneration(child.id, generationMap, generation + 1);
        });
        
        return generation;
    }

    calculateAllGenerations() {
        const generationMap = new Map();
        
        // Tìm các thành viên gốc (không có cha/mẹ và không phải là vợ/chồng)
        const rootMembers = this.members.filter(m => !m.parentId && !m.isSpouse);
        
        // Tính thế hệ cho mỗi cây gia đình
        rootMembers.forEach(root => {
            this.calculateGeneration(root.id, generationMap, 1);
        });
        
        // Gán thế hệ cho vợ/chồng bằng với thế hệ của người kết hôn
        this.members.forEach(member => {
            if (member.isSpouse && member.spouseOf) {
                const spouseGeneration = generationMap.get(member.spouseOf);
                if (spouseGeneration) {
                    generationMap.set(member.id, spouseGeneration);
                }
            }
        });
        
        return generationMap;
    }

    calculateAge(birthYear) {
        if (!birthYear) return null;
        const currentYear = new Date().getFullYear();
        return currentYear - parseInt(birthYear);
    }

    updateStatistics() {
        // Tính tất cả người trong biểu đồ (có cha/mẹ hoặc là gốc, hoặc là vợ/chồng)
        const membersInTree = this.members.filter(m => 
            m.parentId || (!m.parentId && !m.isSpouse) || (m.isSpouse && m.spouseOf)
        );
        
        const totalMembers = membersInTree.length;
        
        // Đếm nam/nữ CÒN SỐNG
        const malesAlive = membersInTree.filter(m => m.gender === 'male' && !m.deathYear).length;
        const femalesAlive = membersInTree.filter(m => m.gender === 'female' && !m.deathYear).length;
        
        // Tính nhóm tuổi - tính tất cả người còn sống
        const currentYear = new Date().getFullYear();
        let ageGroup1 = 0; // 0-15
        let ageGroup2 = 0; // 16-64
        let ageGroup3 = 0; // ≥ 65
        let deceased = 0;
        
        membersInTree.forEach(m => {
            if (!m.deathYear) {
                const age = this.calculateAge(m.birthYear);
                if (age !== null) {
                    if (age <= 15) ageGroup1++;
                    else if (age >= 16 && age <= 64) ageGroup2++;
                    else if (age >= 65) ageGroup3++;
                }
            } else {
                deceased++;
            }
        });
        
        // Tính tổng số thế hệ
        const generationMap = this.calculateAllGenerations();
        const maxGeneration = generationMap.size > 0 ? Math.max(...generationMap.values()) : 0;
        
        // Cập nhật UI
        const totalMembersEl = document.getElementById('totalMembers');
        const maleCountEl = document.getElementById('maleCount');
        const femaleCountEl = document.getElementById('femaleCount');
        const generationCountEl = document.getElementById('generationCount');
        const deceasedCountEl = document.getElementById('deceasedCount');
        const ageGroup1El = document.getElementById('ageGroup1');
        const ageGroup2El = document.getElementById('ageGroup2');
        const ageGroup3El = document.getElementById('ageGroup3');
        
        if (totalMembersEl) totalMembersEl.textContent = totalMembers;
        if (maleCountEl) maleCountEl.textContent = malesAlive;
        if (femaleCountEl) femaleCountEl.textContent = femalesAlive;
        if (generationCountEl) generationCountEl.textContent = maxGeneration;
        if (deceasedCountEl) deceasedCountEl.textContent = deceased;
        if (ageGroup1El) ageGroup1El.textContent = ageGroup1;
        if (ageGroup2El) ageGroup2El.textContent = ageGroup2;
        if (ageGroup3El) ageGroup3El.textContent = ageGroup3;
    }

    updateTransform() {
        const content = document.querySelector('.tree-content');
        if (content) {
            content.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
        }
    }

    zoom(factor) {
        // Lấy kích thước của canvas
        const canvas = document.getElementById('treeCanvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        
        // Tính toán trung tâm viewport
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Tính toán tọa độ world tại tâm viewport
        const worldX = (centerX - this.translateX) / this.scale;
        const worldY = (centerY - this.translateY) / this.scale;
        
        // Lưu scale cũ
        const oldScale = this.scale;
        
        // Cập nhật scale
        this.scale *= factor;
        this.scale = Math.max(0.1, Math.min(5, this.scale)); // Tăng max zoom từ 3 lên 5
        
        // Điều chỉnh translate để giữ tâm viewport cố định
        if (this.scale !== oldScale) {
            this.translateX = centerX - worldX * this.scale;
            this.translateY = centerY - worldY * this.scale;
        }
        
        this.updateTransform();
    }

    resetZoom() {
        this.scale = 1;
        this.translateX = -200;
        this.translateY = -150;
        this.updateTransform();
    }

    startDrag(e) {
        if (e.target.closest('.person-node')) return;
        this.isDragging = true;
        this.startX = e.clientX - this.translateX;
        this.startY = e.clientY - this.translateY;
    }

    drag(e) {
        if (!this.isDragging) return;
        this.translateX = e.clientX - this.startX;
        this.translateY = e.clientY - this.startY;
        this.updateTransform();
    }

    endDrag() {
        this.isDragging = false;
    }

    // Touch event handlers for mobile pinch-to-zoom
    handleTouchStart(e) {
        // Ngăn chặn hành vi mặc định để tránh scroll và zoom của trình duyệt
        if (e.target.closest('.person-node')) return;
        
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 1) {
            // Single touch - start dragging
            e.preventDefault();
            this.isDragging = true;
            this.startX = this.touches[0].clientX - this.translateX;
            this.startY = this.touches[0].clientY - this.translateY;
        } else if (this.touches.length === 2) {
            // Two touches - prepare for pinch zoom
            e.preventDefault();
            this.isDragging = false;
            this.initialDistance = this.getDistance(this.touches[0], this.touches[1]);
            this.initialScale = this.scale;
        }
    }

    handleTouchMove(e) {
        if (e.target.closest('.person-node')) return;
        
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 1 && this.isDragging) {
            // Single touch - drag/pan
            e.preventDefault();
            this.translateX = this.touches[0].clientX - this.startX;
            this.translateY = this.touches[0].clientY - this.startY;
            this.updateTransform();
        } else if (this.touches.length === 2) {
            // Two touches - pinch zoom
            e.preventDefault();
            const currentDistance = this.getDistance(this.touches[0], this.touches[1]);
            const scaleChange = currentDistance / this.initialDistance;
            
            // Calculate new scale
            let newScale = this.initialScale * scaleChange;
            newScale = Math.max(0.1, Math.min(5, newScale)); // Tăng max zoom từ 3 lên 5
            
            // Get the center point between two touches
            const centerX = (this.touches[0].clientX + this.touches[1].clientX) / 2;
            const centerY = (this.touches[0].clientY + this.touches[1].clientY) / 2;
            
            // Calculate the point relative to the canvas before scaling
            const rect = e.target.getBoundingClientRect();
            const worldX = (centerX - rect.left - this.translateX) / this.scale;
            const worldY = (centerY - rect.top - this.translateY) / this.scale;
            
            // Update scale
            this.scale = newScale;
            
            // Adjust translate to keep the center point fixed
            this.translateX = centerX - rect.left - worldX * this.scale;
            this.translateY = centerY - rect.top - worldY * this.scale;
            
            this.updateTransform();
        }
    }

    handleTouchEnd(e) {
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 0) {
            // All touches ended
            this.isDragging = false;
            this.initialDistance = 0;
        } else if (this.touches.length === 1) {
            // One touch remaining after pinch - switch to drag mode
            this.isDragging = true;
            this.startX = this.touches[0].clientX - this.translateX;
            this.startY = this.touches[0].clientY - this.translateY;
        }
    }

    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    handleWheel(e) {
        // Ngăn chặn hành vi scroll mặc định
        e.preventDefault();
        
        // Bỏ qua nếu click vào node
        if (e.target.closest('.person-node')) return;
        
        // Xác định hướng zoom với tốc độ zoom tốt hơn
        // deltaY > 0 = scroll xuống = zoom out
        // deltaY < 0 = scroll lên = zoom in
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? (1 - zoomIntensity) : (1 + zoomIntensity);
        
        // Lấy vị trí chuột tương đối với canvas
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Tính toán tọa độ điểm trên canvas (world coordinates) trước khi zoom
        // Công thức: world_coords = (screen_coords - translate) / scale
        const worldX = (mouseX - this.translateX) / this.scale;
        const worldY = (mouseY - this.translateY) / this.scale;
        
        // Lưu scale cũ để kiểm tra
        const oldScale = this.scale;
        
        // Cập nhật scale mới với giới hạn
        this.scale *= delta;
        this.scale = Math.max(0.1, Math.min(5, this.scale)); // Tăng max zoom từ 3 lên 5
        
        // Chỉ điều chỉnh translate nếu scale thực sự thay đổi
        if (this.scale !== oldScale) {
            // Điều chỉnh translate để giữ điểm chuột cố định
            // Công thức: new_translate = screen_coords - world_coords * new_scale
            this.translateX = mouseX - worldX * this.scale;
            this.translateY = mouseY - worldY * this.scale;
        }
        
        this.updateTransform();
    }

    saveToStorage() {
        localStorage.setItem('familyTreeData', JSON.stringify({
            members: this.members,
            currentId: this.currentId
        }));
    }
    
    saveState() {
        // Không lưu state nếu đang thực hiện undo/redo
        if (this.isUndoRedoAction) return;
        
        // Tạo snapshot của state hiện tại
        const state = {
            members: JSON.parse(JSON.stringify(this.members)),
            currentId: this.currentId
        };
        
        // Xóa các state phía sau historyIndex nếu đã undo
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Thêm state mới
        this.history.push(state);
        
        // Giới hạn kích thước history
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.historyIndex <= 0) {
            this.showNotification('Không thể quay lại thêm!');
            return;
        }
        
        this.historyIndex--;
        this.restoreState(this.history[this.historyIndex]);
        this.showNotification('Đã hoàn tác!');
    }
    
    redo() {
        if (this.historyIndex >= this.history.length - 1) {
            this.showNotification('Không thể tiến tới thêm!');
            return;
        }
        
        this.historyIndex++;
        this.restoreState(this.history[this.historyIndex]);
        this.showNotification('Đã làm lại!');
    }
    
    restoreState(state) {
        this.isUndoRedoAction = true;
        this.members = JSON.parse(JSON.stringify(state.members));
        this.currentId = state.currentId;
        this.saveToStorage();
        this.updateDropdowns();
        this.renderTree();
        this.updateUndoRedoButtons();
        this.isUndoRedoAction = false;
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.disabled = this.historyIndex <= 0;
            undoBtn.style.opacity = this.historyIndex <= 0 ? '0.5' : '1';
            undoBtn.style.cursor = this.historyIndex <= 0 ? 'not-allowed' : 'pointer';
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.historyIndex >= this.history.length - 1;
            redoBtn.style.opacity = this.historyIndex >= this.history.length - 1 ? '0.5' : '1';
            redoBtn.style.cursor = this.historyIndex >= this.history.length - 1 ? 'not-allowed' : 'pointer';
        }
    }

    loadFromStorage() {
        const data = localStorage.getItem('familyTreeData');
        if (data) {
            const parsed = JSON.parse(data);
            this.members = parsed.members || [];
            this.currentId = parsed.currentId || 1;
            this.updateDropdowns();
            this.renderTree();
        }
        
        // Khởi tạo history với state ban đầu
        this.saveState();
    }

    resetData() {
        if (confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác!')) {
            this.members = [];
            this.currentId = 1;
            localStorage.removeItem('familyTreeData');
            this.updateDropdowns();
            this.renderTree();
            this.showNotification('Đã xóa toàn bộ dữ liệu!');
        }
    }

    exportData() {
        const data = {
            version: '1.0',
            appName: 'Sơ Đồ Phả Hệ Gia Đình',
            members: this.members,
            currentId: this.currentId,
            exportDate: new Date().toISOString(),
            totalMembers: this.members.length
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const fileName = `pha-he-${new Date().toISOString().split('T')[0]}.json`;
        
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification(`Đã xuất ${data.totalMembers} thành viên thành công!`);
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Kiểm tra loại file
        if (!file.name.endsWith('.json')) {
            alert('Lỗi: Vui lòng chọn file JSON!');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                // Validation dữ liệu
                if (!data.members || !Array.isArray(data.members)) {
                    throw new Error('Dữ liệu không hợp lệ: thiếu mảng members');
                }
                
                if (typeof data.currentId !== 'number') {
                    throw new Error('Dữ liệu không hợp lệ: currentId phải là số');
                }
                
                // Hiển thị thông tin file
                const importInfo = data.appName || 'Không rõ';
                const totalMembers = data.members.length;
                const exportDate = data.exportDate ? new Date(data.exportDate).toLocaleString('vi-VN') : 'Không rõ';
                
                const confirmMsg = `Thông tin file:\n` +
                    `- Ứng dụng: ${importInfo}\n` +
                    `- Số thành viên: ${totalMembers}\n` +
                    `- Ngày xuất: ${exportDate}\n\n` +
                    `Nhập dữ liệu sẽ ghi đè lên dữ liệu hiện tại (${this.members.length} thành viên).\n` +
                    `Bạn có chắc chắn muốn tiếp tục?`;
                
                if (confirm(confirmMsg)) {
                    this.members = data.members;
                    this.currentId = data.currentId;
                    this.saveToStorage();
                    
                    // Reset history khi import
                    this.history = [];
                    this.historyIndex = -1;
                    this.saveState();
                    
                    this.updateDropdowns();
                    this.renderTree();
                    this.showNotification(`Đã nhập ${totalMembers} thành viên thành công!`);
                }
            } catch (error) {
                console.error('Import error:', error);
                alert(`Lỗi khi nhập dữ liệu:\n${error.message}\n\nVui lòng kiểm tra lại file JSON!`);
            }
        };
        
        reader.onerror = () => {
            alert('Lỗi: Không thể đọc file!');
        };
        
        reader.readAsText(file);
        e.target.value = '';
    }

    showNotification(message) {
        this.notificationShown = true;
        
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: 'Crimson Pro', serif;
            font-size: 1rem;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    updateSpouse() {
        // Hàm này để cập nhật vợ/chồng từ modal edit spouse
        const spouseIdInput = document.getElementById('editSpouseMemberId').value;
        const spouseIndexInput = document.getElementById('editSpouseIndex').value;
        
        // ✅ FIX: Tìm spouse theo spouseOrder và spouseOf
        // Vì form lưu memberId (người chủ) và spouseOrder (thứ tự vợ/chồng)
        const memberId = spouseIdInput; // Đây là ID của người chủ (member)
        const spouseOrder = parseInt(spouseIndexInput); // Thứ tự vợ/chồng
        
        console.log('🔍 Finding spouse:', { memberId, spouseOrder });
        
        const spouse = this.members.find(m => 
            m.isSpouse && 
            m.spouseOf == memberId && 
            m.spouseOrder === spouseOrder
        );
        
        if (!spouse) {
            console.error('❌ Không tìm thấy spouse với:', { memberId, spouseOrder });
            alert('Không tìm thấy thông tin vợ/chồng!');
            return;
        }
        
        console.log('✅ Found spouse:', spouse);

        spouse.name = document.getElementById('editSpouseNameInput').value.trim();
        spouse.birthYear = document.getElementById('editSpouseBirthYear').value.trim() || null;
        spouse.deathYear = document.getElementById('editSpouseDeathYear').value.trim() || null;
        spouse.hometown = document.getElementById('editSpouseHometown').value.trim() || null;
        spouse.notes = document.getElementById('editSpouseNotes').value.trim() !== '' ? document.getElementById('editSpouseNotes').value.trim() : null;
        
        const newSpouseOrder = document.getElementById('editSpouseOrder').value;
        if (newSpouseOrder !== '' && newSpouseOrder !== null) {
            spouse.spouseOrder = parseInt(newSpouseOrder);
        }

        this.saveToStorage();
        this.saveState();
        
        // ✅ LƯU LÊN FIREBASE sau khi cập nhật
        if (this.saveSpouseToFirebase) {
            console.log('💾 Saving spouse to Firebase:', spouse);
            this.saveSpouseToFirebase(memberId, spouse);
        }
        
        this.updateDropdowns();
        this.renderTree();
        document.getElementById('editSpouseModal').style.display = 'none';
        this.showNotification('Đã cập nhật thông tin vợ/chồng!');
    }
    
    // Cập nhật select thứ tự con
    updateChildOrderSelect() {
        const parentId = document.getElementById('parentId').value;
        const childOrderGroup = document.getElementById('childOrderGroup');
        const childOrderSelect = document.getElementById('childOrder');
        
        if (!parentId) {
            childOrderGroup.style.display = 'none';
            return;
        }
        
        // ✅ FIX: Tìm parent theo cả string và number ID
        const parent = this.members.find(m => m.id == parentId);
        if (!parent) {
            childOrderGroup.style.display = 'none';
            return;
        }
        
        const children = this.members.filter(m => m.parentId == parent.id && !m.isSpouse);
        const existingOrders = children.map(c => c.childOrder || 0).filter(o => o > 0);
        
        childOrderGroup.style.display = 'block';
        childOrderSelect.innerHTML = '<option value="">-- Chọn thứ tự --</option>';
        
        // ✅ Luôn hiển thị ít nhất option "Con thứ 1"
        const maxOrder = Math.max(children.length + 1, 1);
        for (let i = 1; i <= maxOrder; i++) {
            if (!existingOrders.includes(i)) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Con thứ ${i}`;
                childOrderSelect.appendChild(option);
            }
        }
        
        console.log('✅ Updated childOrder dropdown:', {
            parentId,
            parentName: parent.name,
            childrenCount: children.length,
            availableOrders: Array.from(childOrderSelect.options).map(o => o.value)
        });
    }
    
    // Cập nhật select thứ tự con trong edit form
    updateEditChildOrderSelect(member) {
        const parentId = member.parentId;
        const childOrderGroup = document.getElementById('editChildOrderGroup');
        const childOrderSelect = document.getElementById('editChildOrder');
        
        if (!parentId) {
            childOrderGroup.style.display = 'none';
            return;
        }
        
        // ✅ FIX: Tìm parent theo cả string và number ID
        const parent = this.members.find(m => m.id == parentId);
        if (!parent) {
            childOrderGroup.style.display = 'none';
            return;
        }
        
        const children = this.members.filter(m => m.parentId == parent.id && !m.isSpouse && m.id != member.id);
        const existingOrders = children.map(c => c.childOrder || 0).filter(o => o > 0);
        
        childOrderGroup.style.display = 'block';
        childOrderSelect.innerHTML = '<option value="">-- Chọn thứ tự --</option>';
        
        const maxOrder = Math.max(children.length + 2, 2);
        for (let i = 1; i <= maxOrder; i++) {
            if (!existingOrders.includes(i) || member.childOrder === i) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Con thứ ${i}`;
                if (member.childOrder === i) {
                    option.selected = true;
                }
                childOrderSelect.appendChild(option);
            }
        }
    }
    
    // Cập nhật select thứ tự vợ
    updateSpouseOrderSelect() {
        const memberId = document.getElementById('spouseMemberId').value;
        const spouseOrderSelect = document.getElementById('spouseOrder');
        
        if (!memberId) {
            spouseOrderSelect.innerHTML = '<option value="">-- Chọn thứ tự --</option>';
            return;
        }
        
        const member = this.members.find(m => m.id == memberId);
        if (!member) return;
        
        const spouses = this.members.filter(m => m.spouseOf == member.id);
        const existingOrders = spouses.map(s => s.spouseOrder || 0);
        
        spouseOrderSelect.innerHTML = '<option value="">-- Chọn thứ tự --</option>';
        
        for (let i = 0; i <= spouses.length; i++) {
            if (!existingOrders.includes(i)) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = member.gender === 'male' ? `Vợ thứ ${i + 1}` : `Chồng thứ ${i + 1}`;
                spouseOrderSelect.appendChild(option);
            }
        }
    }
    
    // Cập nhật select thứ tự vợ trong edit form
    updateEditSpouseOrderSelect(spouse) {
        const memberId = spouse.spouseOf;
        const spouseOrderSelect = document.getElementById('editSpouseOrder');
        
        if (!memberId) {
            spouseOrderSelect.innerHTML = '<option value="">-- Chọn thứ tự --</option>';
            return;
        }
        
        const member = this.members.find(m => m.id == memberId);
        if (!member) return;
        
        const spouses = this.members.filter(m => m.spouseOf == member.id && m.id != spouse.id);
        const existingOrders = spouses.map(s => s.spouseOrder || 0);
        
        spouseOrderSelect.innerHTML = '<option value="">-- Chọn thứ tự --</option>';
        
        for (let i = 0; i <= spouses.length + 1; i++) {
            if (!existingOrders.includes(i) || spouse.spouseOrder === i) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = member.gender === 'male' ? `Vợ thứ ${i + 1}` : `Chồng thứ ${i + 1}`;
                if (spouse.spouseOrder === i) {
                    option.selected = true;
                }
                spouseOrderSelect.appendChild(option);
            }
        }
    }
    
    // Hiển thị chi tiết người
    showPersonDetail(memberId) {
        const member = this.members.find(m => m.id == memberId);
        if (!member) return;
        
        const modal = document.getElementById('detailModal');
        const content = document.getElementById('detailContent');
        
        let html = `<div class="detail-section">`;
        
        // Thông tin cơ bản
        html += `<div class="detail-group">`;
        html += `<h3>Thông Tin Cá Nhân</h3>`;
        html += `<div class="info-grid">`;
        html += `<div class="info-item"><span class="info-label">Họ và tên:</span><span class="info-value">${member.name}</span></div>`;
        html += `<div class="info-item"><span class="info-label">Giới tính:</span><span class="info-value">${member.gender === 'male' ? 'Nam' : 'Nữ'}</span></div>`;
        if (member.birthYear) html += `<div class="info-item"><span class="info-label">Năm sinh:</span><span class="info-value">${member.birthYear}</span></div>`;
        if (member.deathYear) html += `<div class="info-item"><span class="info-label">Năm mất:</span><span class="info-value">${member.deathYear}</span></div>`;
        if (member.hometown) html += `<div class="info-item"><span class="info-label">Quê quán:</span><span class="info-value">${member.hometown}</span></div>`;
        
        // Thế hệ
        const generationMap = this.calculateAllGenerations();
        const generation = generationMap.get(member.id);
        if (generation) html += `<div class="info-item"><span class="info-label">Đời:</span><span class="info-value">Thế hệ thứ ${generation}</span></div>`;
        html += `</div>`;
        html += `</div>`;
        
        // Cha mẹ
        if (member.parentId && !member.isSpouse) {
            const parent = this.members.find(m => m.id == member.parentId);
            if (parent) {
                html += `<div class="detail-group">`;
                html += `<h3>Cha/Mẹ</h3>`;
                html += `<div class="info-grid">`;
                html += `<div class="info-item"><span class="info-label">${parent.gender === 'male' ? 'Cha' : 'Mẹ'}:</span><span class="info-value">${parent.name}`;
                if (parent.birthYear || parent.deathYear) {
                    html += ` (${parent.birthYear || '?'} - ${parent.deathYear || 'nay'})`;
                }
                html += `</span></div>`;
                
                // Mẹ (nếu có nhiều vợ)
                if (member.motherSpouseId) {
                    const mother = this.members.find(m => m.id == member.motherSpouseId);
                    if (mother) {
                        html += `<div class="info-item"><span class="info-label">Mẹ:</span><span class="info-value">${mother.name}`;
                        if (mother.birthYear || mother.deathYear) {
                            html += ` (${mother.birthYear || '?'} - ${mother.deathYear || 'nay'})`;
                        }
                        html += `</span></div>`;
                    }
                }
                
                // Thứ tự con
                if (member.childOrder) {
                    html += `<div class="info-item"><span class="info-label">Thứ tự:</span><span class="info-value">Con thứ ${member.childOrder}</span></div>`;
                }
                html += `</div>`;
                html += `</div>`;
            }
        }
        
        // Helper function để tính thứ tự con trai/con gái
        const getChildGenderOrder = (children, child) => {
            const sameGender = children.filter(c => c.gender === child.gender)
                .sort((a, b) => (a.childOrder || 999) - (b.childOrder || 999));
            const index = sameGender.findIndex(c => c.id === child.id);
            return index + 1;
        };
        
        // Vợ/Chồng - với thông tin con cái của mỗi người
        if (!member.isSpouse) {
            const spouses = this.members.filter(m => m.spouseOf == member.id).sort((a, b) => a.spouseOrder - b.spouseOrder);
            if (spouses.length > 0) {
                html += `<div class="detail-group">`;
                html += `<h3>Vợ/Chồng</h3>`;
                
                spouses.forEach((spouse, index) => {
                    html += `<div class="spouse-section">`;
                    const spouseLabel = spouses.length === 1 
                        ? `${member.gender === 'male' ? 'Vợ' : 'Chồng'}`
                        : `${member.gender === 'male' ? 'Vợ' : 'Chồng'} ${spouse.spouseOrder + 1}`;
                    
                    let spouseInfo = spouse.name;
                    if (spouse.birthYear || spouse.deathYear) {
                        spouseInfo += ` (${spouse.birthYear || '?'} - ${spouse.deathYear || 'nay'})`;
                    }
                    if (spouse.hometown) spouseInfo += ` - ${spouse.hometown}`;
                    
                    html += `<div class="info-item spouse-header"><span class="info-label">${spouseLabel}:</span><span class="info-value">${spouseInfo}</span></div>`;
                    
                    // Con cái của vợ/chồng này - sắp xếp theo thứ tự từ lớn đến nhỏ
                    const spouseChildren = this.members.filter(m => 
                        m.parentId == member.id && 
                        !m.isSpouse && 
                        (!m.motherSpouseId || m.motherSpouseId === spouse.id)
                    ).sort((a, b) => {
                        const orderA = a.childOrder || 999;
                        const orderB = b.childOrder || 999;
                        return orderA - orderB;
                    });
                    
                    if (spouseChildren.length > 0) {
                        const maleCount = spouseChildren.filter(c => c.gender === 'male').length;
                        const femaleCount = spouseChildren.filter(c => c.gender === 'female').length;
                        
                        html += `<div class="info-item"><span class="info-label">Con cái:</span><span class="info-value">Gồm ${maleCount} nam, ${femaleCount} nữ</span></div>`;
                        html += `<div class="info-grid children-grid">`;
                        spouseChildren.forEach(child => {
                            const genderOrder = getChildGenderOrder(spouseChildren, child);
                            const genderText = child.gender === 'male' ? 'trai' : 'gái';
                            let childLabel;
                            
                            if (genderOrder === 1) {
                                childLabel = `Con ${genderText} cả`;
                            } else {
                                childLabel = `Con ${genderText} thứ ${genderOrder}`;
                            }
                            
                            let childInfo = `${child.name}`;
                            if (child.birthYear || child.deathYear) {
                                childInfo += ` (${child.birthYear || '?'} - ${child.deathYear || 'nay'})`;
                            }
                            
                            // Vợ/chồng của con
                            const childSpouses = this.members.filter(m => m.spouseOf == child.id);
                            if (childSpouses.length > 0) {
                                childInfo += ` - Cưới: `;
                                childSpouses.forEach((sp, idx) => {
                                    if (idx > 0) childInfo += ', ';
                                    childInfo += sp.name;
                                    if (sp.birthYear || sp.deathYear) {
                                        childInfo += ` (${sp.birthYear || '?'} - ${sp.deathYear || 'nay'})`;
                                    }
                                });
                            }
                            
                            html += `<div class="info-item child-item"><span class="info-label">${childLabel}:</span><span class="info-value">${childInfo}</span></div>`;
                        });
                        html += `</div>`;
                    }
                    html += `</div>`;
                });
                
                html += `</div>`;
            }
        } else {
            // Nếu là spouse, hiển thị thông tin về chồng/vợ và con cái
            const partner = this.members.find(m => m.id == member.spouseOf);
            if (partner) {
                html += `<div class="detail-group">`;
                html += `<h3>${partner.gender === 'male' ? 'Chồng' : 'Vợ'}</h3>`;
                html += `<div class="info-grid">`;
                html += `<div class="info-item"><span class="info-label">${partner.gender === 'male' ? 'Chồng' : 'Vợ'}:</span><span class="info-value">${partner.name}`;
                if (partner.birthYear || partner.deathYear) {
                    html += ` (${partner.birthYear || '?'} - ${partner.deathYear || 'nay'})`;
                }
                if (partner.hometown) html += ` - ${partner.hometown}`;
                html += `</span></div>`;
                html += `</div>`;
                html += `</div>`;
                
                // Con cái - sắp xếp theo thứ tự từ lớn đến nhỏ
                const children = this.members.filter(m => 
                    m.parentId == partner.id && 
                    !m.isSpouse && 
                    (!m.motherSpouseId || m.motherSpouseId === member.id)
                ).sort((a, b) => {
                    const orderA = a.childOrder || 999;
                    const orderB = b.childOrder || 999;
                    return orderA - orderB;
                });
                
                if (children.length > 0) {
                    const maleCount = children.filter(c => c.gender === 'male').length;
                    const femaleCount = children.filter(c => c.gender === 'female').length;
                    
                    html += `<div class="detail-group">`;
                    html += `<h3>Con Cái</h3>`;
                    html += `<div class="info-grid">`;
                    html += `<div class="info-item"><span class="info-label">Tổng số:</span><span class="info-value">Gồm ${maleCount} nam, ${femaleCount} nữ</span></div>`;
                    html += `</div>`;
                    html += `<div class="info-grid children-grid">`;
                    children.forEach(child => {
                        const genderOrder = getChildGenderOrder(children, child);
                        const genderText = child.gender === 'male' ? 'trai' : 'gái';
                        let childLabel;
                        
                        if (genderOrder === 1) {
                            childLabel = `Con ${genderText} cả`;
                        } else {
                            childLabel = `Con ${genderText} thứ ${genderOrder}`;
                        }
                        
                        let childInfo = `${child.name}`;
                        if (child.birthYear || child.deathYear) {
                            childInfo += ` (${child.birthYear || '?'} - ${child.deathYear || 'nay'})`;
                        }
                        
                        // Vợ/chồng của con
                        const childSpouses = this.members.filter(m => m.spouseOf == child.id);
                        if (childSpouses.length > 0) {
                            childInfo += ` - Cưới: `;
                            childSpouses.forEach((sp, idx) => {
                                if (idx > 0) childInfo += ', ';
                                childInfo += sp.name;
                                if (sp.birthYear || sp.deathYear) {
                                    childInfo += ` (${sp.birthYear || '?'} - ${sp.deathYear || 'nay'})`;
                                }
                            });
                        }
                        
                        html += `<div class="info-item child-item"><span class="info-label">${childLabel}:</span><span class="info-value">${childInfo}</span></div>`;
                    });
                    html += `</div>`;
                    html += `</div>`;
                }
            }
        }
        
        // Ghi chú - hiển thị ở cuối cùng
        if (member.notes) {
            html += `<div class="detail-group">`;
            html += `<h3>Ghi chú</h3>`;
            html += `<div class="info-grid"><div class="info-item info-notes"><span class="info-value">${member.notes}</span></div></div>`;
            html += `</div>`;
        }
        
        html += `</div>`;
        
        content.innerHTML = html;
        modal.style.display = 'block';
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        50% {
            transform: scale(1.1);
            box-shadow: 0 8px 24px rgba(196, 30, 58, 0.5);
            border-color: var(--accent-color);
        }
    }
`;
document.head.appendChild(style);

let familyTree;
document.addEventListener('DOMContentLoaded', () => {
    familyTree = new FamilyTree();
    // ✅ Expose ra window để có thể re-render từ login/logout
    window.familyTree = familyTree;
});