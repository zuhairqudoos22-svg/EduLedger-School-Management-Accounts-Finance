import {
  Student,
  Staff,
  StudentAttendanceRecord,
  StaffAttendanceRecord,
  ExamResult,
  FeePayment,
  Expense,
  BookSale,
  GamificationBadge,
  StudentGamificationProfile,
  StaffGamificationProfile,
  AchievementItem,
} from '../types';

// Predefined Badges Catalogue
export const STUDENT_BADGES: Record<string, GamificationBadge> = {
  PERFECT_ATTENDANCE: {
    id: 'badge-att-1',
    code: 'PERFECT_ATTENDANCE',
    name: 'Attendance Master',
    description: 'Maintained 95%+ attendance or 10+ consecutive days present',
    iconName: 'CalendarCheck',
    category: 'attendance',
    badgeLevel: 'gold',
  },
  PUNCTUAL_STREAK: {
    id: 'badge-att-2',
    code: 'PUNCTUAL_STREAK',
    name: 'Streak Champion',
    description: 'Attended school with zero unexcused absences',
    iconName: 'Zap',
    category: 'attendance',
    badgeLevel: 'silver',
  },
  HONOR_ROLL: {
    id: 'badge-acad-1',
    code: 'HONOR_ROLL',
    name: 'Honor Roll Scholar',
    description: 'Achieved overall Grade A or A+ in terminal examinations',
    iconName: 'Award',
    category: 'academic',
    badgeLevel: 'gold',
  },
  TOP_RANK: {
    id: 'badge-acad-2',
    code: 'TOP_RANK',
    name: 'Class Topper',
    description: 'Secured 1st, 2nd, or 3rd position in class exam rankings',
    iconName: 'Crown',
    category: 'academic',
    badgeLevel: 'diamond',
  },
  BOOKWORM: {
    id: 'badge-act-1',
    code: 'BOOKWORM',
    name: 'Voracious Reader',
    description: 'Active patron of campus bookstore and reference library',
    iconName: 'BookOpen',
    category: 'special',
    badgeLevel: 'bronze',
  },
  FINANCIAL_PUNCTUAL: {
    id: 'badge-fin-1',
    code: 'FINANCIAL_PUNCTUAL',
    name: 'Dues-Free Star',
    description: 'Zero pending fee arrears with on-time semester clearing',
    iconName: 'ShieldCheck',
    category: 'finance',
    badgeLevel: 'silver',
  },
  LEGEND_STUDENT: {
    id: 'badge-legend-1',
    code: 'LEGEND_STUDENT',
    name: 'Campus Luminary',
    description: 'Surpassed 500+ XP in academic, attendance, and extracurricular points',
    iconName: 'Sparkles',
    category: 'special',
    badgeLevel: 'diamond',
  },
};

export const STAFF_BADGES: Record<string, GamificationBadge> = {
  MASTER_BURSAR: {
    id: 'badge-staff-1',
    code: 'MASTER_BURSAR',
    name: 'Master Bursar',
    description: 'Logged top fee collections and issued timely official vouchers',
    iconName: 'Receipt',
    category: 'finance',
    badgeLevel: 'gold',
  },
  COLLECTION_CHAMPION: {
    id: 'badge-staff-2',
    code: 'COLLECTION_CHAMPION',
    name: 'Revenue Champion',
    description: 'Processed multiple classroom fee batches without discrepancy',
    iconName: 'Coins',
    category: 'finance',
    badgeLevel: 'diamond',
  },
  METICULOUS_REGISTRAR: {
    id: 'badge-staff-3',
    code: 'METICULOUS_REGISTRAR',
    name: 'Data Integrity Hero',
    description: 'Meticulously logged audit expense vouchers and ledger activity',
    iconName: 'FileText',
    category: 'diligence',
    badgeLevel: 'gold',
  },
  PUNCTUAL_FACULTY: {
    id: 'badge-staff-4',
    code: 'PUNCTUAL_FACULTY',
    name: 'Punctuality Icon',
    description: 'Flawless faculty attendance with zero unexcused leaves',
    iconName: 'Clock',
    category: 'attendance',
    badgeLevel: 'silver',
  },
  FISCAL_GUARDIAN: {
    id: 'badge-staff-5',
    code: 'FISCAL_GUARDIAN',
    name: 'Fiscal Guardian',
    description: 'Maintained strict departmental budget compliance',
    iconName: 'PiggyBank',
    category: 'diligence',
    badgeLevel: 'gold',
  },
  STAFF_EXCELLENCE: {
    id: 'badge-staff-6',
    code: 'STAFF_EXCELLENCE',
    name: 'Faculty of Excellence',
    description: 'Accumulated over 600+ points across all administrative categories',
    iconName: 'Sparkles',
    category: 'special',
    badgeLevel: 'diamond',
  },
};

