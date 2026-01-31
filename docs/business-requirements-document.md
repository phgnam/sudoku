# 📋 Business Requirements Document (BRD)
# Sudoku Game - Premium Real-time Multiplayer

> **Version**: 1.0
> **Status**: MVP Complete & Playable
> **Last Updated**: January 20, 2026
> **Author**: Business Analyst Team

---

## 📌 1. TỔNG QUAN DỰ ÁN (Project Overview)

### 1.1. Mô tả dự án
**Sudoku Game** là một ứng dụng game Sudoku cao cấp với giao diện mobile-first, hỗ trợ đồng bộ thời gian thực qua nhiều thiết bị, và có chế độ đối kháng (competitive mode) với hệ thống xếp hạng ELO.

### 1.2. Mục tiêu kinh doanh
| Mục tiêu | Mô tả |
|----------|-------|
| **User Acquisition** | Thu hút người chơi casual và hardcore Sudoku |
| **User Retention** | Giữ chân người dùng bằng hệ thống thành tích và ranking |
| **Monetization Potential** | Premium features, ads-free subscription (tương lai) |
| **Platform Coverage** | Web responsive, hỗ trợ mobile/tablet/desktop |

### 1.3. Đối tượng người dùng
| Persona | Đặc điểm |
|---------|----------|
| **Casual Player** | Chơi để thư giãn, thích độ khó Easy/Normal |
| **Competitive Player** | Thích đối đầu, quan tâm đến ranking ELO |
| **Speedrunner** | Tập trung vào thời gian hoàn thành nhanh nhất |
| **Learner** | Người mới học Sudoku, cần hướng dẫn từng bước |

---

## 🎮 2. TÍNH NĂNG CHỨC NĂNG (Functional Requirements)

### 2.1. Chế độ chơi đơn (Single Player Mode)

#### 2.1.1. Hệ thống độ khó (Difficulty System)
| Độ khó | Ô trống | Mô tả | Unlock Condition |
|--------|---------|-------|------------------|
| **Easy** | 38-42 ô | Phù hợp người mới | Mặc định |
| **Normal** | 45-49 ô | Thử thách trung bình | Hoàn thành 3 game Easy |
| **Hard** | 50-54 ô | Dành cho chuyên gia | Hoàn thành 3 game Normal |

#### 2.1.2. Puzzle Library
- **Tổng số puzzle**: 1,200 puzzles được sinh trước
- **Phân bố**: 400 puzzles/độ khó
- **Thuật toán sinh**: Backtracking algorithm đảm bảo nghiệm duy nhất

#### 2.1.3. Hệ thống Hint (Gợi ý)
| Loại Hint | Mô tả | Priority |
|-----------|-------|----------|
| **Show Conflicts** | Highlight các ô vi phạm quy tắc Sudoku | 1 (Cao nhất) |
| **Highlight Suggestion** | Chỉ ra ô chỉ có 1 giá trị khả dĩ với giải thích từng bước | 2 |
| **Reveal Cell** | Điền giá trị đúng vào một ô ngẫu nhiên | 3 (Thấp nhất) |

**Giới hạn**: Tối đa 3 hints/game

#### 2.1.4. Hệ thống lỗi (Mistake System)
- **Tối đa lỗi**: 3 lỗi
- **Định nghĩa lỗi**: Đặt số gây conflict (trùng số trong hàng/cột/box 3x3)
- **Kết thúc game**: Game Over khi đạt 3 lỗi

#### 2.1.5. Tính năng Undo/Redo
- Lịch sử nước đi không giới hạn
- Không thể undo các ô được điền bởi hint
- Undo animation mượt mà

#### 2.1.6. Notes Mode (Ghi chú)
- Toggle giữa chế độ điền số và ghi chú
- Mỗi ô có thể ghi nhiều số candidate
- Notes tự động xóa khi điền số chính thức

#### 2.1.7. Timer System
- **Auto-start**: Timer bắt đầu khi game được tạo
- **Pause/Resume**: Tạm dừng khi chuyển tab hoặc app (cross-tab sync)
- **Server-side tracking**: Thời gian được lưu và đồng bộ từ server
- **Format hiển thị**: MM:SS hoặc HH:MM:SS (nếu > 1 giờ)

