# 📝 User Stories - Sudoku Game

> **Version**: 1.0  
> **Last Updated**: January 20, 2026

---

## 🎮 Epic 1: Single Player Game

### US-001: Chọn độ khó và bắt đầu game mới
**As a** Player  
**I want to** chọn độ khó (Easy/Normal/Hard)  
**So that** tôi có thể chơi game phù hợp với trình độ

**Acceptance Criteria:**
- [ ] Hiển thị 3 nút độ khó trên trang chủ
- [ ] Normal locked cho đến khi hoàn thành 3 Easy games
- [ ] Hard locked cho đến khi hoàn thành 3 Normal games
- [ ] Click vào độ khó → redirect sang trang game
- [ ] Puzzle ngẫu nhiên được tải từ server

---

### US-002: Điền số vào ô trống
**As a** Player  
**I want to** click vào ô và điền số  
**So that** tôi có thể giải puzzle

**Acceptance Criteria:**
- [ ] Click ô trống → highlight ô được chọn
- [ ] Numberpad hiển thị số 1-9
- [ ] Click số → điền vào ô đã chọn
- [ ] Không thể sửa ô gốc (số ban đầu)
- [ ] Keyboard input cũng hoạt động (1-9)

---

### US-003: Sử dụng Hint
**As a** Player đang bí  
**I want to** sử dụng hint  
**So that** tôi được gợi ý cách giải tiếp

**Acceptance Criteria:**
- [ ] Nút Hint hiển thị số hints còn lại (max 3)
- [ ] Hint ưu tiên: Conflicts → Suggestion → Reveal
- [ ] Hiển thị animation khi hint được áp dụng
- [ ] Ô được reveal bởi hint không thể undo
- [ ] Nút disabled khi hết hints

---

### US-004: Undo/Redo nước đi
**As a** Player  
**I want to** undo hoặc redo nước đi  
**So that** tôi có thể sửa lỗi

**Acceptance Criteria:**
- [ ] Nút Undo active khi có history
- [ ] Nút Redo active khi đã undo
- [ ] Không thể undo ô được hint reveal
- [ ] Animation mượt khi undo/redo

---

### US-005: Ghi chú (Notes Mode)
**As a** Player  
**I want to** ghi chú các số khả dĩ vào ô  
**So that** tôi có thể loại trừ dần

**Acceptance Criteria:**
- [ ] Toggle button giữa Normal và Notes mode
- [ ] Notes mode: click số → thêm/xóa note
- [ ] Hiển thị notes nhỏ trong ô (grid 3x3 mini)
- [ ] Notes tự xóa khi điền số chính thức

---

### US-006: Hoàn thành puzzle
**As a** Player  
**I want to** thấy kết quả khi hoàn thành  
**So that** tôi biết mình đã thắng

**Acceptance Criteria:**
- [ ] Detect puzzle hoàn thành khi tất cả ô đúng
- [ ] Hiển thị victory modal với confetti
- [ ] Hiển thị thời gian, mistakes, hints used
- [ ] Cập nhật best time nếu tốt hơn
- [ ] Nút "Play Again" và "Home"

---

### US-007: Game Over khi quá nhiều lỗi
**As a** Player  
**I want to** biết khi nào game kết thúc  
**So that** tôi hiểu lý do thua

**Acceptance Criteria:**
- [ ] Counter hiển thị mistakes (X/3)
- [ ] Highlight ô conflict khi đặt số sai
- [ ] 3 mistakes → Game Over modal
- [ ] Nút "Try Again" và "Home"

---

## 🏆 Epic 2: Competitive Mode

### US-008: Tạo phòng competitive
**As a** Registered Player  
**I want to** tạo phòng đấu  
**So that** bạn bè có thể join

**Acceptance Criteria:**
- [ ] Yêu cầu đăng nhập để vào competitive
- [ ] Chọn độ khó cho match
- [ ] Sinh room code 6 ký tự
- [ ] Hiển thị room code để share
- [ ] Copy button cho room code

---

### US-009: Tham gia phòng
**As a** Registered Player  
**I want to** nhập room code và join  
**So that** tôi có thể đấu với host

**Acceptance Criteria:**
- [ ] Input field cho room code
- [ ] Validate code format (6 chars)
- [ ] Error message nếu room không tồn tại
- [ ] Redirect vào waiting room nếu thành công

---