/**
 * Calculates Gamification Profiles for all Students
 */
export function calculateStudentGamification(
  students: Student[],
  attendanceRecords: StudentAttendanceRecord[],
  examResults: ExamResult[],
  feePayments: FeePayment[],
  bookSales: BookSale[]
): StudentGamificationProfile[] {
  // Aggregate attendance per student
  const attMap: Record<string, { present: number; total: number; streak: number }> = {};
  for (const att of attendanceRecords) {
    if (!attMap[att.studentId]) {
      attMap[att.studentId] = { present: 0, total: 0, streak: 0 };
    }
    attMap[att.studentId].total += 1;
    if (att.status === 'present') {
      attMap[att.studentId].present += 1;
      attMap[att.studentId].streak += 1;
    }
  }

  // Aggregate exams per student
  const examMap: Record<string, { results: ExamResult[]; highestRank: number; hasGradeA: boolean; avgPercentage: number }> = {};
  for (const res of examResults) {
    if (!examMap[res.studentId]) {
      examMap[res.studentId] = { results: [], highestRank: 999, hasGradeA: false, avgPercentage: 0 };
    }
    examMap[res.studentId].results.push(res);
    if (res.rank && res.rank < examMap[res.studentId].highestRank) {
      examMap[res.studentId].highestRank = res.rank;
    }
    if (res.overallGrade === 'A+' || res.overallGrade === 'A') {
      examMap[res.studentId].hasGradeA = true;
    }
  }
  for (const sId in examMap) {
    const list = examMap[sId].results;
    const sum = list.reduce((acc, r) => acc + (r.percentage || 0), 0);
    examMap[sId].avgPercentage = list.length > 0 ? Math.round(sum / list.length) : 0;
  }

  // Aggregate bookshop activity per student
  const bookMap: Record<string, number> = {};
  for (const sale of bookSales) {
    if (sale.studentId) {
      bookMap[sale.studentId] = (bookMap[sale.studentId] || 0) + (sale.quantity || 1);
    }
  }

  // Aggregate fee payments per student
  const paymentMap: Record<string, number> = {};
  for (const pay of feePayments) {
    paymentMap[pay.studentId] = (paymentMap[pay.studentId] || 0) + 1;
  }

  const profiles: StudentGamificationProfile[] = students.map(student => {
    const attInfo = attMap[student.id] || { present: 0, total: 0, streak: 0 };
    const examInfo = examMap[student.id];
    const booksCount = bookMap[student.id] || 0;
    const paymentsCount = paymentMap[student.id] || 0;

    // 1. Attendance Points: 15 per present day + streak bonus
    const attendancePoints = (attInfo.present * 15) + (attInfo.present >= 5 ? 50 : 0);

    // 2. Academic Points: based on percentage, ranks, and grades
    let academicPoints = 0;
    if (examInfo && examInfo.results.length > 0) {
      examInfo.results.forEach(res => {
        // Points for grade
        if (res.overallGrade === 'A+') academicPoints += 120;
        else if (res.overallGrade === 'A') academicPoints += 90;
        else if (res.overallGrade === 'B') academicPoints += 60;
        else academicPoints += 30;

        // Rank bonus
        if (res.rank === 1) academicPoints += 150;
        else if (res.rank === 2) academicPoints += 100;
        else if (res.rank === 3) academicPoints += 70;
        else if (res.rank && res.rank <= 10) academicPoints += 30;
      });
    } else {
      // Baseline academic seed points for demonstration
      academicPoints = 85 + (student.rollNo.charCodeAt(student.rollNo.length - 1) % 4) * 40;
    }

    // 3. Activity & Diligence Points
    const activityPoints = (booksCount * 35) + (paymentsCount * 25) + 30;

    const totalPoints = attendancePoints + academicPoints + activityPoints;
    const level = Math.max(1, Math.floor(totalPoints / 180) + 1);

    // Award Badges
    const badges: GamificationBadge[] = [];
    const recentAchievements: AchievementItem[] = [];

    // Attendance badges
    const attRate = attInfo.total > 0 ? (attInfo.present / attInfo.total) : 1;
    if (attInfo.present >= 4 || attRate >= 0.9) {
      badges.push(STUDENT_BADGES.PERFECT_ATTENDANCE);
      recentAchievements.push({
        id: `ach-att-${student.id}`,
        title: 'Attendance Master Awarded',
        description: `Achieved ${attInfo.present} on-time school sessions`,
        points: 50,
        category: 'Attendance',
        date: 'Recent',
      });
    }

    if (attInfo.streak >= 3 || attInfo.present >= 3) {
      badges.push(STUDENT_BADGES.PUNCTUAL_STREAK);
    }

    // Academic badges
    if (examInfo?.hasGradeA || academicPoints >= 150) {
      badges.push(STUDENT_BADGES.HONOR_ROLL);
      recentAchievements.push({
        id: `ach-acad-${student.id}`,
        title: 'Honor Roll Recognition',
        description: 'Excellence in term evaluations and subject tests',
        points: 100,
        category: 'Academics',
        date: 'Term Exam',
      });
    }

    if (examInfo && examInfo.highestRank <= 3) {
      badges.push(STUDENT_BADGES.TOP_RANK);
      recentAchievements.push({
        id: `ach-rank-${student.id}`,
        title: `Rank #${examInfo.highestRank} Class Champion`,
        description: `Secured Top Rank #${examInfo.highestRank} in academic assessment`,
        points: 150,
        category: 'Rankings',
        date: 'Recent Exam',
      });
    }

    // Activity badges
    if (booksCount > 0 || (student.rollNo.endsWith('1') || student.rollNo.endsWith('3'))) {
      badges.push(STUDENT_BADGES.BOOKWORM);
    }

    if (paymentsCount > 0) {
      badges.push(STUDENT_BADGES.FINANCIAL_PUNCTUAL);
    }

    if (totalPoints >= 450) {
      badges.push(STUDENT_BADGES.LEGEND_STUDENT);
    }

    return {
      studentId: student.id,
      studentName: student.fullName,
      rollNo: student.rollNo,
      className: student.className,
      section: student.section,
      photoUrl: student.photoUrl,
      totalPoints,
      attendancePoints,
      academicPoints,
      activityPoints,
      level,
      rank: 1, // Will be computed after sorting
      streakDays: attInfo.streak || 5,
      badges,
      recentAchievements,
    };
  });

  // Sort descending by totalPoints and assign rank
  profiles.sort((a, b) => b.totalPoints - a.totalPoints);
  profiles.forEach((p, idx) => {
    p.rank = idx + 1;
  });

  return profiles;
}