---

### 2.2. Chế độ đối kháng (Competitive Mode)

#### 2.2.1. Tổng quan Match System
| Thuộc tính | Giá trị |
|------------|---------|
| **Số người chơi** | 2 (1v1) |
| **Độ khó** | Host chọn (Easy/Normal/Hard) |
| **Room Code** | 6 ký tự alphanumeric (viết hoa) |
| **Thời gian tối đa** | 20 phút/match |
| **ELO Rating** | Có, sử dụng công thức ELO tiêu chuẩn |

#### 2.2.2. Luồng Match (Match Flow)
```
┌─────────────────────────────────────────────────────────────┐
│                      MATCH LIFECYCLE                        │
├─────────────────────────────────────────────────────────────┤
│  CREATE_ROOM → WAITING → READY → PLAYING → FINISHED        │
│       ↓           ↓        ↓        ↓          ↓            │
│   Host tạo    Guest    Cả 2      Match    Kết thúc         │
│   phòng       join     ready     bắt đầu   + ELO           │
└─────────────────────────────────────────────────────────────┘
```

**Các trạng thái Match:**
| Status | Mô tả |
|--------|-------|
| `WAITING` | Host đã tạo phòng, đang chờ Guest |
| `READY` | Guest đã join, đợi cả 2 ready |
| `PLAYING` | Match đang diễn ra |
| `FINISHED` | Match kết thúc (có người thắng hoặc hòa) |
| `CANCELLED` | Match bị hủy |

#### 2.2.3. Hệ thống ELO Rating
```typescript
// ELO Configuration
K_NEW = 32           // K-factor cho người chơi < 30 games
K_ESTABLISHED = 16   // K-factor cho người chơi >= 30 games
GAMES_THRESHOLD = 30 // Số game để trở thành "established"
MINIMUM_RATING = 100 // Rating tối thiểu
DEFAULT_RATING = 1000 // Rating mặc định khi bắt đầu
```

**Công thức ELO:**
```
Expected Score = 1 / (1 + 10^((OpponentRating - PlayerRating) / 400))
Rating Change = K × (Actual - Expected)
```

| Kết quả | Actual Score |
|---------|--------------|
| Win | 1.0 |
| Draw | 0.5 |
| Lose | 0.0 |

#### 2.2.4. Real-time Progress Tracking
- **Host/Guest Progress**: Hiển thị % hoàn thành của đối thủ
- **Sync interval**: Real-time qua WebSocket
- **Progress calculation**: `(Số ô đã điền đúng / Tổng ô trống) × 100%`

#### 2.2.5. Spectator Mode (Chế độ xem)
- Người dùng có thể xem match đang diễn ra
- Không ảnh hưởng đến gameplay
- Xem được progress của cả 2 người chơi
- Auto-redirect khi match kết thúc

#### 2.2.6. Reconnection Handling
| Tình huống | Xử lý |
|------------|-------|
| **Disconnect < 30s** | Cho phép rejoin, game tiếp tục |
| **Disconnect > 30s** | Tính thua, đối thủ thắng |
| **Cả 2 disconnect** | Match bị hủy, không tính ELO |

#### 2.2.7. Rematch System
- Sau khi match kết thúc, có thể yêu cầu rematch
- Đổi vai trò Host/Guest
- Giữ nguyên độ khó
- Cả 2 phải đồng ý


---

### 2.3. Authentication & User Management

#### 2.3.1. Các phương thức xác thực
| Phương thức | Mô tả | Token |
|-------------|-------|-------|
| **Anonymous** | Chơi không cần đăng ký, tự động tạo session | JWT |
| **Register** | Đăng ký bằng username/password | JWT |
| **Login** | Đăng nhập tài khoản đã có | JWT |
| **Migrate** | Chuyển dữ liệu từ Anonymous → Registered | JWT mới |

#### 2.3.2. Session Management
- **Token type**: JWT (JSON Web Token)
- **Token storage**: LocalStorage + Cookie
- **Cross-tab sync**: Đồng bộ auth state qua nhiều tab
- **Auto-refresh**: Token được refresh tự động

