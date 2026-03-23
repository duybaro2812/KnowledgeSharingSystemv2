/*
    Script tao lai schema cho he thong chia se tri thuc/tai lieu.
    Chay script nay tren database dang rong du lieu.
*/

SET NOCOUNT ON;

/* =========================
   DROP TABLES CU THEO THU TU
   ========================= */

IF OBJECT_ID(N'dbo.UserActivityLogs', N'U') IS NOT NULL DROP TABLE dbo.UserActivityLogs;
IF OBJECT_ID(N'dbo.DownloadHistory', N'U') IS NOT NULL DROP TABLE dbo.DownloadHistory;
IF OBJECT_ID(N'dbo.PointTransactions', N'U') IS NOT NULL DROP TABLE dbo.PointTransactions;
IF OBJECT_ID(N'dbo.Reports', N'U') IS NOT NULL DROP TABLE dbo.Reports;
IF OBJECT_ID(N'dbo.DocumentReviews', N'U') IS NOT NULL DROP TABLE dbo.DocumentReviews;
IF OBJECT_ID(N'dbo.DocumentApprovals', N'U') IS NOT NULL DROP TABLE dbo.DocumentApprovals;
IF OBJECT_ID(N'dbo.Answers', N'U') IS NOT NULL DROP TABLE dbo.Answers;
IF OBJECT_ID(N'dbo.Questions', N'U') IS NOT NULL DROP TABLE dbo.Questions;
IF OBJECT_ID(N'dbo.Comments', N'U') IS NOT NULL DROP TABLE dbo.Comments;
IF OBJECT_ID(N'dbo.DocumentCategories', N'U') IS NOT NULL DROP TABLE dbo.DocumentCategories;
IF OBJECT_ID(N'dbo.Documents', N'U') IS NOT NULL DROP TABLE dbo.Documents;
IF OBJECT_ID(N'dbo.AccessRules', N'U') IS NOT NULL DROP TABLE dbo.AccessRules;
IF OBJECT_ID(N'dbo.Categories', N'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID(N'dbo.ContentEvaluations', N'U') IS NOT NULL DROP TABLE dbo.ContentEvaluations;
IF OBJECT_ID(N'dbo.UserAccessState', N'U') IS NOT NULL DROP TABLE dbo.UserAccessState;
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL DROP TABLE dbo.Users;

/* =========================
   CREATE TABLES
   ========================= */

CREATE TABLE dbo.Users (
    userId INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL,
    passwordHash NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) NOT NULL
        CONSTRAINT CK_Users_Role CHECK (role IN (N'user', N'moderator', N'admin')),
    points INT NOT NULL
        CONSTRAINT DF_Users_Points DEFAULT (0)
        CONSTRAINT CK_Users_Points CHECK (points >= 0),
    isActive BIT NOT NULL
        CONSTRAINT DF_Users_IsActive DEFAULT (1),
    isVerified BIT NOT NULL
        CONSTRAINT DF_Users_IsVerified DEFAULT (0),
    createdAt DATETIME2 NOT NULL
        CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSDATETIME()),
    updatedAt DATETIME2 NULL,
    CONSTRAINT UQ_Users_Email UNIQUE (email)
);

CREATE TABLE dbo.Categories (
    categoryId INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(255) NULL,
    isActive BIT NOT NULL
        CONSTRAINT DF_Categories_IsActive DEFAULT (1),
    CONSTRAINT UQ_Categories_Name UNIQUE (name)
);

CREATE TABLE dbo.AccessRules (
    ruleId INT IDENTITY(1,1) PRIMARY KEY,
    minPoints INT NOT NULL,
    maxPoints INT NOT NULL,
    allowedDuration INT NOT NULL,
    canDownload BIT NOT NULL,
    canUpload BIT NOT NULL,
    description NVARCHAR(255) NULL,
    CONSTRAINT CK_AccessRules_PointRange CHECK (minPoints >= 0 AND maxPoints >= minPoints),
    CONSTRAINT CK_AccessRules_AllowedDuration CHECK (allowedDuration > 0)
);

