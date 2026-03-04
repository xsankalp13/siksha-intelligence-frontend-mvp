import type { Subject, Teacher, ClassData, Section } from '../types';

export const initialSubjects: Subject[] = [
    { _id: 'sub_math', name: 'Mathematics', code: 'M101', color: '#e0e0e0' },
    { _id: 'sub_phy', name: 'Physics', code: 'P101', color: '#e0e0e0' },
    { _id: 'sub_eng', name: 'English', code: 'E101', color: '#e0e0e0' },
    { _id: 'sub_chem', name: 'Chemistry', code: 'C101', color: '#e0e0e0' },
    { _id: 'sub_bio', name: 'Biology', code: 'B101', color: '#e0e0e0' },
    { _id: 'sub_hist', name: 'History', code: 'H101', color: '#e0e0e0' },
];

export const initialTeachers: Teacher[] = [
    { _id: 't_sharma', name: 'Mr. Sharma', teachableSubjects: ['sub_math', 'sub_phy'] },
    { _id: 't_verma', name: 'Mrs. Verma', teachableSubjects: ['sub_math'] },
    { _id: 't_singh', name: 'Mr. Singh', teachableSubjects: ['sub_eng'] },
    { _id: 't_gupta', name: 'Mrs. Gupta', teachableSubjects: ['sub_chem', 'sub_bio'] },
    { _id: 't_kumar', name: 'Mr. Kumar', teachableSubjects: ['sub_hist', 'sub_eng'] },
];

export const classes: ClassData[] = [
    { _id: 'class_9', name: 'Class 9' },
    { _id: 'class_10', name: 'Class 10' },
];

export const sections: Section[] = [
    { _id: 'sec_a', name: 'Section A' },
    { _id: 'sec_b', name: 'Section B' },
];
