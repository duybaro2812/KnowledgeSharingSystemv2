export type UserRole = 'user' | 'moderator' | 'admin';
export type DocStatus = 'pending' | 'approved' | 'rejected' | 'hidden';
export type NotifType = 'approval' | 'moderation' | 'report' | 'plagiarism' | 'comment' | 'chat' | 'points' | 'system';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarColor: string;
  role: UserRole;
  points: number;
  followers: number;
  uploads: number;
  upvotes: number;
  joinedAt: string;
  bio: string;
  university: string;
  department: string;
  isLocked?: boolean;
}

export interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  course: string;
  tags: string[];
  coverColor: string;
  uploadedBy: AppUser;
  uploadedAt: string;
  pages: number;
  fileSize: string;
  status: DocStatus;
  downloads: number;
  views: number;
  likes: number;
  dislikes: number;
  plagiarismScore?: number;
  isSaved?: boolean;
  isLiked?: boolean;
  downloadCost: number;
}

export interface Comment {
  id: string;
  documentId: string;
  author: AppUser;
  content: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  replies: Comment[];
  likes: number;
}

export interface QAMessage {
  id: string;
  senderId: string;
  content: string;
  sentAt: string;
}

export interface QASession {
  id: string;
  documentId: string;
  documentTitle: string;
  asker: AppUser;
  owner: AppUser;
  status: 'open' | 'closed';
  rating?: number;
  messages: QAMessage[];
  createdAt: string;
  lastMessageAt: string;
}

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface PointEvent {
  id: string;
  userId: string;
  userName: string;
  type: 'upload' | 'download_received' | 'upvote_received' | 'qa_rating' | 'admin_grant' | 'download_spent';
  points: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Report {
  id: string;
  documentId: string;
  documentTitle: string;
  reportedBy: AppUser;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
}

export interface PlagiarismAlert {
  id: string;
  documentId: string;
  documentTitle: string;
  uploadedBy: AppUser;
  similarDocId: string;
  similarDocTitle: string;
  matchPercent: number;
  status: 'pending' | 'approved_anyway' | 'rejected';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminName: string;
  action: string;
  target: string;
  details: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  documentCount: number;
  color: string;
  isActive: boolean;
}

// --- USERS ---
export const users: AppUser[] = [
  { id: 'u1', name: 'Alex Chen', email: 'alex.chen@mit.edu', initials: 'AC', avatarColor: '#2563EB', role: 'user', points: 45, followers: 128, uploads: 23, upvotes: 347, joinedAt: '2024-09-01', bio: 'Computer Science & AI enthusiast. Loves distributed systems.', university: 'MIT', department: 'Computer Science' },
  { id: 'u2', name: 'Sophia Müller', email: 'sophia.m@oxford.edu', initials: 'SM', avatarColor: '#7C3AED', role: 'user', points: 32, followers: 74, uploads: 11, upvotes: 198, joinedAt: '2024-10-15', bio: 'Biochemistry PhD candidate. Sharing is caring.', university: 'Oxford', department: 'Biochemistry' },
  { id: 'u3', name: 'James Park', email: 'j.park@stanford.edu', initials: 'JP', avatarColor: '#0D9488', role: 'user', points: 18, followers: 42, uploads: 6, upvotes: 89, joinedAt: '2024-11-20', bio: 'Electrical engineering undergrad.', university: 'Stanford', department: 'Electrical Engineering' },
  { id: 'u4', name: 'Priya Nair', email: 'priya.n@iitb.edu', initials: 'PN', avatarColor: '#D97706', role: 'user', points: 61, followers: 203, uploads: 34, upvotes: 512, joinedAt: '2024-08-05', bio: 'Mathematics & Data Science. Passionate educator.', university: 'IIT Bombay', department: 'Mathematics' },
  { id: 'u5', name: 'Dr. Marcus Webb', email: 'm.webb@uni.edu', initials: 'MW', avatarColor: '#DC2626', role: 'moderator', points: 120, followers: 89, uploads: 15, upvotes: 230, joinedAt: '2023-01-10', bio: 'Platform moderator. Keeping quality high.', university: 'Platform', department: 'Moderation' },
  { id: 'u6', name: 'Admin Rivera', email: 'admin@neoshare.edu', initials: 'AR', avatarColor: '#475569', role: 'admin', points: 999, followers: 0, uploads: 0, upvotes: 0, joinedAt: '2022-01-01', bio: 'Platform administrator.', university: 'NeoShare', department: 'Administration' },
  { id: 'u7', name: 'Lena Fischer', email: 'lena.f@berlin.edu', initials: 'LF', avatarColor: '#BE185D', role: 'user', points: 27, followers: 56, uploads: 8, upvotes: 134, joinedAt: '2024-12-01', bio: 'Philosophy & Law student.', university: 'FU Berlin', department: 'Philosophy', isLocked: true },
  { id: 'u8', name: 'Omar Hassan', email: 'omar.h@cairo.edu', initials: 'OH', avatarColor: '#059669', role: 'user', points: 38, followers: 91, uploads: 17, upvotes: 276, joinedAt: '2024-07-14', bio: 'Physics PhD. Quantum computing researcher.', university: 'Cairo University', department: 'Physics' },
];

export const currentUser = users[0]; // Alex Chen - 45 points, full access

// --- DOCUMENTS ---
export const documents: Document[] = [
  {
    id: 'd1', title: 'Advanced Algorithms & Complexity Theory', description: 'A comprehensive guide to algorithm design paradigms, NP-completeness, approximation algorithms, and randomized algorithms. Includes practice problems and solutions.', category: 'Computer Science', course: 'CS 6.006', tags: ['algorithms', 'complexity', 'dynamic programming', 'graph theory'], coverColor: 'from-blue-600 to-blue-800', uploadedBy: users[0], uploadedAt: '2025-03-10', pages: 142, fileSize: '4.2 MB', status: 'approved', downloads: 1240, views: 5830, likes: 487, dislikes: 12, downloadCost: 5, isSaved: true, isLiked: true,
  },
  {
    id: 'd2', title: 'Organic Chemistry: Reaction Mechanisms', description: 'Full notes on reaction mechanisms, stereochemistry, aromatic chemistry, and carbonyl chemistry. Perfect for exam preparation.', category: 'Chemistry', course: 'CHEM 215', tags: ['chemistry', 'organic', 'reactions', 'mechanisms'], coverColor: 'from-purple-600 to-purple-800', uploadedBy: users[1], uploadedAt: '2025-02-18', pages: 98, fileSize: '2.8 MB', status: 'approved', downloads: 874, views: 3420, likes: 312, dislikes: 8, downloadCost: 5,
  },
  {
    id: 'd3', title: 'Quantum Mechanics: Wave Functions & Operators', description: 'Detailed lecture notes covering Schrödinger equation, eigenvalues, harmonic oscillator, and perturbation theory.', category: 'Physics', course: 'PHYS 301', tags: ['quantum', 'physics', 'wave functions', 'operators'], coverColor: 'from-teal-600 to-teal-800', uploadedBy: users[7], uploadedAt: '2025-03-01', pages: 76, fileSize: '1.9 MB', status: 'approved', downloads: 621, views: 2890, likes: 245, dislikes: 5, downloadCost: 5,
  },
  {
    id: 'd4', title: 'Machine Learning Fundamentals', description: 'From linear regression to deep learning. Covers supervised, unsupervised, and reinforcement learning with Python code examples.', category: 'Computer Science', course: 'CS 229', tags: ['machine learning', 'AI', 'python', 'deep learning'], coverColor: 'from-indigo-600 to-indigo-800', uploadedBy: users[3], uploadedAt: '2025-01-25', pages: 200, fileSize: '8.1 MB', status: 'approved', downloads: 3210, views: 12400, likes: 1102, dislikes: 23, downloadCost: 8, isSaved: true,
  },
  {
    id: 'd5', title: 'Differential Equations & Linear Algebra', description: 'Combined course notes for ODE, PDE, and linear algebra. Includes all proofs and solved examples.', category: 'Mathematics', course: 'MATH 18.06', tags: ['mathematics', 'differential equations', 'linear algebra'], coverColor: 'from-amber-600 to-orange-700', uploadedBy: users[3], uploadedAt: '2025-02-05', pages: 118, fileSize: '3.4 MB', status: 'approved', downloads: 1890, views: 7230, likes: 634, dislikes: 18, downloadCost: 5,
  },
  {
    id: 'd6', title: 'Philosophy of Mind & Consciousness', description: 'An introduction to the hard problem of consciousness, qualia, functionalism, and the philosophy of AI and mind.', category: 'Philosophy', course: 'PHIL 200', tags: ['philosophy', 'consciousness', 'mind', 'qualia'], coverColor: 'from-rose-600 to-rose-800', uploadedBy: users[6], uploadedAt: '2025-03-15', pages: 64, fileSize: '1.2 MB', status: 'pending', downloads: 0, views: 124, likes: 34, dislikes: 2, downloadCost: 3,
  },
  {
    id: 'd7', title: 'Macroeconomics: Keynesian Models', description: 'Comprehensive notes on IS-LM model, aggregate demand/supply, fiscal policy, and monetary policy. Case studies included.', category: 'Economics', course: 'ECON 301', tags: ['economics', 'macroeconomics', 'keynesian', 'monetary policy'], coverColor: 'from-emerald-600 to-emerald-800', uploadedBy: users[1], uploadedAt: '2025-03-08', pages: 88, fileSize: '2.1 MB', status: 'approved', downloads: 567, views: 2340, likes: 189, dislikes: 7, downloadCost: 5,
  },
  {
    id: 'd8', title: 'Data Structures: Trees, Graphs & Heaps', description: 'Detailed notes on advanced data structures including AVL trees, red-black trees, heaps, and graph representations.', category: 'Computer Science', course: 'CS 6.046', tags: ['data structures', 'trees', 'graphs', 'algorithms'], coverColor: 'from-sky-600 to-sky-800', uploadedBy: users[0], uploadedAt: '2025-01-10', pages: 110, fileSize: '3.1 MB', status: 'approved', downloads: 1560, views: 6120, likes: 521, dislikes: 14, downloadCost: 5,
  },
  {
    id: 'd9', title: 'Molecular Biology: DNA Replication', description: 'Lab notes and theory on DNA structure, replication mechanisms, transcription, translation and gene regulation.', category: 'Biology', course: 'BIO 5.07', tags: ['biology', 'molecular', 'DNA', 'genetics'], coverColor: 'from-green-600 to-green-800', uploadedBy: users[1], uploadedAt: '2025-02-28', pages: 82, fileSize: '2.4 MB', status: 'approved', downloads: 432, views: 1890, likes: 167, dislikes: 4, downloadCost: 5,
  },
  {
    id: 'd10', title: 'Constitutional Law: Rights & Liberties', description: 'Case study notes on First Amendment, due process, equal protection, and judicial review. Supreme Court decisions analyzed.', category: 'Law', course: 'LAW 201', tags: ['law', 'constitutional', 'rights', 'supreme court'], coverColor: 'from-slate-600 to-slate-800', uploadedBy: users[6], uploadedAt: '2025-03-20', pages: 156, fileSize: '5.0 MB', status: 'rejected', downloads: 0, views: 230, likes: 78, dislikes: 3, downloadCost: 5,
  },
];

// --- COMMENTS ---
export const comments: Comment[] = [
  {
    id: 'c1', documentId: 'd1', author: users[1], content: 'This is incredibly well-organized. The section on NP-completeness reductions is the clearest explanation I\'ve seen anywhere. Thank you!', createdAt: '2025-03-12T10:30:00', status: 'approved', likes: 24,
    replies: [
      { id: 'c1r1', documentId: 'd1', author: users[0], content: 'Thank you so much! I spent a lot of time on that section. Feel free to ask if anything is unclear.', createdAt: '2025-03-12T11:00:00', status: 'approved', likes: 8, replies: [] },
      { id: 'c1r2', documentId: 'd1', author: users[3], content: 'Agreed! The visual diagrams for graph reductions really helped me understand the material.', createdAt: '2025-03-12T14:20:00', status: 'approved', likes: 5, replies: [] },
    ],
  },
  {
    id: 'c2', documentId: 'd1', author: users[7], content: 'Page 67 has a minor typo in the proof – should be O(n log n) not O(n²). Otherwise an excellent resource.', createdAt: '2025-03-14T09:15:00', status: 'approved', likes: 11,
    replies: [
      { id: 'c2r1', documentId: 'd1', author: users[0], content: 'Great catch! I\'ll update the document. Thanks Omar!', createdAt: '2025-03-14T10:00:00', status: 'approved', likes: 3, replies: [] },
    ],
  },
  {
    id: 'c3', documentId: 'd1', author: users[2], content: 'Can someone explain the Master Theorem part on page 45? I\'m confused about Case 3.', createdAt: '2025-03-16T16:45:00', status: 'approved', likes: 7, replies: [],
  },
  {
    id: 'c4', documentId: 'd1', author: users[6], content: 'Spam content here...', createdAt: '2025-03-17T08:00:00', status: 'pending', likes: 0, replies: [],
  },
];

// --- QA SESSIONS ---
export const qaSessions: QASession[] = [
  {
    id: 'qa1', documentId: 'd1', documentTitle: 'Advanced Algorithms & Complexity Theory', asker: users[2], owner: users[0], status: 'open', createdAt: '2025-03-20T10:00:00', lastMessageAt: '2025-03-20T15:30:00',
    messages: [
      { id: 'm1', senderId: 'u3', content: 'Hi! I\'m having trouble understanding the amortized analysis section (pages 78-82). Specifically the accounting method for dynamic arrays.', sentAt: '2025-03-20T10:00:00' },
      { id: 'm2', senderId: 'u1', content: 'Sure! The accounting method works by assigning a "credit" to each operation. For a dynamic array, cheap operations (regular insertions) store extra credits that pay for the expensive ones (resizing).', sentAt: '2025-03-20T10:15:00' },
      { id: 'm3', senderId: 'u3', content: 'Oh I see, so each insertion costs amortized O(1) even though the resize is O(n)?', sentAt: '2025-03-20T10:22:00' },
      { id: 'm4', senderId: 'u1', content: 'Exactly! Each element is "moved" at most twice (once during insertion, once during resize), so the total cost over n insertions is O(n), giving amortized O(1) per operation. Does that clarify it?', sentAt: '2025-03-20T10:30:00' },
      { id: 'm5', senderId: 'u3', content: 'Yes that makes much more sense now! What about the potential method though – is it equivalent?', sentAt: '2025-03-20T15:25:00' },
      { id: 'm6', senderId: 'u1', content: 'Yes, potential method is equivalent – it\'s just a different accounting framework. Section 5.2 has both side by side. Try working through the example there.', sentAt: '2025-03-20T15:30:00' },
    ],
  },
  {
    id: 'qa2', documentId: 'd4', documentTitle: 'Machine Learning Fundamentals', asker: users[0], owner: users[3], status: 'closed', rating: 5, createdAt: '2025-03-05T09:00:00', lastMessageAt: '2025-03-06T14:00:00',
    messages: [
      { id: 'm1', senderId: 'u1', content: 'Hi Priya, can you explain the difference between L1 and L2 regularization in more detail?', sentAt: '2025-03-05T09:00:00' },
      { id: 'm2', senderId: 'u4', content: 'Of course! L1 (Lasso) adds the absolute values of weights to the loss, encouraging sparsity. L2 (Ridge) adds squared weights, preferring small but non-zero weights.', sentAt: '2025-03-05T10:00:00' },
      { id: 'm3', senderId: 'u1', content: 'When should I use one over the other?', sentAt: '2025-03-05T10:30:00' },
      { id: 'm4', senderId: 'u4', content: 'Use L1 when you suspect only a few features matter (feature selection). Use L2 when most features contribute. ElasticNet combines both!', sentAt: '2025-03-05T11:00:00' },
      { id: 'm5', senderId: 'u1', content: 'Perfect explanation, thank you so much!', sentAt: '2025-03-06T14:00:00' },
    ],
  },
  {
    id: 'qa3', documentId: 'd3', documentTitle: 'Quantum Mechanics: Wave Functions & Operators', asker: users[1], owner: users[7], status: 'open', createdAt: '2025-03-22T08:00:00', lastMessageAt: '2025-03-22T09:00:00',
    messages: [
      { id: 'm1', senderId: 'u2', content: 'In section 3, why does the commutator [x̂, p̂] = iħ imply the Heisenberg uncertainty principle?', sentAt: '2025-03-22T08:00:00' },
      { id: 'm2', senderId: 'u8', content: 'Great question! The Robertson uncertainty relation shows that for any two observables, ΔA·ΔB ≥ ½|⟨[Â,B̂]⟩|. Substituting x and p gives Δx·Δp ≥ ħ/2.', sentAt: '2025-03-22T09:00:00' },
    ],
  },
];

// --- NOTIFICATIONS ---
export const notifications: Notification[] = [
  { id: 'n1', type: 'approval', title: 'Document Approved', body: 'Your document "Advanced Algorithms" has been approved and is now live.', isRead: false, createdAt: '2025-03-20T09:00:00', actionUrl: '/document/d1' },
  { id: 'n2', type: 'comment', title: 'New Comment', body: 'Sophia Müller commented on your document "Advanced Algorithms".', isRead: false, createdAt: '2025-03-19T14:30:00', actionUrl: '/document/d1' },
  { id: 'n3', type: 'chat', title: 'New Q&A Question', body: 'James Park has opened a Q&A session on your document "Advanced Algorithms".', isRead: false, createdAt: '2025-03-18T10:00:00', actionUrl: '/qa/qa1' },
  { id: 'n4', type: 'points', title: 'Points Earned', body: 'You earned +5 points! Someone downloaded your document "Data Structures".', isRead: true, createdAt: '2025-03-17T16:45:00', actionUrl: '/points' },
  { id: 'n5', type: 'points', title: 'Points Earned', body: 'You earned +10 points for uploading a new document.', isRead: true, createdAt: '2025-03-15T12:00:00', actionUrl: '/points' },
  { id: 'n6', type: 'comment', title: 'Reply to your comment', body: 'Omar Hassan replied to your comment on "Quantum Mechanics".', isRead: true, createdAt: '2025-03-14T11:20:00', actionUrl: '/document/d3' },
  { id: 'n7', type: 'system', title: 'Welcome to NeoShare!', body: 'Your account has been verified. Start uploading and sharing documents to earn points!', isRead: true, createdAt: '2024-09-01T08:00:00' },
  { id: 'n8', type: 'moderation', title: 'Comment Removed', body: 'A comment on your document was removed for violating community guidelines.', isRead: true, createdAt: '2025-03-10T15:00:00' },
];

// --- POINT EVENTS ---
export const pointEvents: PointEvent[] = [
  { id: 'pe1', userId: 'u1', userName: 'Alex Chen', type: 'upload', points: 10, description: 'Uploaded "Advanced Algorithms & Complexity Theory"', status: 'approved', createdAt: '2025-03-10T10:00:00' },
  { id: 'pe2', userId: 'u4', userName: 'Priya Nair', type: 'upload', points: 10, description: 'Uploaded "Machine Learning Fundamentals"', status: 'approved', createdAt: '2025-01-25T09:00:00' },
  { id: 'pe3', userId: 'u2', userName: 'Sophia Müller', type: 'upload', points: 10, description: 'Uploaded "Organic Chemistry" – pending review', status: 'pending', createdAt: '2025-03-18T11:00:00' },
  { id: 'pe4', userId: 'u1', userName: 'Alex Chen', type: 'download_received', points: 5, description: 'Someone downloaded "Data Structures"', status: 'approved', createdAt: '2025-03-17T16:45:00' },
  { id: 'pe5', userId: 'u3', userName: 'James Park', type: 'download_spent', points: -5, description: 'Downloaded "Advanced Algorithms"', status: 'approved', createdAt: '2025-03-20T14:00:00' },
  { id: 'pe6', userId: 'u7', userName: 'Lena Fischer', type: 'admin_grant', points: 15, description: 'Admin granted bonus points for quality contributions', status: 'pending', createdAt: '2025-03-21T09:00:00' },
  { id: 'pe7', userId: 'u8', userName: 'Omar Hassan', type: 'upvote_received', points: 2, description: 'Received 10 upvotes on "Quantum Mechanics"', status: 'approved', createdAt: '2025-03-19T13:00:00' },
  { id: 'pe8', userId: 'u2', userName: 'Sophia Müller', type: 'qa_rating', points: 3, description: 'Received 5-star Q&A rating', status: 'pending', createdAt: '2025-03-20T17:00:00' },
];

// --- REPORTS ---
export const reports: Report[] = [
  { id: 'r1', documentId: 'd10', documentTitle: 'Constitutional Law: Rights & Liberties', reportedBy: users[3], reason: 'Copyright violation', details: 'This document appears to be copied directly from a published textbook without attribution.', status: 'pending', createdAt: '2025-03-21T10:00:00' },
  { id: 'r2', documentId: 'd6', documentTitle: 'Philosophy of Mind & Consciousness', reportedBy: users[7], reason: 'Inaccurate content', details: 'Several factual errors in the section on functionalism theories.', status: 'reviewed', createdAt: '2025-03-19T14:00:00' },
  { id: 'r3', documentId: 'd2', documentTitle: 'Organic Chemistry: Reaction Mechanisms', reportedBy: users[2], reason: 'Incomplete content', details: 'The document is missing chapters 6-9 as described in the table of contents.', status: 'dismissed', createdAt: '2025-03-15T11:00:00' },
];

// --- PLAGIARISM ALERTS ---
export const plagiarismAlerts: PlagiarismAlert[] = [
  { id: 'pl1', documentId: 'd6', documentTitle: 'Philosophy of Mind & Consciousness', uploadedBy: users[6], similarDocId: 'd-ext-1', similarDocTitle: 'Mind & Consciousness – Stanford Notes (External)', matchPercent: 78, status: 'pending', createdAt: '2025-03-20T11:00:00' },
  { id: 'pl2', documentId: 'd10', documentTitle: 'Constitutional Law: Rights & Liberties', uploadedBy: users[6], similarDocId: 'd-ext-2', similarDocTitle: 'Constitutional Law Casebook 3rd Edition (External)', matchPercent: 92, status: 'rejected', createdAt: '2025-03-21T09:00:00' },
  { id: 'pl3', documentId: 'd5', documentTitle: 'Differential Equations & Linear Algebra', uploadedBy: users[3], similarDocId: 'd3', similarDocTitle: 'Quantum Mechanics (Internal)', matchPercent: 23, status: 'approved_anyway', createdAt: '2025-03-10T08:00:00' },
];

// --- AUDIT LOGS ---
export const auditLogs: AuditLog[] = [
  { id: 'al1', adminName: 'Admin Rivera', action: 'User Locked', target: 'Lena Fischer (u7)', details: 'Account locked for repeated policy violations.', createdAt: '2025-03-21T14:00:00' },
  { id: 'al2', adminName: 'Admin Rivera', action: 'Document Deleted', target: 'Constitutional Law (d10)', details: 'Deleted after confirmed copyright violation.', createdAt: '2025-03-21T13:30:00' },
  { id: 'al3', adminName: 'Admin Rivera', action: 'Role Changed', target: 'Dr. Marcus Webb (u5)', details: 'Role changed from user to moderator.', createdAt: '2025-03-18T10:00:00' },
  { id: 'al4', adminName: 'Admin Rivera', action: 'Points Granted', target: 'Lena Fischer (u7)', details: 'Manually granted 15 points.', createdAt: '2025-03-17T11:00:00' },
  { id: 'al5', adminName: 'Admin Rivera', action: 'Category Created', target: 'Law & Legal Studies', details: 'New category added to the platform.', createdAt: '2025-03-15T09:00:00' },
  { id: 'al6', adminName: 'Admin Rivera', action: 'User Deleted', target: 'Anonymous User (u-xx)', details: 'Account deleted for spam and abuse.', createdAt: '2025-03-12T16:00:00' },
];

// --- CATEGORIES ---
export const categories: Category[] = [
  { id: 'cat1', name: 'Computer Science', slug: 'computer-science', description: 'Algorithms, data structures, programming, AI, systems', documentCount: 342, color: '#2563EB', isActive: true },
  { id: 'cat2', name: 'Mathematics', slug: 'mathematics', description: 'Calculus, linear algebra, statistics, discrete math', documentCount: 218, color: '#7C3AED', isActive: true },
  { id: 'cat3', name: 'Physics', slug: 'physics', description: 'Mechanics, quantum physics, electromagnetism, thermodynamics', documentCount: 187, color: '#0D9488', isActive: true },
  { id: 'cat4', name: 'Chemistry', slug: 'chemistry', description: 'Organic, inorganic, physical, and biochemistry', documentCount: 156, color: '#D97706', isActive: true },
  { id: 'cat5', name: 'Biology', slug: 'biology', description: 'Cell biology, genetics, ecology, microbiology', documentCount: 143, color: '#059669', isActive: true },
  { id: 'cat6', name: 'Economics', slug: 'economics', description: 'Microeconomics, macroeconomics, econometrics', documentCount: 129, color: '#0EA5E9', isActive: true },
  { id: 'cat7', name: 'Philosophy', slug: 'philosophy', description: 'Logic, ethics, metaphysics, epistemology', documentCount: 87, color: '#8B5CF6', isActive: true },
  { id: 'cat8', name: 'Law', slug: 'law', description: 'Constitutional, civil, criminal, international law', documentCount: 64, color: '#DC2626', isActive: false },
];

export const continueReadingDocs = [documents[3], documents[0], documents[7]];
export const trendingDocs = [documents[0], documents[3], documents[2], documents[1], documents[4]];