CREATE TABLE dbo.Documents (
    documentId INT IDENTITY(1,1) PRIMARY KEY,
    ownerUserId INT NOT NULL,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    fileUrl NVARCHAR(500) NOT NULL,
    status NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Documents_Status DEFAULT (N'pending')
        CONSTRAINT CK_Documents_Status CHECK (status IN (N'pending', N'approved', N'rejected', N'hidden')),
    createdAt DATETIME2 NOT NULL
        CONSTRAINT DF_Documents_CreatedAt DEFAULT (SYSDATETIME()),
    updatedAt DATETIME2 NULL,
    CONSTRAINT FK_Documents_Users
        FOREIGN KEY (ownerUserId) REFERENCES dbo.Users(userId)
);

CREATE TABLE dbo.DocumentCategories (
    documentId INT NOT NULL,
    categoryId INT NOT NULL,
    createdAt DATETIME2 NOT NULL
        CONSTRAINT DF_DocumentCategories_CreatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_DocumentCategories PRIMARY KEY (documentId, categoryId),
    CONSTRAINT FK_DocumentCategories_Documents
        FOREIGN KEY (documentId) REFERENCES dbo.Documents(documentId) ON DELETE CASCADE,
    CONSTRAINT FK_DocumentCategories_Categories
        FOREIGN KEY (categoryId) REFERENCES dbo.Categories(categoryId)
);

CREATE TABLE dbo.Comments (
    commentId INT IDENTITY(1,1) PRIMARY KEY,
    documentId INT NOT NULL,
    authorUserId INT NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Comments_Status DEFAULT (N'active')
        CONSTRAINT CK_Comments_Status CHECK (status IN (N'active', N'hidden')),
    createdAt DATETIME2 NOT NULL
        CONSTRAINT DF_Comments_CreatedAt DEFAULT (SYSDATETIME()),
    updatedAt DATETIME2 NULL,
    CONSTRAINT FK_Comments_Documents
        FOREIGN KEY (documentId) REFERENCES dbo.Documents(documentId) ON DELETE CASCADE,
    CONSTRAINT FK_Comments_Users
        FOREIGN KEY (authorUserId) REFERENCES dbo.Users(userId)
);

CREATE TABLE dbo.Questions (
    questionId INT IDENTITY(1,1) PRIMARY KEY,
    documentId INT NOT NULL,
    askerUserId INT NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Questions_Status DEFAULT (N'open')
        CONSTRAINT CK_Questions_Status CHECK (status IN (N'open', N'resolved', N'hidden')),
    createdAt DATETIME2 NOT NULL
        CONSTRAINT DF_Questions_CreatedAt DEFAULT (SYSDATETIME()),
    updatedAt DATETIME2 NULL,
    CONSTRAINT FK_Questions_Documents
        FOREIGN KEY (documentId) REFERENCES dbo.Documents(documentId) ON DELETE CASCADE,
    CONSTRAINT FK_Questions_Users
        FOREIGN KEY (askerUserId) REFERENCES dbo.Users(userId)
);

CREATE TABLE dbo.Answers (
    answerId INT IDENTITY(1,1) PRIMARY KEY,
    questionId INT NOT NULL,
    responderUserId INT NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    isAccepted BIT NOT NULL
        CONSTRAINT DF_Answers_IsAccepted DEFAULT (0),
    status NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Answers_Status DEFAULT (N'active')
        CONSTRAINT CK_Answers_Status CHECK (status IN (N'active', N'hidden')),
    createdAt DATETIME2 NOT NULL
        CONSTRAINT DF_Answers_CreatedAt DEFAULT (SYSDATETIME()),
    updatedAt DATETIME2 NULL,
    CONSTRAINT FK_Answers_Questions
        FOREIGN KEY (questionId) REFERENCES dbo.Questions(questionId) ON DELETE CASCADE,
    CONSTRAINT FK_Answers_Users
        FOREIGN KEY (responderUserId) REFERENCES dbo.Users(userId)
);

CREATE TABLE dbo.DocumentReviews (
    reviewId INT IDENTITY(1,1) PRIMARY KEY,
    documentId INT NOT NULL,
    moderatorUserId INT NOT NULL,
    decision NVARCHAR(20) NOT NULL
        CONSTRAINT CK_DocumentReviews_Decision CHECK (decision IN (N'approved', N'rejected')),
    note NVARCHAR(255) NULL,
    createdAt DATETIME2 NOT NULL
        CONSTRAINT DF_DocumentReviews_CreatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_DocumentReviews_Documents
        FOREIGN KEY (documentId) REFERENCES dbo.Documents(documentId),
    CONSTRAINT FK_DocumentReviews_Users
        FOREIGN KEY (moderatorUserId) REFERENCES dbo.Users(userId)
);

