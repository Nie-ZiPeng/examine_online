-- Computer-science demo data for the Online Exam System.
-- MySQL 8.x. Creates the database, tables, and repeatable test data.
-- Login password for every seeded account: Password123!

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS exam_system
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE exam_system;

CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher', 'admin') NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100), phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_users_username (username),
    KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL, description TEXT,
    teacher_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_courses_teacher (teacher_id),
    CONSTRAINT fk_courses_teacher FOREIGN KEY (teacher_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exams (
    id INT NOT NULL AUTO_INCREMENT,
    course_id INT NOT NULL, title VARCHAR(200) NOT NULL, description TEXT,
    start_time DATETIME NOT NULL, end_time DATETIME NOT NULL,
    duration INT NOT NULL, total_score INT NOT NULL DEFAULT 100,
    pass_score INT NOT NULL DEFAULT 60, random_order BOOLEAN DEFAULT TRUE,
    max_switch INT DEFAULT 3,
    status ENUM('draft', 'published', 'ongoing', 'finished') DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_exams_course (course_id), KEY idx_exams_status (status),
    CONSTRAINT fk_exams_course FOREIGN KEY (course_id) REFERENCES courses (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
    id INT NOT NULL AUTO_INCREMENT, exam_id INT NOT NULL,
    type ENUM('single', 'multiple', 'judge', 'blank', 'essay') NOT NULL,
    content TEXT NOT NULL, options TEXT, answer TEXT,
    score INT NOT NULL DEFAULT 1, sort_order INT DEFAULT 0, analysis TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_questions_exam (exam_id), KEY idx_questions_type (type),
    CONSTRAINT fk_questions_exam FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_records (
    id INT NOT NULL AUTO_INCREMENT, student_id INT NOT NULL, exam_id INT NOT NULL,
    start_time DATETIME NOT NULL, submit_time DATETIME, score INT DEFAULT 0,
    status ENUM('ongoing', 'submitted', 'graded') DEFAULT 'ongoing',
    switch_count INT DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_student_exam (student_id, exam_id),
    KEY idx_records_student (student_id), KEY idx_records_exam (exam_id),
    CONSTRAINT fk_records_student FOREIGN KEY (student_id) REFERENCES users (id),
    CONSTRAINT fk_records_exam FOREIGN KEY (exam_id) REFERENCES exams (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS answers (
    id INT NOT NULL AUTO_INCREMENT, record_id INT NOT NULL, question_id INT NOT NULL,
    student_answer TEXT, score INT DEFAULT 0, is_correct BOOLEAN,
    graded_at DATETIME, grader_id INT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_record_question (record_id, question_id),
    KEY idx_answers_record (record_id), KEY idx_answers_question (question_id),
    CONSTRAINT fk_answers_record FOREIGN KEY (record_id) REFERENCES exam_records (id) ON DELETE CASCADE,
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions (id),
    CONSTRAINT fk_answers_grader FOREIGN KEY (grader_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

START TRANSACTION;

-- Remove only this seed set, in foreign-key order.
DELETE a FROM answers a
JOIN exam_records r ON r.id = a.record_id
JOIN exams e ON e.id = r.exam_id
JOIN courses c ON c.id = e.course_id
JOIN users t ON t.id = c.teacher_id
WHERE t.username = 'seed_computer_teacher'
  AND e.title IN ('计算机网络原理综合测试', 'Python程序设计基础练习', 'Java面向对象程序设计结课考试');

DELETE r FROM exam_records r
JOIN exams e ON e.id = r.exam_id
JOIN courses c ON c.id = e.course_id
JOIN users t ON t.id = c.teacher_id
WHERE t.username = 'seed_computer_teacher'
  AND e.title IN ('计算机网络原理综合测试', 'Python程序设计基础练习', 'Java面向对象程序设计结课考试');

DELETE q FROM questions q
JOIN exams e ON e.id = q.exam_id
JOIN courses c ON c.id = e.course_id
JOIN users t ON t.id = c.teacher_id
WHERE t.username = 'seed_computer_teacher'
  AND e.title IN ('计算机网络原理综合测试', 'Python程序设计基础练习', 'Java面向对象程序设计结课考试');

DELETE e FROM exams e
JOIN courses c ON c.id = e.course_id
JOIN users t ON t.id = c.teacher_id
WHERE t.username = 'seed_computer_teacher'
  AND e.title IN ('计算机网络原理综合测试', 'Python程序设计基础练习', 'Java面向对象程序设计结课考试');

DELETE c FROM courses c JOIN users t ON t.id = c.teacher_id
WHERE t.username = 'seed_computer_teacher' AND c.name = '计算机科学与编程实践';

DELETE FROM users WHERE username IN (
    'seed_computer_admin', 'seed_computer_teacher',
    'seed_computer_student_01', 'seed_computer_student_02', 'seed_computer_student_03'
);

-- All seeded users use Password123!.
INSERT INTO users (username, password_hash, role, name, email, phone, is_active) VALUES
('seed_computer_admin', '$2b$12$TKS7VJHhwGcT/fBCherTX.TNf/X4M26QTNqmTP8VQ8jG9TtYIUWIO', 'admin', '计算机考试系统管理员', 'seed_computer_admin@example.com', '13800002001', 1),
('seed_computer_teacher', '$2b$12$TKS7VJHhwGcT/fBCherTX.TNf/X4M26QTNqmTP8VQ8jG9TtYIUWIO', 'teacher', '张老师', 'seed_computer_teacher@example.com', '13800002002', 1),
('seed_computer_student_01', '$2b$12$TKS7VJHhwGcT/fBCherTX.TNf/X4M26QTNqmTP8VQ8jG9TtYIUWIO', 'student', '李明', 'seed_computer_student_01@example.com', '13800002011', 1),
('seed_computer_student_02', '$2b$12$TKS7VJHhwGcT/fBCherTX.TNf/X4M26QTNqmTP8VQ8jG9TtYIUWIO', 'student', '王芳', 'seed_computer_student_02@example.com', '13800002012', 1),
('seed_computer_student_03', '$2b$12$TKS7VJHhwGcT/fBCherTX.TNf/X4M26QTNqmTP8VQ8jG9TtYIUWIO', 'student', '赵磊', 'seed_computer_student_03@example.com', '13800002013', 1);

SET @seed_teacher_id = (SELECT id FROM users WHERE username = 'seed_computer_teacher');
INSERT INTO courses (name, description, teacher_id) VALUES
('计算机科学与编程实践', '覆盖计算机网络、Python程序设计和Java面向对象编程的综合测试课程。', @seed_teacher_id);
SET @seed_course_id = (SELECT id FROM courses WHERE teacher_id = @seed_teacher_id AND name = '计算机科学与编程实践');
SET @seed_now = NOW();

INSERT INTO exams (course_id, title, description, start_time, end_time, duration, total_score, pass_score, random_order, max_switch, status) VALUES
(@seed_course_id, '计算机网络原理综合测试', '覆盖OSI模型、TCP/IP协议、子网划分和网络安全基础。', DATE_SUB(@seed_now, INTERVAL 1 HOUR), DATE_ADD(@seed_now, INTERVAL 7 DAY), 45, 100, 60, 0, 3, 'published'),
(@seed_course_id, 'Python程序设计基础练习', '草稿考试，用于测试教师端题目编辑和考试配置流程。', DATE_ADD(@seed_now, INTERVAL 7 DAY), DATE_ADD(@seed_now, INTERVAL 8 DAY), 30, 100, 60, 1, 2, 'draft'),
(@seed_course_id, 'Java面向对象程序设计结课考试', '已结束考试，用于测试成绩列表、阅卷和成绩展示。', DATE_SUB(@seed_now, INTERVAL 14 DAY), DATE_SUB(@seed_now, INTERVAL 13 DAY), 60, 100, 60, 1, 3, 'finished');

SET @published_exam_id = (SELECT id FROM exams WHERE course_id = @seed_course_id AND title = '计算机网络原理综合测试');
SET @draft_exam_id = (SELECT id FROM exams WHERE course_id = @seed_course_id AND title = 'Python程序设计基础练习');
SET @finished_exam_id = (SELECT id FROM exams WHERE course_id = @seed_course_id AND title = 'Java面向对象程序设计结课考试');

-- Published exam: 8 questions, 100 points, all five supported question types.
INSERT INTO questions (exam_id, type, content, options, answer, score, sort_order, analysis) VALUES
(@published_exam_id, 'single', '在TCP/IP模型中，负责端到端可靠传输的是哪一层？', '["网络接口层","网际层","传输层","应用层"]', 'C', 10, 1, '传输层通过TCP提供可靠、有序、面向连接的数据传输。'),
(@published_exam_id, 'single', 'IPv4地址192.168.1.10属于哪一类私有地址？', '["A类","B类","C类","D类"]', 'C', 10, 2, '192.168.0.0/16是常见的C类私有地址网段。'),
(@published_exam_id, 'multiple', '下列哪些协议属于应用层协议？', '["HTTP","DNS","FTP","TCP"]', 'ABC', 15, 3, 'HTTP、DNS和FTP位于应用层，TCP位于传输层。'),
(@published_exam_id, 'multiple', '下列哪些措施可以提高网络通信安全性？', '["使用HTTPS","启用防火墙","定期更新补丁","共享管理员密码"]', 'ABC', 15, 4, '加密传输、边界防护和及时修复漏洞都是基础安全措施。'),
(@published_exam_id, 'judge', 'TCP通过三次握手建立连接。', NULL, '正确', 10, 5, 'TCP连接建立过程包含SYN、SYN-ACK和ACK三个步骤。'),
(@published_exam_id, 'judge', 'UDP协议能够保证数据一定按顺序到达。', NULL, '错误', 10, 6, 'UDP不提供连接、可靠性和顺序保证。'),
(@published_exam_id, 'blank', 'Python中用于定义函数的关键字是____。', NULL, 'def', 10, 7, 'Python使用def关键字声明函数。'),
(@published_exam_id, 'essay', '简述从浏览器输入URL到页面显示的主要网络过程。', NULL, '浏览器解析URL，查询DNS获得服务器IP，建立TCP连接并在HTTPS场景完成TLS握手，发送HTTP请求，服务器返回响应，浏览器解析HTML、CSS和JavaScript并渲染页面。', 20, 8, '答案应覆盖DNS、TCP/TLS、HTTP请求响应以及浏览器渲染。');

-- Draft exam questions for teacher-side editing tests.
INSERT INTO questions (exam_id, type, content, options, answer, score, sort_order, analysis) VALUES
(@draft_exam_id, 'single', 'Python列表的下标默认从几开始？', '["0","1","-1","由列表长度决定"]', 'A', 20, 1, 'Python序列采用从0开始的索引。'),
(@draft_exam_id, 'multiple', '下列哪些是Java的面向对象特征？', '["封装","继承","多态","指针算术"]', 'ABC', 40, 2, '封装、继承和多态是面向对象程序设计的核心特征。'),
(@draft_exam_id, 'essay', '比较Python和Java在类型系统与运行方式上的主要差异。', NULL, 'Python通常采用动态类型并由解释器执行，Java是静态类型语言，源代码编译为字节码后运行在JVM上。', 40, 3, '考查两种语言的类型检查和执行模型。');

-- Finished exam questions used by submitted and graded records.
INSERT INTO questions (exam_id, type, content, options, answer, score, sort_order, analysis) VALUES
(@finished_exam_id, 'single', 'Java中用于创建对象的关键字是？', '["class","new","this","extends"]', 'B', 20, 1, 'new表达式用于实例化对象。'),
(@finished_exam_id, 'multiple', '下列哪些属于Java集合框架中的常用接口？', '["List","Set","Map","Thread"]', 'ABC', 20, 2, 'List、Set和Map是Java集合框架的核心接口。'),
(@finished_exam_id, 'judge', 'Java类可以通过extends关键字继承一个父类。', NULL, '正确', 20, 3, 'Java类支持单继承，使用extends声明父类。'),
(@finished_exam_id, 'blank', 'Java程序的入口方法通常是____。', NULL, 'main', 20, 4, '标准入口方法为public static void main(String[] args)。'),
(@finished_exam_id, 'essay', '说明面向对象设计中封装、继承和多态的含义。', NULL, '封装将数据和操作数据的方法组合并隐藏实现细节；继承让子类复用并扩展父类能力；多态允许同一接口在不同对象上表现出不同实现。', 20, 5, '完整答案应分别解释三个面向对象特征及其作用。');

SET @student_01_id = (SELECT id FROM users WHERE username = 'seed_computer_student_01');
SET @student_02_id = (SELECT id FROM users WHERE username = 'seed_computer_student_02');
SET @student_03_id = (SELECT id FROM users WHERE username = 'seed_computer_student_03');

-- Ongoing record for the published exam.
INSERT INTO exam_records (student_id, exam_id, start_time, submit_time, score, status, switch_count) VALUES
(@student_01_id, @published_exam_id, DATE_SUB(@seed_now, INTERVAL 20 MINUTE), NULL, 0, 'ongoing', 1);
SET @ongoing_record_id = (SELECT id FROM exam_records WHERE student_id = @student_01_id AND exam_id = @published_exam_id);
INSERT INTO answers (record_id, question_id, student_answer, score, is_correct)
SELECT @ongoing_record_id, id, 'C', 10, 1 FROM questions WHERE exam_id = @published_exam_id AND sort_order = 1;

-- Submitted record: objective questions scored, essay pending manual grading.
INSERT INTO exam_records (student_id, exam_id, start_time, submit_time, score, status, switch_count) VALUES
(@student_02_id, @finished_exam_id, DATE_SUB(@seed_now, INTERVAL 10 DAY), DATE_ADD(DATE_SUB(@seed_now, INTERVAL 10 DAY), INTERVAL 48 MINUTE), 80, 'submitted', 0);
SET @submitted_record_id = (SELECT id FROM exam_records WHERE student_id = @student_02_id AND exam_id = @finished_exam_id);
INSERT INTO answers (record_id, question_id, student_answer, score, is_correct) SELECT @submitted_record_id, id, 'B', 20, 1 FROM questions WHERE exam_id = @finished_exam_id AND sort_order = 1;
INSERT INTO answers (record_id, question_id, student_answer, score, is_correct) SELECT @submitted_record_id, id, 'ABC', 20, 1 FROM questions WHERE exam_id = @finished_exam_id AND sort_order = 2;
INSERT INTO answers (record_id, question_id, student_answer, score, is_correct) SELECT @submitted_record_id, id, '正确', 20, 1 FROM questions WHERE exam_id = @finished_exam_id AND sort_order = 3;
INSERT INTO answers (record_id, question_id, student_answer, score, is_correct) SELECT @submitted_record_id, id, 'main', 20, 1 FROM questions WHERE exam_id = @finished_exam_id AND sort_order = 4;
INSERT INTO answers (record_id, question_id, student_answer, score, is_correct) SELECT @submitted_record_id, id, '封装和继承可以复用代码。', 0, NULL FROM questions WHERE exam_id = @finished_exam_id AND sort_order = 5;

-- Graded record: the essay has teacher metadata and partial credit.
INSERT INTO exam_records (student_id, exam_id, start_time, submit_time, score, status, switch_count) VALUES
(@student_03_id, @finished_exam_id, DATE_SUB(@seed_now, INTERVAL 11 DAY), DATE_ADD(DATE_SUB(@seed_now, INTERVAL 11 DAY), INTERVAL 52 MINUTE), 92, 'graded', 2);
SET @graded_record_id = (SELECT id FROM exam_records WHERE student_id = @student_03_id AND exam_id = @finished_exam_id);
SET @grader_id = @seed_teacher_id;
INSERT INTO answers (record_id, question_id, student_answer, score, is_correct, graded_at, grader_id) SELECT @graded_record_id, id, 'B', 20, 1, DATE_SUB(@seed_now, INTERVAL 10 DAY), @grader_id FROM questions WHERE exam_id = @finished_exam_id AND sort_order = 1;
INSERT INTO answers (record_id, question_id, student_answer, score, is_correct, graded_at, grader_id) SELECT @graded_record_id, id, 'ABC', 20, 1, DATE_SUB(@seed_now, INTERVAL 10 DAY), @grader_id FROM questions WHERE exam_id = @finished_exam_id AND sort_order = 2;
INSERT INTO answers (record_id, question_id, student_answer, score, is_correct, graded_at, grader_id) SELECT @graded_record_id, id, '正确', 20, 1, DATE_SUB(@seed_now, INTERVAL 10 DAY), @grader_id FROM questions WHERE exam_id = @finished_exam_id AND sort_order = 3;
INSERT INTO answers (record_id, question_id, student_answer, score, is_correct, graded_at, grader_id) SELECT @graded_record_id, id, 'main', 20, 1, DATE_SUB(@seed_now, INTERVAL 10 DAY), @grader_id FROM questions WHERE exam_id = @finished_exam_id AND sort_order = 4;
INSERT INTO answers (record_id, question_id, student_answer, score, is_correct, graded_at, grader_id) SELECT @graded_record_id, id, '封装隐藏数据，继承复用父类，多态让同一接口有不同实现。', 12, NULL, DATE_SUB(@seed_now, INTERVAL 10 DAY), @grader_id FROM questions WHERE exam_id = @finished_exam_id AND sort_order = 5;

COMMIT;

-- Seeded accounts:
-- seed_computer_admin / Password123!
-- seed_computer_teacher / Password123!
-- seed_computer_student_01 / Password123!
-- seed_computer_student_02 / Password123!
-- seed_computer_student_03 / Password123!