### US-010: Ready và bắt đầu match
**As a** Player trong lobby  
**I want to** nhấn Ready  
**So that** match có thể bắt đầu

**Acceptance Criteria:**
- [ ] Hiển thị trạng thái ready của cả 2
- [ ] Match chỉ start khi cả 2 ready
- [ ] Countdown 3-2-1 trước khi start
- [ ] Cả 2 nhận cùng puzzle

---

### US-011: Xem progress đối thủ
**As a** Player trong match  
**I want to** xem tiến độ đối thủ  
**So that** tôi biết mình đang thắng hay thua

**Acceptance Criteria:**
- [ ] Progress bar hiển thị % hoàn thành
- [ ] Real-time update (WebSocket)
- [ ] Không thấy lưới của đối thủ

---

### US-012: Kết thúc match và xem kết quả
**As a** Player  
**I want to** xem kết quả và ELO change  
**So that** tôi biết ranking thay đổi

**Acceptance Criteria:**
- [ ] Modal hiển thị Win/Lose/Draw
- [ ] Hiển thị ELO trước và sau
- [ ] Hiển thị +/- điểm ELO
- [ ] Nút Rematch và Exit

---

## 👤 Epic 3: User Account

### US-013: Chơi ẩn danh
**As a** New Visitor  
**I want to** chơi ngay không cần đăng ký  
**So that** tôi có thể trải nghiệm nhanh

**Acceptance Criteria:**
- [ ] Auto-create anonymous session
- [ ] Có thể chơi single player
- [ ] Stats được lưu trong session
- [ ] Banner gợi ý đăng ký

---

### US-014: Đăng ký tài khoản
**As a** Anonymous Player  
**I want to** đăng ký để giữ data  
**So that** data không bị mất

**Acceptance Criteria:**
- [ ] Form: username, password, confirm
- [ ] Validate username unique
- [ ] Password min 6 chars
- [ ] Data migrate từ anonymous

---

### US-015: Đăng nhập
**As a** Registered Player  
**I want to** đăng nhập trên thiết bị mới  
**So that** tôi tiếp tục tiến độ

**Acceptance Criteria:**
- [ ] Form: username, password
- [ ] Error message nếu sai
- [ ] Redirect về trang trước đó
- [ ] Remember me option (optional)

---

## 📊 Epic 4: Dashboard & Leaderboard

### US-016: Xem thống kê cá nhân
**As a** Player  
**I want to** xem stats của mình  
**So that** tôi theo dõi tiến bộ

**Acceptance Criteria:**
- [ ] Hiển thị total games, wins
- [ ] Hiển thị win rate %
- [ ] Best times theo độ khó
- [ ] ELO rating (nếu có)

---

### US-017: Xem leaderboard
**As a** Player  
**I want to** xem top players  
**So that** tôi biết vị trí của mình

**Acceptance Criteria:**
- [ ] Tab Solo / Competitive
- [ ] Top 10 mỗi category
- [ ] Highlight nếu mình trong top
- [ ] Show rank, name, score

---

## 🎨 Epic 5: UI/UX

### US-018: Đổi theme
**As a** Player  
**I want to** đổi dark/light mode  
**So that** chơi thoải mái hơn

**Acceptance Criteria:**
- [ ] Toggle trong settings/header
- [ ] Persist preference
- [ ] Support system preference
- [ ] Smooth transition

---

### US-019: Đổi màu game
**As a** Player  
**I want to** đổi color theme  
**So that** game đẹp hơn

**Acceptance Criteria:**
- [ ] Palette: Default, Ocean, Forest, Sunset, Lavender
- [ ] Preview khi hover
- [ ] Persist preference
- [ ] Apply to game grid

---

### US-020: Điều hướng bằng keyboard
**As a** Power User  
**I want to** dùng keyboard  
**So that** chơi nhanh hơn

**Acceptance Criteria:**
- [ ] Arrow keys di chuyển ô
- [ ] Number keys điền số
- [ ] Tab chuyển ô tiếp
- [ ] Backspace xóa

---

## 📱 Epic 6: Mobile Experience

### US-021: Chơi trên mobile
**As a** Mobile User  
**I want to** chơi mượt trên điện thoại  
**So that** chơi mọi lúc mọi nơi

**Acceptance Criteria:**
- [ ] Grid responsive (full width)
- [ ] Touch-friendly buttons (min 44px)
- [ ] Numberpad fixed bottom
- [ ] No horizontal scroll