#### 2.3.3. User Profile Fields
| Field | Type | Mô tả |
|-------|------|-------|
| `id` | UUID | Primary key |
| `username` | String | Unique, nullable (Anonymous) |
| `displayName` | String | Tên hiển thị |
| `passwordHash` | String | Hashed password |
| `isAnonymous` | Boolean | Người dùng ẩn danh |
| `eloRating` | Integer | Rating ELO (default: 1000) |
| `gamesPlayed` | Integer | Tổng số game đã chơi |
| `gamesWon` | Integer | Số game thắng |
| `bestTimeEasy` | Integer | Thời gian tốt nhất (Easy) |
| `bestTimeNormal` | Integer | Thời gian tốt nhất (Normal) |
| `bestTimeHard` | Integer | Thời gian tốt nhất (Hard) |
| `competitiveWins` | Integer | Số trận thắng competitive |
| `competitiveLosses` | Integer | Số trận thua competitive |
| `competitiveDraws` | Integer | Số trận hòa competitive |

---

### 2.4. Dashboard & Statistics

#### 2.4.1. Solo Statistics
- Tổng số game đã chơi
- Tổng số game thắng
- Tỷ lệ thắng (Win Rate)
- Thời gian tốt nhất theo từng độ khó
- Biểu đồ progress (nếu có)

#### 2.4.2. Competitive Statistics
- ELO Rating hiện tại
- Số trận thắng/thua/hòa
- Win Rate competitive
- Ranking position

#### 2.4.3. Recent Games
- Danh sách 10 game gần nhất
- Hiển thị: Độ khó, Thời gian, Kết quả, Ngày chơi

---

### 2.5. Leaderboard System

#### 2.5.1. Solo Leaderboard
| Metric | Mô tả |
|--------|-------|
| **Best Time (Easy)** | Top 10 thời gian nhanh nhất |
| **Best Time (Normal)** | Top 10 thời gian nhanh nhất |
| **Best Time (Hard)** | Top 10 thời gian nhanh nhất |
| **Most Games Won** | Top 10 người thắng nhiều nhất |

#### 2.5.2. Competitive Leaderboard
| Metric | Mô tả |
|--------|-------|
| **ELO Ranking** | Top người chơi theo ELO |
| **Most Wins** | Top theo số trận thắng |
| **Win Rate** | Top theo tỷ lệ thắng (min 10 games) |

---

### 2.6. Real-time Synchronization (WebSocket)

#### 2.6.1. Socket Events - Game
| Event | Direction | Mô tả |
|-------|-----------|-------|
| `game:state` | Server → Client | Đồng bộ trạng thái game |
| `game:move` | Client → Server | Gửi nước đi |
| `game:undo` | Client → Server | Yêu cầu undo |
| `game:hint` | Client → Server | Yêu cầu hint |
| `game:complete` | Server → Client | Game hoàn thành |
| `game:fail` | Server → Client | Game thất bại |

#### 2.6.2. Socket Events - Match
| Event | Direction | Mô tả |
|-------|-----------|-------|
| `match:create` | Client → Server | Tạo phòng mới |
| `match:join` | Client → Server | Tham gia phòng |
| `match:ready` | Client → Server | Sẵn sàng |
| `match:start` | Server → Client | Match bắt đầu |
| `match:progress` | Both | Đồng bộ tiến độ |
| `match:complete` | Server → Client | Match kết thúc |
| `match:rematch` | Client → Server | Yêu cầu rematch |

#### 2.6.3. Cross-tab Synchronization
- Sử dụng BroadcastChannel API
- Đồng bộ auth state, game state giữa các tab
- Prevent duplicate games


---

### 2.7. UI/UX Features

#### 2.7.1. Theme System
| Theme | Mô tả |
|-------|-------|
| **Light** | Giao diện sáng, mặc định |
| **Dark** | Giao diện tối, tiết kiệm pin |
| **System** | Theo cài đặt hệ thống |

#### 2.7.2. Color Themes (Game Grid)
- **Default**: Màu xanh dương cổ điển
- **Ocean**: Tông xanh biển
- **Forest**: Tông xanh lá
- **Sunset**: Tông cam ấm
- **Lavender**: Tông tím nhạt

#### 2.7.3. Animations & Transitions
- Cell selection animation
- Number input animation
- Victory celebration animation
- Error shake animation
- Smooth page transitions