CREATE TABLE dbo.Reports (
    reportId INT IDENTITY(1,1) PRIMARY KEY,
    reporterUserId INT NOT NULL,
    documentId INT NULL,
    commentId INT NULL,
    questionId INT NULL,
    answerId INT NULL,
    reason NVARCHAR(255) NOT NULL,
    status NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Reports_Status DEFAULT (N'pending')
        CONSTRAINT CK_Reports_Status CHECK (status IN (N'pending', N'reviewed', N'resolved', N'dismissed')),
    reviewedByUserId INT NULL,
    reviewNote NVARCHAR(255) NULL,
    createdAt DATETIME2 NOT NULL
        CONSTRAINT DF_Reports_CreatedAt DEFAULT (SYSDATETIME()),
    reviewedAt DATETIME2 NULL,
    CONSTRAINT FK_Reports_Reporter
        FOREIGN KEY (reporterUserId) REFERENCES dbo.Users(userId),
    CONSTRAINT FK_Reports_Reviewer
        FOREIGN KEY (reviewedByUserId) REFERENCES dbo.Users(userId),
    CONSTRAINT FK_Reports_Documents
        FOREIGN KEY (documentId) REFERENCES dbo.Documents(documentId),
    CONSTRAINT FK_Reports_Comments
        FOREIGN KEY (commentId) REFERENCES dbo.Comments(commentId),
    CONSTRAINT FK_Reports_Questions
        FOREIGN KEY (questionId) REFERENCES dbo.Questions(questionId),
    CONSTRAINT FK_Reports_Answers
        FOREIGN KEY (answerId) REFERENCES dbo.Answers(answerId),
    CONSTRAINT CK_Reports_ExactlyOneTarget CHECK (
        (CASE WHEN documentId IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN commentId IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN questionId IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN answerId IS NULL THEN 0 ELSE 1 END) = 1
    )
);

CREATE TABLE dbo.PointTransactions (
    transactionId INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    transactionType NVARCHAR(50) NOT NULL
        CONSTRAINT CK_PointTransactions_Type CHECK (
            transactionType IN (
                N'upload_reward',
                N'answer_reward',
                N'moderation_reward',
                N'download_cost',
                N'penalty',
                N'admin_adjustment'
            )
        ),
    points INT NOT NULL,
    description NVARCHAR(255) NULL,
    documentId INT NULL,
    answerId INT NULL,
    reviewId INT NULL,
    createdAt DATETIME2 NOT NULL
        CONSTRAINT DF_PointTransactions_CreatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_PointTransactions_Users
        FOREIGN KEY (userId) REFERENCES dbo.Users(userId),
    CONSTRAINT FK_PointTransactions_Documents
        FOREIGN KEY (documentId) REFERENCES dbo.Documents(documentId),
    CONSTRAINT FK_PointTransactions_Answers
        FOREIGN KEY (answerId) REFERENCES dbo.Answers(answerId),
    CONSTRAINT FK_PointTransactions_DocumentReviews
        FOREIGN KEY (reviewId) REFERENCES dbo.DocumentReviews(reviewId)
);

CREATE TABLE dbo.DownloadHistory (
    downloadId INT IDENTITY(1,1) PRIMARY KEY,
    downloaderUserId INT NOT NULL,
    documentId INT NOT NULL,
    ruleId INT NOT NULL,
    accessStart DATETIME2 NOT NULL
        CONSTRAINT DF_DownloadHistory_AccessStart DEFAULT (SYSDATETIME()),
    accessEnd DATETIME2 NULL,
    allowedDuration INT NOT NULL,
    CONSTRAINT CK_DownloadHistory_AllowedDuration CHECK (allowedDuration > 0),
    CONSTRAINT FK_DownloadHistory_Users
        FOREIGN KEY (downloaderUserId) REFERENCES dbo.Users(userId),
    CONSTRAINT FK_DownloadHistory_Documents
        FOREIGN KEY (documentId) REFERENCES dbo.Documents(documentId),
    CONSTRAINT FK_DownloadHistory_AccessRules
        FOREIGN KEY (ruleId) REFERENCES dbo.AccessRules(ruleId)
);

