/*
    DatabaseBusinessRules_Patch03.sql

    Muc tieu:
    - Tach rieng username va ten hien thi cua nguoi dung.
    - Username duoc dung de dang nhap.
    - Name duoc dung de hien thi tren he thong.
    - Khong sua cac file cu, chi tao patch bo sung.

    Thu tu chay:
    1. SQLQuery1.sql
    2. DatabaseBusinessRules.sql
    3. DatabaseBusinessRules_Patch01.sql
    4. DatabaseBusinessRules_Patch02.sql
    5. DatabaseBusinessRules_Patch03.sql
*/

SET NOCOUNT ON;
GO

/* =========================================================
   PATCH 03 - BO SUNG USERNAME CHO USERS
   ========================================================= */

/*
    Nghiep vu moi:
    - Users.username = ten tai khoan dung de dang nhap
    - Users.name = ten hien thi cua nguoi dung
*/
IF COL_LENGTH(N'dbo.Users', N'username') IS NULL
BEGIN
    ALTER TABLE dbo.Users
    ADD username NVARCHAR(100) NULL;
END;
GO

/*
    Backfill username cho du lieu cu:
    - Neu chua co username thi sinh tu name
    - Neu trung nhau thi them _userId de dam bao unique
*/
;WITH prepared AS (
    SELECT
        u.userId,
        baseUsername = LOWER(
            REPLACE(
                REPLACE(
                    REPLACE(LTRIM(RTRIM(ISNULL(u.name, N''))), N' ', N''),
                    N'.',
                    N''
                ),
                N'@',
                N''
            )
        )
    FROM dbo.Users u
),
normalized AS (
    SELECT
        p.userId,
        baseUsername = CASE
            WHEN p.baseUsername = N'' THEN CONCAT(N'user', p.userId)
            ELSE p.baseUsername
        END
    FROM prepared p
),
ranked AS (
    SELECT
        n.userId,
        finalUsername = CASE
            WHEN COUNT(*) OVER (PARTITION BY n.baseUsername) = 1 THEN n.baseUsername
            ELSE CONCAT(n.baseUsername, N'_', n.userId)
        END
    FROM normalized n
)
UPDATE u
SET username = LEFT(r.finalUsername, 100)
FROM dbo.Users u
INNER JOIN ranked r ON r.userId = u.userId
WHERE u.username IS NULL
   OR LTRIM(RTRIM(u.username)) = N'';
GO

IF EXISTS (
    SELECT 1
    FROM dbo.Users
    WHERE username IS NULL
       OR LTRIM(RTRIM(username)) = N''
)
BEGIN
    THROW 56001, N'Khong the bo sung username cho mot so user hien tai.', 1;
END;
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Users')
      AND name = N'username'
      AND is_nullable = 1
)
BEGIN
    ALTER TABLE dbo.Users
    ALTER COLUMN username NVARCHAR(100) NOT NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_Users_Username'
      AND object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    CREATE UNIQUE INDEX UX_Users_Username
        ON dbo.Users(username);
END;
GO

/* =========================================================
   PATCH 03 - SUA NGHIEP VU DANG KY
   ========================================================= */

/*
    Nghiep vu moi:
    - Dang ky su dung username, ten hien thi, email, passwordHash, role.
    - Tuong thich nguoc:
      + Neu chua truyen username thi he thong tam lay username = name.
*/
CREATE OR ALTER PROCEDURE dbo.usp_RegisterUser
    @username NVARCHAR(100) = NULL,
    @name NVARCHAR(100),
    @email NVARCHAR(150),
    @passwordHash NVARCHAR(255),
    @role NVARCHAR(20) = N'user'
AS
BEGIN
    SET NOCOUNT ON;

    IF @username IS NULL OR LTRIM(RTRIM(@username)) = N''
    BEGIN
        SET @username = @name;
    END;

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE username = @username)
    BEGIN
        THROW 56002, N'Ten tai khoan da ton tai.', 1;
    END;

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE email = @email)
    BEGIN
        THROW 55001, N'Email da ton tai.', 1;
    END;

    INSERT INTO dbo.Users (username, name, email, passwordHash, role)
    VALUES (@username, @name, @email, @passwordHash, @role);

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS userId;
END;
GO

/* =========================================================
   PATCH 03 - SUA NGHIEP VU XEM HO SO
   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.usp_GetUserProfile
    @userId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        userId,
        username,
        name,
        email,
        role,
        isActive,
        isVerified,
        createdAt,
        updatedAt
    FROM dbo.Users
    WHERE userId = @userId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 55004, N'Nguoi dung khong ton tai.', 1;
    END;
END;
GO

/* =========================================================
   PATCH 03 - SUA NGHIEP VU CAP NHAT HO SO
   ========================================================= */

/*
    Nghiep vu moi:
    - Name la ten hien thi.
    - Username la ten tai khoan.
    - Cho phep cap nhat ten hien thi, va co the cap nhat username neu truyen vao.
*/
CREATE OR ALTER PROCEDURE dbo.usp_UpdateUserProfile
    @userId INT,
    @name NVARCHAR(100),
    @username NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @username IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM dbo.Users
            WHERE username = @username
              AND userId <> @userId
       )
    BEGIN
        THROW 56003, N'Ten tai khoan da ton tai.', 1;
    END;

    UPDATE dbo.Users
    SET
        name = @name,
        username = ISNULL(@username, username)
    WHERE userId = @userId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 55005, N'Nguoi dung khong ton tai.', 1;
    END;
END;
GO

/* =========================================================
   PATCH 03 - BO SUNG NGHIEP VU PHUC VU DANG NHAP THEO USERNAME
   ========================================================= */

/*
    Muc dich:
    - Backend lay thong tin can thiet de xac thuc dang nhap bang username.
*/
CREATE OR ALTER PROCEDURE dbo.usp_GetUserAuthByUsername
    @username NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        userId,
        username,
        name,
        email,
        passwordHash,
        role,
        isActive,
        isVerified,
        createdAt,
        updatedAt
    FROM dbo.Users
    WHERE username = @username;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 56004, N'Ten tai khoan khong ton tai.', 1;
    END;
END;
GO

/* =========================================================
   PATCH 03 - KIEM TRA NHANH DOI TUONG DA CAP NHAT
   ========================================================= */

SELECT
    N'PATCH03_COLUMN' AS objectType,
    N'Users.username' AS objectName
WHERE EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Users')
      AND name = N'username'
)
UNION ALL
SELECT
    N'PATCH03_INDEX',
    N'UX_Users_Username'
WHERE EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Users')
      AND name = N'UX_Users_Username'
)
UNION ALL
SELECT
    N'PATCH03_PROCEDURE',
    name
FROM sys.procedures
WHERE name IN (
    N'usp_RegisterUser',
    N'usp_GetUserProfile',
    N'usp_UpdateUserProfile',
    N'usp_GetUserAuthByUsername'
)
ORDER BY objectType, objectName;
GO
