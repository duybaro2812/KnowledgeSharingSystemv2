/*
    DropDatabaseBusinessRules.sql

    Muc dich:
    - Xoa toan bo VIEW, FUNCTION, PROCEDURE, TRIGGER nghiep vu da tao truoc do
    - Khong xoa bang du lieu trong schema
    - Dung khi muon xay dung lai lop business logic trong SQL Server tu dau
    - File nay cung xoa ca cac object nghiep vu cu lien quan den diem neu chung con ton tai

    Thu tu thuc hien:
    1. Drop trigger
    2. Drop procedure
    3. Drop function
    4. Drop view
*/

SET NOCOUNT ON;
GO

/* =========================
   DROP TRIGGERS
   ========================= */

IF OBJECT_ID(N'dbo.trg_AccessRules_NoOverlap', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_AccessRules_NoOverlap;
GO

IF OBJECT_ID(N'dbo.trg_DocumentReviews_SyncDocumentStatus', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_DocumentReviews_SyncDocumentStatus;
GO

IF OBJECT_ID(N'dbo.trg_PointTransactions_SyncUsers', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_PointTransactions_SyncUsers;
GO

IF OBJECT_ID(N'dbo.trg_Users_SetUpdatedAt', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Users_SetUpdatedAt;
GO

IF OBJECT_ID(N'dbo.trg_Documents_SetUpdatedAt', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Documents_SetUpdatedAt;
GO

IF OBJECT_ID(N'dbo.trg_Comments_SetUpdatedAt', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Comments_SetUpdatedAt;
GO

IF OBJECT_ID(N'dbo.trg_Questions_SetUpdatedAt', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Questions_SetUpdatedAt;
GO

IF OBJECT_ID(N'dbo.trg_Answers_SetUpdatedAt', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Answers_SetUpdatedAt;
GO

/* =========================
   DROP PROCEDURES
   ========================= */

IF OBJECT_ID(N'dbo.usp_RegisterUser', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_RegisterUser;
GO

IF OBJECT_ID(N'dbo.usp_SetUserActiveStatus', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_SetUserActiveStatus;
GO

IF OBJECT_ID(N'dbo.usp_VerifyUser', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_VerifyUser;
GO

IF OBJECT_ID(N'dbo.usp_GetUserProfile', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_GetUserProfile;
GO

IF OBJECT_ID(N'dbo.usp_UpdateUserProfile', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_UpdateUserProfile;
GO

IF OBJECT_ID(N'dbo.usp_CreateDocument', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CreateDocument;
GO

IF OBJECT_ID(N'dbo.usp_GetDocumentDetail', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_GetDocumentDetail;
GO

IF OBJECT_ID(N'dbo.usp_SearchApprovedDocuments', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_SearchApprovedDocuments;
GO

IF OBJECT_ID(N'dbo.usp_UpdateDocument', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_UpdateDocument;
GO

IF OBJECT_ID(N'dbo.usp_HideDocument', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_HideDocument;
GO

IF OBJECT_ID(N'dbo.usp_ReviewDocument', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_ReviewDocument;
GO

IF OBJECT_ID(N'dbo.usp_CreateComment', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CreateComment;
GO

IF OBJECT_ID(N'dbo.usp_CreateQuestion', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CreateQuestion;
GO

IF OBJECT_ID(N'dbo.usp_CreateAnswer', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CreateAnswer;
GO

IF OBJECT_ID(N'dbo.usp_AcceptAnswer', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_AcceptAnswer;
GO

IF OBJECT_ID(N'dbo.usp_CreateReport', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CreateReport;
GO

IF OBJECT_ID(N'dbo.usp_ResolveReport', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_ResolveReport;
GO

IF OBJECT_ID(N'dbo.usp_GetDownloadEligibility', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_GetDownloadEligibility;
GO

IF OBJECT_ID(N'dbo.usp_CreateDownloadSession', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CreateDownloadSession;
GO

IF OBJECT_ID(N'dbo.usp_CloseDownloadSession', N'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CloseDownloadSession;
GO

/* =========================
   DROP FUNCTION
   ========================= */

IF OBJECT_ID(N'dbo.ufn_GetAccessRuleByPoints', N'IF') IS NOT NULL
    DROP FUNCTION dbo.ufn_GetAccessRuleByPoints;
GO

/* =========================
   DROP VIEWS
   ========================= */

IF OBJECT_ID(N'dbo.vwApprovedDocumentSummary', N'V') IS NOT NULL
    DROP VIEW dbo.vwApprovedDocumentSummary;
GO

IF OBJECT_ID(N'dbo.vwUserPointBalance', N'V') IS NOT NULL
    DROP VIEW dbo.vwUserPointBalance;
GO

IF OBJECT_ID(N'dbo.vwPendingReports', N'V') IS NOT NULL
    DROP VIEW dbo.vwPendingReports;
GO

IF OBJECT_ID(N'dbo.vwUserContributionSummary', N'V') IS NOT NULL
    DROP VIEW dbo.vwUserContributionSummary;
GO

/* =========================
   KIEM TRA NHANH
   ========================= */

SELECT
    name,
    type_desc
FROM sys.objects
WHERE name IN (
    N'trg_AccessRules_NoOverlap',
    N'trg_DocumentReviews_SyncDocumentStatus',
    N'trg_PointTransactions_SyncUsers',
    N'trg_Users_SetUpdatedAt',
    N'trg_Documents_SetUpdatedAt',
    N'trg_Comments_SetUpdatedAt',
    N'trg_Questions_SetUpdatedAt',
    N'trg_Answers_SetUpdatedAt',
    N'usp_RegisterUser',
    N'usp_SetUserActiveStatus',
    N'usp_VerifyUser',
    N'usp_GetUserProfile',
    N'usp_UpdateUserProfile',
    N'usp_CreateDocument',
    N'usp_GetDocumentDetail',
    N'usp_SearchApprovedDocuments',
    N'usp_UpdateDocument',
    N'usp_HideDocument',
    N'usp_ReviewDocument',
    N'usp_CreateComment',
    N'usp_CreateQuestion',
    N'usp_CreateAnswer',
    N'usp_AcceptAnswer',
    N'usp_CreateReport',
    N'usp_ResolveReport',
    N'usp_GetDownloadEligibility',
    N'usp_CreateDownloadSession',
    N'usp_CloseDownloadSession',
    N'ufn_GetAccessRuleByPoints',
    N'vwApprovedDocumentSummary',
    N'vwUserPointBalance',
    N'vwPendingReports',
    N'vwUserContributionSummary'
);
GO