CREATE TABLE dbo.UserActivityLogs (
    logId INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    action NVARCHAR(100) NOT NULL,
    targetType NVARCHAR(50) NULL
        CONSTRAINT CK_UserActivityLogs_TargetType CHECK (
            targetType IS NULL OR targetType IN (
                N'document',
                N'comment',
                N'question',
                N'answer',
                N'report',
                N'download',
                N'user'
            )
        ),
    targetId INT NULL,
    createdAt DATETIME2 NOT NULL
        CONSTRAINT DF_UserActivityLogs_CreatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_UserActivityLogs_Users
        FOREIGN KEY (userId) REFERENCES dbo.Users(userId)
);

/* =========================
   INDEXES
   ========================= */

CREATE INDEX IX_Users_Role ON dbo.Users(role);
CREATE INDEX IX_Users_Points ON dbo.Users(points);

CREATE INDEX IX_Documents_OwnerUserId ON dbo.Documents(ownerUserId);
CREATE INDEX IX_Documents_Status ON dbo.Documents(status);
CREATE INDEX IX_Documents_CreatedAt ON dbo.Documents(createdAt);

CREATE INDEX IX_DocumentCategories_CategoryId ON dbo.DocumentCategories(categoryId);

CREATE INDEX IX_Comments_DocumentId ON dbo.Comments(documentId);
CREATE INDEX IX_Comments_AuthorUserId ON dbo.Comments(authorUserId);

CREATE INDEX IX_Questions_DocumentId ON dbo.Questions(documentId);
CREATE INDEX IX_Questions_AskerUserId ON dbo.Questions(askerUserId);

CREATE INDEX IX_Answers_QuestionId ON dbo.Answers(questionId);
CREATE INDEX IX_Answers_ResponderUserId ON dbo.Answers(responderUserId);

CREATE INDEX IX_DocumentReviews_DocumentId ON dbo.DocumentReviews(documentId);
CREATE INDEX IX_DocumentReviews_ModeratorUserId ON dbo.DocumentReviews(moderatorUserId);

CREATE INDEX IX_Reports_ReporterUserId ON dbo.Reports(reporterUserId);
CREATE INDEX IX_Reports_Status ON dbo.Reports(status);
CREATE INDEX IX_Reports_ReviewedByUserId ON dbo.Reports(reviewedByUserId);

CREATE INDEX IX_PointTransactions_UserId_CreatedAt
    ON dbo.PointTransactions(userId, createdAt);

CREATE INDEX IX_DownloadHistory_User_Document
    ON dbo.DownloadHistory(downloaderUserId, documentId);

CREATE INDEX IX_UserActivityLogs_UserId_CreatedAt
    ON dbo.UserActivityLogs(userId, createdAt);

/* =========================
   KIEM TRA NHANH
   ========================= */

SELECT N'Users' AS tableName, COUNT(*) AS totalRows FROM dbo.Users
UNION ALL
SELECT N'Categories', COUNT(*) FROM dbo.Categories
UNION ALL
SELECT N'AccessRules', COUNT(*) FROM dbo.AccessRules
UNION ALL
SELECT N'Documents', COUNT(*) FROM dbo.Documents
UNION ALL
SELECT N'DocumentCategories', COUNT(*) FROM dbo.DocumentCategories
UNION ALL
SELECT N'Comments', COUNT(*) FROM dbo.Comments
UNION ALL
SELECT N'Questions', COUNT(*) FROM dbo.Questions
UNION ALL
SELECT N'Answers', COUNT(*) FROM dbo.Answers
UNION ALL
SELECT N'DocumentReviews', COUNT(*) FROM dbo.DocumentReviews
UNION ALL
SELECT N'Reports', COUNT(*) FROM dbo.Reports
UNION ALL
SELECT N'PointTransactions', COUNT(*) FROM dbo.PointTransactions
UNION ALL
SELECT N'DownloadHistory', COUNT(*) FROM dbo.DownloadHistory
UNION ALL
SELECT N'UserActivityLogs', COUNT(*) FROM dbo.UserActivityLogs;