#### 2.7.4. Accessibility
- Keyboard navigation (Arrow keys, Tab)
- High contrast mode support
- Screen reader compatible
- Touch-friendly buttons (minimum 44x44px)

#### 2.7.5. Responsive Design
| Breakpoint | Mô tả |
|------------|-------|
| Mobile | < 640px - Full screen grid |
| Tablet | 640px - 1024px - Side controls |
| Desktop | > 1024px - Full layout |

---

## 📊 3. USE CASES

### 3.1. Use Case Diagram - Tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUDOKU GAME SYSTEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                    ┌─────────────────┐    │
│  │   Anonymous     │                    │   Registered    │    │
│  │     User        │                    │      User       │    │
│  └────────┬────────┘                    └────────┬────────┘    │
│           │                                      │              │
│           ├──── Play Single Game ────────────────┤              │
│           │                                      │              │
│           ├──── Use Hints ───────────────────────┤              │
│           │                                      │              │
│           ├──── View Leaderboard ────────────────┤              │
│           │                                      │              │
│           │                  ┌───────────────────┤              │
│           │                  │                   │              │
│           │         Play Competitive ────────────┤              │
│           │                  │                   │              │
│           │         View Dashboard ──────────────┤              │
│           │                  │                   │              │
│           │         Migrate Account ─────────────┘              │
│           │                                                     │
│  ┌────────┴────────┐                    ┌─────────────────┐    │
│  │    Spectator    │                    │     System      │    │
│  └────────┬────────┘                    └────────┬────────┘    │
│           │                                      │              │
│           └──── Watch Live Match                 │              │
│                                                  │              │
│                        Generate Puzzles ─────────┘              │
│                        Calculate ELO ────────────┘              │
│                        Sync Game State ──────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. Use Case Details

#### UC-001: Chơi game đơn (Play Single Game)
| Attribute | Description |
|-----------|-------------|
| **Actor** | Anonymous User, Registered User |
| **Precondition** | User đã truy cập trang chủ |
| **Main Flow** | 1. User chọn độ khó<br>2. System tạo game mới với puzzle ngẫu nhiên<br>3. User điền số vào các ô trống<br>4. System validate mỗi nước đi<br>5. User hoàn thành puzzle |
| **Alternative Flow** | 3a. User sử dụng hint<br>3b. User undo/redo<br>3c. User bật notes mode |
| **Exception Flow** | 4a. User đạt 3 lỗi → Game Over |
| **Postcondition** | Game được lưu, stats được cập nhật |

#### UC-002: Tham gia Competitive Match
| Attribute | Description |
|-----------|-------------|
| **Actor** | Registered User |
| **Precondition** | User đã đăng nhập |
| **Main Flow** | 1. User chọn Competitive Mode<br>2. User tạo phòng hoặc nhập room code<br>3. Cả 2 player ready<br>4. Match bắt đầu<br>5. Ai hoàn thành trước thắng |
| **Alternative Flow** | 5a. Timeout 20 phút → So tiến độ |
| **Exception Flow** | 2a. Room không tồn tại<br>3a. Player disconnect |
| **Postcondition** | ELO được cập nhật cho cả 2 |

#### UC-003: Xem Leaderboard
| Attribute | Description |
|-----------|-------------|
| **Actor** | All Users |
| **Precondition** | None |
| **Main Flow** | 1. User mở trang Dashboard<br>2. User chọn tab Leaderboard<br>3. System hiển thị top players |
| **Postcondition** | None |

#### UC-004: Migrate Anonymous Account
| Attribute | Description |
|-----------|-------------|
| **Actor** | Anonymous User |
| **Precondition** | User có session anonymous với data |
| **Main Flow** | 1. User nhấn Register/Login<br>2. User nhập thông tin<br>3. System migrate data sang account mới |
| **Postcondition** | Data được giữ nguyên, user có account |


---

## 🔄 4. USER WORKFLOWS