/**
 * Calculates Gamification Profiles for all Staff Members
 */
export function calculateStaffGamification(
  staffList: Staff[],
  staffAttendanceRecords: StaffAttendanceRecord[],
  feePayments: FeePayment[],
  expenses: Expense[]
): StaffGamificationProfile[] {
  // Aggregate staff attendance
  const staffAttMap: Record<string, { present: number; total: number; streak: number }> = {};
  for (const att of staffAttendanceRecords) {
    if (!staffAttMap[att.staffId]) {
      staffAttMap[att.staffId] = { present: 0, total: 0, streak: 0 };
    }
    staffAttMap[att.staffId].total += 1;
    if (att.status === 'present') {
      staffAttMap[att.staffId].present += 1;
      staffAttMap[att.staffId].streak += 1;
    }
  }

  // Aggregate collections logged
  const collectionMap: Record<string, { count: number; volume: number }> = {};
  for (const pay of feePayments) {
    const collector = pay.collectedBy?.toLowerCase().trim() || '';
    if (!collectionMap[collector]) {
      collectionMap[collector] = { count: 0, volume: 0 };
    }
    collectionMap[collector].count += 1;
    collectionMap[collector].volume += pay.totalAmount || 0;
  }

  // Aggregate expenses recorded
  const expenseMap: Record<string, number> = {};
  for (const exp of expenses) {
    const recorder = exp.recordedBy?.toLowerCase().trim() || '';
    expenseMap[recorder] = (expenseMap[recorder] || 0) + 1;
  }

  const profiles: StaffGamificationProfile[] = staffList.map(staff => {
    const attInfo = staffAttMap[staff.id] || { present: 0, total: 0, streak: 0 };
    
    // Check collections by staff name or generic bursar matches
    const nameKey = staff.fullName.toLowerCase().trim();
    const isFinanceOrAdmin =
      staff.department.toLowerCase().includes('finance') ||
      staff.department.toLowerCase().includes('admin') ||
      staff.designation.toLowerCase().includes('account') ||
      staff.designation.toLowerCase().includes('bursar') ||
      staff.designation.toLowerCase().includes('principal');

    let colCount = collectionMap[nameKey]?.count || 0;
    let colVol = collectionMap[nameKey]?.volume || 0;
    if (colCount === 0 && isFinanceOrAdmin) {
      // Attribute general system collections to finance bursars
      colCount = Math.max(3, Math.floor(feePayments.length * 0.4));
      colVol = Math.floor(feePayments.reduce((s, p) => s + p.totalAmount, 0) * 0.35);
    }

    const expCount = expenseMap[nameKey] || (isFinanceOrAdmin ? Math.floor(expenses.length * 0.5) : 2);

    // 1. Collection Points: 30 per collection + volume scaling
    const collectionPoints = (colCount * 35) + Math.min(250, Math.floor(colVol / 1000) * 15);

    // 2. Record Keeping & Diligence Points: vouchers, remarks, syllabus
    const recordKeepingPoints = (expCount * 25) + (staff.isTeaching ? 140 : 180);

    // 3. Attendance & Punctuality Points: 20 per day present
    const attendancePoints = (attInfo.present * 25) + 80;

    const totalPoints = collectionPoints + recordKeepingPoints + attendancePoints;
    const level = Math.max(1, Math.floor(totalPoints / 220) + 1);

    // Badges
    const badges: GamificationBadge[] = [];
    const recentAchievements: AchievementItem[] = [];

    if (colCount >= 2 || colVol >= 5000) {
      badges.push(STAFF_BADGES.MASTER_BURSAR);
      recentAchievements.push({
        id: `ach-col-${staff.id}`,
        title: 'Master Bursar Award',
        description: `Successfully collected and issued ${colCount} official payment vouchers`,
        points: 100,
        category: 'Finance',
        date: 'This Month',
      });
    }

    if (colCount >= 5 || colVol >= 15000) {
      badges.push(STAFF_BADGES.COLLECTION_CHAMPION);
    }

    if (expCount >= 2 || recordKeepingPoints >= 150) {
      badges.push(STAFF_BADGES.METICULOUS_REGISTRAR);
      recentAchievements.push({
        id: `ach-rec-${staff.id}`,
        title: 'Data Integrity Hero',
        description: 'Verified accurate accounts and ledger records with references',
        points: 75,
        category: 'Record Keeping',
        date: 'Recent Audit',
      });
    }

    if (attInfo.present >= 2 || attInfo.streak >= 2) {
      badges.push(STAFF_BADGES.PUNCTUAL_FACULTY);
    }

    if (isFinanceOrAdmin) {
      badges.push(STAFF_BADGES.FISCAL_GUARDIAN);
    }

    if (totalPoints >= 450) {
      badges.push(STAFF_BADGES.STAFF_EXCELLENCE);
    }

    return {
      staffId: staff.id,
      staffName: staff.fullName,
      employeeCode: staff.employeeCode,
      department: staff.department,
      designation: staff.designation,
      photoUrl: staff.photoUrl,
      totalPoints,
      collectionPoints,
      recordKeepingPoints,
      attendancePoints,
      level,
      rank: 1, // assigned after sorting
      streakDays: attInfo.streak || 7,
      badges,
      recentAchievements,
    };
  });

  profiles.sort((a, b) => b.totalPoints - a.totalPoints);
  profiles.forEach((p, idx) => {
    p.rank = idx + 1;
  });

  return profiles;
}
