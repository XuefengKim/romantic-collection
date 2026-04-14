CREATE DATABASE IF NOT EXISTS romantic_collection DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE romantic_collection;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(64) NOT NULL UNIQUE,
  unionid VARCHAR(64) NULL,
  nickname VARCHAR(64) NULL,
  avatar_url VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS couple_pairs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_a_id INT NOT NULL,
  user_b_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_pair (user_a_id, user_b_id),
  KEY idx_user_a_id (user_a_id),
  KEY idx_user_b_id (user_b_id),
  CONSTRAINT fk_couple_pairs_user_a FOREIGN KEY (user_a_id) REFERENCES users(id),
  CONSTRAINT fk_couple_pairs_user_b FOREIGN KEY (user_b_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS invite_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(16) NOT NULL UNIQUE,
  creator_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at DATETIME NOT NULL,
  used_by_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_creator_id (creator_id),
  KEY idx_used_by_id (used_by_id),
  KEY idx_status_expires_at (status, expires_at),
  CONSTRAINT fk_invite_codes_creator FOREIGN KEY (creator_id) REFERENCES users(id),
  CONSTRAINT fk_invite_codes_used_by FOREIGN KEY (used_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  total_hearts INT NOT NULL DEFAULT 0,
  draw_chances INT NOT NULL DEFAULT 0,
  total_draw_earned INT NOT NULL DEFAULT 0,
  total_draw_used INT NOT NULL DEFAULT 0,
  full_collection_achievement_shown TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_stats_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS task_catalog (
  id INT PRIMARY KEY,
  category VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS card_catalog (
  id INT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  rarity VARCHAR(16) NOT NULL,
  description VARCHAR(255) NOT NULL,
  color VARCHAR(16) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkin_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  task_id INT NOT NULL,
  hearts_delta INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_checkin_user_id_created_at (user_id, created_at),
  KEY idx_checkin_task_id (task_id),
  CONSTRAINT fk_checkin_records_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_checkin_records_task FOREIGN KEY (task_id) REFERENCES task_catalog(id)
);

CREATE TABLE IF NOT EXISTS draw_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  card_id INT NOT NULL,
  rarity VARCHAR(16) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_draw_user_id_created_at (user_id, created_at),
  KEY idx_draw_card_id (card_id),
  CONSTRAINT fk_draw_records_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_draw_records_card FOREIGN KEY (card_id) REFERENCES card_catalog(id)
);

CREATE TABLE IF NOT EXISTS user_card_collection (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  card_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_card (user_id, card_id),
  KEY idx_user_card_collection_user_id (user_id),
  KEY idx_user_card_collection_card_id (card_id),
  CONSTRAINT fk_user_card_collection_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_card_collection_card FOREIGN KEY (card_id) REFERENCES card_catalog(id)
);

INSERT INTO task_catalog (id, category, name, description, active)
VALUES
  (1, 'romantic', '给老婆写一首小诗', '用文字表达爱意', 1),
  (2, 'romantic', '记录一次电影时光', '一起看完一整部电影', 1),
  (3, 'romantic', '打卡一家心动餐厅', '发现新的美味', 1),
  (4, 'housework', '分担一次衣物洗涤', '洗衣服也是爱的表达', 1),
  (5, 'housework', '承包今天的厨房', '今天大厨就是你', 1),
  (6, 'housework', '顺手带走门口的垃圾', '保持家里干净整洁', 1)
ON DUPLICATE KEY UPDATE
  category = VALUES(category),
  name = VALUES(name),
  description = VALUES(description),
  active = VALUES(active);

INSERT INTO card_catalog (id, name, rarity, description, color, active)
VALUES
  (1, '温柔陪看券', 'SR', '放下手机，陪你看30分钟你喜欢的剧', '#7209b7', 1),
  (2, '今日免单券', 'SR', '今天的所有美食开销，由老婆赞助', '#7209b7', 1),
  (3, '晚安按摩券', 'SSR', '缓解一天的疲惫，享受30分钟专属按摩', '#f72585', 1),
  (4, '购物车锦鲤', 'SSR', '200元以内的心愿，老婆帮你实现', '#f72585', 1),
  (5, '爱情森林水', 'UR', '为你浇灌蚂蚁森林，见证我们的爱长成大树', '#d6336c', 1),
  (6, '爱心深夜食堂', 'R', '一份热腾腾的宵夜，温暖你的胃', '#3a86ff', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  rarity = VALUES(rarity),
  description = VALUES(description),
  color = VALUES(color),
  active = VALUES(active);