### 4.1. Single Player Game Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SINGLE PLAYER WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐
     │  START   │
     └────┬─────┘
          │
          ▼
     ┌──────────────┐
     │ Select       │
     │ Difficulty   │
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐      ┌──────────────┐
     │ Create Game  │──────│ Load Puzzle  │
     │ (API Call)   │      │ from Library │
     └──────┬───────┘      └──────────────┘
            │
            ▼
     ┌──────────────┐
     │  Game Loop   │◄────────────────────────────────┐
     └──────┬───────┘                                 │
            │                                         │
            ▼                                         │
     ┌──────────────┐                                │
     │ User Action  │                                │
     └──────┬───────┘                                │
            │                                         │
    ┌───────┼───────┬────────────┬──────────┐       │
    │       │       │            │          │       │
    ▼       ▼       ▼            ▼          ▼       │
┌──────┐ ┌──────┐ ┌──────┐ ┌─────────┐ ┌────────┐  │
│Enter │ │ Use  │ │ Undo │ │  Notes  │ │  Quit  │  │
│Number│ │ Hint │ │/Redo │ │  Mode   │ │  Game  │  │
└──┬───┘ └──┬───┘ └──┬───┘ └────┬────┘ └───┬────┘  │
   │        │        │          │          │       │
   ▼        │        │          │          ▼       │
┌──────────┐│        │          │     ┌─────────┐  │
│ Validate ││        │          │     │Abandon  │  │
│   Move   ││        └──────────┴─────│  Game   │  │
└────┬─────┘│                         └─────────┘  │
     │      │                                      │
  ┌──┴──┐   │                                      │
  │     │   │                                      │
  ▼     ▼   │                                      │
┌────┐┌────┐│                                      │
│ OK ││Fail││                                      │
└──┬─┘└──┬─┘│                                      │
   │     │  │                                      │
   │     ▼  │                                      │
   │  ┌─────┴────┐                                 │
   │  │ Mistakes │                                 │
   │  │   +1     │                                 │
   │  └────┬─────┘                                 │
   │       │                                       │
   │       ▼                                       │
   │  ┌──────────┐    ┌─────────┐                 │
   │  │Mistakes  │YES │  GAME   │                 │
   │  │  >= 3?   │────│  OVER   │                 │
   │  └────┬─────┘    └─────────┘                 │
   │       │NO                                    │
   │       │                                       │
   ▼       ▼                                       │
┌──────────────┐                                   │
│  Is Puzzle   │                                   │
│  Complete?   │                                   │
└──────┬───────┘                                   │
       │                                           │
   ┌───┴───┐                                       │
   │       │                                       │
  YES      NO ─────────────────────────────────────┘
   │
   ▼
┌──────────────┐
│   VICTORY!   │
│ Update Stats │
└──────────────┘
```

### 4.2. Competitive Match Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       COMPETITIVE MATCH WORKFLOW                        │
└─────────────────────────────────────────────────────────────────────────┘

          HOST                                    GUEST
           │                                        │
           ▼                                        │
    ┌──────────────┐                               │
    │ Create Room  │                               │
    │ (Get Code)   │                               │
    └──────┬───────┘                               │
           │                                        │
           ▼                                        ▼
    ┌──────────────┐      Share Code       ┌──────────────┐
    │   WAITING    │◄─────────────────────▶│  Enter Code  │
    │   (Room)     │                       │   & Join     │
    └──────┬───────┘                       └──────┬───────┘
           │                                       │
           ▼                                       ▼
    ┌──────────────────────────────────────────────────┐
    │                    LOBBY                         │
    │           Both players in room                   │
    └────────────────────┬─────────────────────────────┘
                         │
                         ▼
    ┌──────────────────────────────────────────────────┐
    │               READY CHECK                        │
    │     Both players must click "Ready"              │
    └────────────────────┬─────────────────────────────┘
                         │
                         ▼
    ┌──────────────────────────────────────────────────┐
    │               MATCH START                        │
    │          Same puzzle for both                    │
    │          Timer starts (20 min)                   │
    └────────────────────┬─────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
    ┌──────────────┐             ┌──────────────┐
    │ Host Plays   │             │ Guest Plays  │
    │   Sudoku     │◄───────────▶│   Sudoku     │
    │              │  Progress   │              │
    │              │   Sync      │              │
    └──────┬───────┘             └──────┬───────┘
           │                            │
           └──────────┬─────────────────┘
                      │
                      ▼
           ┌──────────────────┐
           │   Match End      │
           │   Conditions:    │
           │ - One completes  │
           │ - 20 min timeout │
           │ - Disconnect     │
           └────────┬─────────┘
                    │
                    ▼
           ┌──────────────────┐
           │  Determine       │
           │  Winner          │
           │  (ELO Update)    │
           └────────┬─────────┘
                    │
                    ▼
           ┌──────────────────┐
           │   Result         │
           │   Screen         │
           └────────┬─────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
   ┌──────────┐         ┌──────────┐
   │ Rematch  │         │   Exit   │
   └──────────┘         └──────────┘
```


