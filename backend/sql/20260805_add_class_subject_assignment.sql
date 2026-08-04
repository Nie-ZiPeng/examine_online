-- Class / teacher-subject / exam class-assignment schema additions.
-- Run on existing MySQL databases; create_all only adds missing tables,
-- it never ALTERs existing tables. Each change is safe to re-run.

CREATE TABLE IF NOT EXISTS classes (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    grade VARCHAR(50) NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teacher_subjects (
    id INT NOT NULL AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    subject_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_teacher_subjects_teacher_id (teacher_id),
    KEY ix_teacher_subjects_subject_id (subject_id),
    UNIQUE KEY uk_teacher_subject (teacher_id, subject_id),
    CONSTRAINT fk_teacher_subjects_teacher
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_subjects_subject
        FOREIGN KEY (subject_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS exam_classes (
    id INT NOT NULL AUTO_INCREMENT,
    exam_id INT NOT NULL,
    class_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_exam_classes_exam_id (exam_id),
    KEY ix_exam_classes_class_id (class_id),
    UNIQUE KEY uk_exam_class (exam_id, class_id),
    CONSTRAINT fk_exam_classes_exam
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_classes_class
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS exam_students (
    id INT NOT NULL AUTO_INCREMENT,
    exam_id INT NOT NULL,
    student_id INT NOT NULL,
    action VARCHAR(20) NOT NULL COMMENT 'include=额外添加, exclude=排除',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_exam_students_exam_id (exam_id),
    KEY ix_exam_students_student_id (student_id),
    UNIQUE KEY uk_exam_student (exam_id, student_id),
    CONSTRAINT fk_exam_students_exam
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_students_student
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'class_id') = 0,
    'ALTER TABLE users ADD COLUMN class_id INT NULL',
    'SELECT 1'
);
PREPARE statement FROM @sql;
EXECUTE statement;
DEALLOCATE PREPARE statement;

CREATE INDEX IF NOT EXISTS ix_users_class_id ON users (class_id);

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
       AND CONSTRAINT_NAME = 'fk_users_class_id') = 0,
    'ALTER TABLE users ADD CONSTRAINT fk_users_class_id FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE statement FROM @sql;
EXECUTE statement;
DEALLOCATE PREPARE statement;