---

## 🗄️ 5. DATABASE SCHEMA

### 5.1. Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA                                │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐           ┌──────────────────┐
    │      USER        │           │     PUZZLE       │
    ├──────────────────┤           ├──────────────────┤
    │ id (PK)          │           │ id (PK)          │
    │ username         │           │ difficulty       │
    │ displayName      │           │ puzzle (9x9)     │
    │ passwordHash     │           │ solution (9x9)   │
    │ isAnonymous      │           │ createdAt        │
    │ eloRating        │           └────────┬─────────┘
    │ gamesPlayed      │                    │
    │ gamesWon         │                    │ 1:N
    │ bestTimeEasy     │                    │
    │ bestTimeNormal   │                    ▼
    │ bestTimeHard     │           ┌──────────────────┐
    │ competitiveWins  │           │      GAME        │
    │ competitiveLosses│           ├──────────────────┤
    │ competitiveDraws │      1:N  │ id (PK)          │
    │ createdAt        │◄──────────│ puzzleId (FK)    │
    │ updatedAt        │           │ userId (FK)      │
    └────────┬─────────┘           │ currentGrid      │
             │                     │ moveHistory      │
             │ 1:N                 │ hintedCells      │
             │                     │ mistakes         │
             ▼                     │ hintsUsed        │
    ┌──────────────────┐           │ status           │
    │     MATCH        │           │ elapsedTime      │
    ├──────────────────┤           │ createdAt        │
    │ id (PK)          │           │ completedAt      │
    │ roomCode         │           └──────────────────┘
    │ hostId (FK)      │
    │ guestId (FK)     │           ┌──────────────────┐
    │ puzzleId (FK)    │           │  GAME_HISTORY    │
    │ difficulty       │           ├──────────────────┤
    │ status           │           │ id (PK)          │
    │ hostState        │           │ puzzleId (FK)    │
    │ guestState       │           │ difficulty       │
    │ hostProgress     │           │ userId (FK)      │
    │ guestProgress    │           │ completedAt      │
    │ winnerId (FK)    │           │ elapsedTime      │
    │ createdAt        │           │ isWin            │
    │ startedAt        │           │ mistakes         │
    │ endedAt          │           │ hintsUsed        │
    └──────────────────┘           └──────────────────┘
```

### 5.2. Table Details

#### 5.2.1. USER Table
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | UUID | PK | auto-generated |
| username | VARCHAR(50) | UNIQUE, NULLABLE | null |
| displayName | VARCHAR(100) | NOT NULL | 'Player' |
| passwordHash | VARCHAR(255) | NULLABLE | null |
| isAnonymous | BOOLEAN | NOT NULL | true |
| eloRating | INTEGER | NOT NULL | 1000 |
| gamesPlayed | INTEGER | NOT NULL | 0 |
| gamesWon | INTEGER | NOT NULL | 0 |
| bestTimeEasy | INTEGER | NULLABLE | null |
| bestTimeNormal | INTEGER | NULLABLE | null |
| bestTimeHard | INTEGER | NULLABLE | null |
| competitiveWins | INTEGER | NOT NULL | 0 |
| competitiveLosses | INTEGER | NOT NULL | 0 |
| competitiveDraws | INTEGER | NOT NULL | 0 |

#### 5.2.2. GAME Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| puzzleId | INTEGER | FK → PUZZLE |
| userId | UUID | FK → USER |
| currentGrid | JSON (9x9 array) | NOT NULL |
| moveHistory | JSON (array) | NOT NULL |
| hintedCells | JSON (array) | NOT NULL |
| mistakes | INTEGER | NOT NULL, default 0 |
| hintsUsed | INTEGER | NOT NULL, default 0 |
| status | ENUM | ACTIVE/COMPLETED/FAILED/ABANDONED |
| elapsedTime | INTEGER | seconds |

#### 5.2.3. MATCH Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| roomCode | VARCHAR(6) | UNIQUE, NOT NULL |
| hostId | UUID | FK → USER |
| guestId | UUID | FK → USER, NULLABLE |
| puzzleId | INTEGER | FK → PUZZLE |
| difficulty | ENUM | EASY/NORMAL/HARD |
| status | ENUM | WAITING/READY/PLAYING/FINISHED/CANCELLED |
| hostState | JSON | game state object |
| guestState | JSON | game state object |
| hostProgress | INTEGER | 0-100 |
| guestProgress | INTEGER | 0-100 |
| winnerId | UUID | FK → USER, NULLABLE |

---

## 🔌 6. API REFERENCE

### 6.1. Authentication APIs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/anonymous` | Tạo anonymous session | ❌ |
| POST | `/auth/register` | Đăng ký tài khoản | ❌ |
| POST | `/auth/login` | Đăng nhập | ❌ |
| POST | `/auth/migrate` | Migrate anonymous → registered | ✅ |
| GET | `/auth/me` | Lấy thông tin user | ✅ |

### 6.2. Game APIs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/games` | Tạo game mới | ✅ |
| GET | `/games/:id` | Lấy thông tin game | ✅ |
| GET | `/games/active` | Lấy game đang chơi | ✅ |
| PATCH | `/games/:id/move` | Đánh nước đi | ✅ |
| POST | `/games/:id/undo` | Undo nước đi | ✅ |
| POST | `/games/:id/hint` | Sử dụng hint | ✅ |
| PATCH | `/games/:id/time` | Cập nhật thời gian | ✅ |
| DELETE | `/games/:id` | Abandon game | ✅ |

### 6.3. Leaderboard APIs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/leaderboard/solo` | Solo leaderboard | ❌ |
| GET | `/leaderboard/competitive` | Competitive leaderboard | ❌ |


---

## ⚙️ 7. NON-FUNCTIONAL REQUIREMENTS

### 7.1. Performance
| Metric | Target |
|--------|--------|
| **Page Load Time** | < 2 seconds (First Contentful Paint) |
| **API Response Time** | < 200ms (P95) |
| **WebSocket Latency** | < 100ms |
| **Concurrent Users** | 1000+ users |
| **Database Query** | < 50ms |

### 7.2. Security
| Requirement | Implementation |
|-------------|----------------|
| **Authentication** | JWT tokens with expiration |
| **Password Storage** | bcrypt hash (salt rounds: 10) |
| **CORS** | Configured for allowed origins |
| **Input Validation** | class-validator decorators |
| **SQL Injection** | TypeORM parameterized queries |

### 7.3. Scalability
| Aspect | Strategy |
|--------|----------|
| **Horizontal Scaling** | Stateless API servers |
| **Database** | SQLite (dev) → PostgreSQL (prod) |
| **WebSocket** | Redis adapter for multi-instance |
| **Caching** | In-memory cache for leaderboard |

### 7.4. Availability
| Metric | Target |
|--------|--------|
| **Uptime** | 99.9% |
| **Recovery Time** | < 5 minutes |
| **Data Backup** | Daily automated backups |

### 7.5. Compatibility
| Platform | Support |
|----------|---------|
| **Chrome** | Latest 2 versions |
| **Firefox** | Latest 2 versions |
| **Safari** | Latest 2 versions |
| **Edge** | Latest 2 versions |
| **Mobile Safari** | iOS 14+ |
| **Chrome Mobile** | Android 8+ |

---

## 🌍 8. INTERNATIONALIZATION (i18n)

### 8.1. Supported Languages
| Language | Code | Status |
|----------|------|--------|
| **English** | en | ✅ Complete |
| **Vietnamese** | vi | ✅ Complete |

### 8.2. Translatable Content
- UI labels và buttons
- Error messages
- Game instructions
- Hint explanations
- Toast notifications
- Settings và preferences

---

## 🚀 9. FUTURE ROADMAP & RECOMMENDATIONS

### 9.1. Short-term Improvements (1-3 months)
| Feature | Priority | Effort |
|---------|----------|--------|
| **Daily Challenges** | High | Medium |
| **Achievement System** | High | Medium |
| **Sound Effects** | Medium | Low |
| **Tutorial Mode** | High | Medium |
| **Share on Social Media** | Medium | Low |

### 9.2. Medium-term Improvements (3-6 months)
| Feature | Priority | Effort |
|---------|----------|--------|
| **Tournament Mode** | High | High |
| **Friends System** | Medium | Medium |
| **Custom Puzzles** | Medium | Medium |
| **Mobile App (PWA)** | High | Medium |
| **Offline Mode** | Medium | High |

### 9.3. Long-term Vision (6-12 months)
| Feature | Priority | Effort |
|---------|----------|--------|
| **AI Difficulty Adjustment** | Medium | High |
| **Sudoku Variants** | Low | High |
| **Clan/Team System** | Low | High |
| **Premium Subscription** | High | Medium |
| **Native Mobile Apps** | Medium | Very High |

### 9.4. Technical Debt Recommendations
| Area | Recommendation |
|------|----------------|
| **Testing** | Increase unit test coverage to 80% |
| **Documentation** | Add JSDoc comments to all services |
| **Monitoring** | Implement APM (Application Performance Monitoring) |
| **CI/CD** | Add automated deployment pipeline |
| **Database** | Migrate to PostgreSQL for production |

---

## 📖 10. GLOSSARY

| Term | Definition |
|------|------------|
| **Cell** | Một ô trong lưới Sudoku 9x9 |
| **Box/Block** | Khối 3x3 trong Sudoku |
| **Candidate** | Số có thể điền vào một ô trống |
| **Conflict** | Số trùng lặp trong hàng/cột/box |
| **ELO Rating** | Hệ thống xếp hạng người chơi dựa trên kết quả match |
| **K-factor** | Hệ số biến động ELO |
| **Match** | Trận đấu competitive giữa 2 người |
| **Room Code** | Mã 6 ký tự để join match |
| **Host** | Người tạo phòng match |
| **Guest** | Người tham gia phòng match |
| **Spectator** | Người xem match đang diễn ra |
| **Anonymous User** | Người dùng không đăng ký |
| **Migrate** | Chuyển data từ anonymous sang registered account |

---

## 📎 11. APPENDIX

### 11.1. Technology Stack Summary

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS, CSS Modules |
| **State Management** | Zustand |
| **Backend** | NestJS, TypeScript |
| **Database** | SQLite (dev), TypeORM |
| **Real-time** | Socket.io |
| **Authentication** | JWT (jsonwebtoken) |
| **Password Hashing** | bcrypt |
| **Validation** | class-validator, class-transformer |
| **i18n** | next-intl |

### 11.2. Project Structure

```
sudoku/
├── frontend/                 # Next.js Frontend
│   ├── app/                  # App Router pages
│   │   ├── page.tsx          # Home (difficulty selection)
│   │   ├── game/             # Single player game
│   │   ├── competitive/      # Competitive mode
│   │   └── dashboard/        # User stats & leaderboard
│   ├── components/           # React components
│   │   ├── game/             # Game-related components
│   │   ├── multiplayer/      # Match/lobby components
│   │   └── ui/               # Shared UI components
│   ├── store/                # Zustand stores
│   ├── lib/                  # Utilities, API client
│   └── messages/             # i18n translations
│
├── backend/                  # NestJS Backend
│   ├── src/
│   │   ├── auth/             # Authentication module
│   │   ├── game/             # Game logic module
│   │   ├── match/            # Match/competitive module
│   │   ├── puzzle/           # Puzzle generation
│   │   ├── leaderboard/      # Leaderboard module
│   │   ├── gateway/          # WebSocket gateway
│   │   └── database/         # TypeORM entities
│   └── puzzles/              # Pre-generated puzzles
│
└── docs/                     # Documentation
```

### 11.3. Contact & Support

| Role | Contact |
|------|---------|
| **Product Owner** | [TBD] |
| **Tech Lead** | [TBD] |
| **Business Analyst** | [Your Name] |

---

**© 2026 Sudoku Game Team. All rights reserved.**