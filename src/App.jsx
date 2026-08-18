import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Settings,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  Save,
  FileSpreadsheet,
  Upload,
  Download,
  Printer,
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  addDoc,
  getDocs,
} from 'firebase/firestore';

// 在 StackBlitz 執行時，請將下方的 config 替換為您的 Firebase 專案設定
const defaultFirebaseConfig = {
  apiKey: 'AIzaSyAKnftibdPZVas-OYzgpmJobaqpYopmpkM',
  authDomain: 'exam-absence-app.firebaseapp.com',
  projectId: 'exam-absence-app',
  storageBucket: 'exam-absence-app.firebasestorage.app',
  messagingSenderId: '1035061410978',
  appId: '1:1035061410978:web:1282d0533d94802a89ebfb',
};

// 相容這裡的預覽環境與您未來的 StackBlitz 環境
const firebaseConfig =
  typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : defaultFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'exam-absence-app';

const defaultClassesData = [
  {
    id: '101',
    name: '101班',
    students: ['王大明', '陳小華', '林依依', '張志豪', '李佳玲'],
  },
  {
    id: '102',
    name: '102班',
    students: ['黃品睿', '邱子涵', '徐宇廷', '鄭珮琪', '莊凱文'],
  },
];
const defaultSubjectsData = [
  '國文',
  '作文',
  '英文',
  '英聽',
  '數學',
  '自然',
  '地理',
  '歷史',
  '公民',
];

const Modal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '確定',
  cancelText = '取消',
  isDanger = false,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600">{message}</p>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-gray-700 bg-white border hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white transition-colors ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 rounded-full shadow-lg text-white z-50 animate-in slide-in-from-top-4 duration-300 ${
        type === 'success' ? 'bg-green-600' : 'bg-red-500'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle2 size={20} />
      ) : (
        <AlertCircle size={20} />
      )}
      <span className="font-medium">{message}</span>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('teacher');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Firebase 同步狀態
  const [subjects, setSubjects] = useState(defaultSubjectsData);
  const [classes, setClasses] = useState(defaultClassesData);
  const [absences, setAbsences] = useState([]);

  // UI 狀態
  const [toast, setToast] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false });
  const [isSheetJsLoaded, setIsSheetJsLoaded] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const showModal = (config) => setModalConfig({ ...config, isOpen: true });
  const closeModal = () => setModalConfig({ isOpen: false });

  // 1. Firebase 匿名認證
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('Auth error:', error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. 監聽 Firebase 資料
  useEffect(() => {
    if (!user) return;

    const absencesRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'absences'
    );
    const unsubAbsences = onSnapshot(
      absencesRef,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        data.sort((a, b) => b.timestampMs - a.timestampMs);
        setAbsences(data);
      },
      (error) => console.error(error)
    );

    const settingsRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'settings'
    );
    const unsubSettings = onSnapshot(
      settingsRef,
      (snapshot) => {
        snapshot.docs.forEach((doc) => {
          if (doc.id === 'subjects')
            setSubjects(doc.data().list || defaultSubjectsData);
          if (doc.id === 'classes')
            setClasses(doc.data().list || defaultClassesData);
        });
      },
      (error) => console.error(error)
    );

    return () => {
      unsubAbsences();
      unsubSettings();
    };
  }, [user]);

  // 動態載入 SheetJS
  useEffect(() => {
    if (window.XLSX) {
      setIsSheetJsLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.async = true;
    script.onload = () => setIsSheetJsLoaded(true);
    document.body.appendChild(script);
    return () =>
      document.body.contains(script) && document.body.removeChild(script);
  }, []);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === 'test123') {
      setIsAdminAuthenticated(true);
      setPasswordInput('');
      showToast('密碼正確，進入系統設定');
    } else {
      showToast('密碼錯誤！', 'error');
      setPasswordInput('');
    }
  };

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
    setSelectedStudents([]);
  };

  const toggleStudent = (studentName) => {
    setSelectedStudents((prev) =>
      prev.includes(studentName)
        ? prev.filter((name) => name !== studentName)
        : [...prev, studentName]
    );
  };

  const handleSubmitAbsence = () => {
    if (!selectedClass || !selectedSubject)
      return showToast('請選擇班級與科目！', 'error');
    if (selectedStudents.length === 0) {
      showModal({
        title: '無缺考學生',
        message: `確定 ${
          classes.find((c) => c.id === selectedClass)?.name
        } 的 ${selectedSubject} 考試「全勤」嗎？`,
        confirmText: '確定送出全勤',
        onConfirm: () => {
          saveAbsenceData([]);
          closeModal();
        },
        onCancel: closeModal,
      });
      return;
    }
    saveAbsenceData(selectedStudents);
  };

  const saveAbsenceData = async (studentsList) => {
    if (!user) return showToast('資料庫連線中，請稍後...', 'error');
    const className = classes.find((c) => c.id === selectedClass)?.name;
    const newRecord = {
      timestamp: new Date().toLocaleString('zh-TW', { hour12: false }),
      timestampMs: Date.now(),
      className: className,
      subject: selectedSubject,
      students: studentsList,
    };

    try {
      const absencesRef = collection(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'absences'
      );
      await addDoc(absencesRef, newRecord);
      showToast('缺考名單已成功送出！');
      setSelectedClass('');
      setSelectedSubject('');
      setSelectedStudents([]);
    } catch (error) {
      showToast('送出失敗，請檢查網路連線', 'error');
    }
  };

  const [newSubject, setNewSubject] = useState('');

  const handleAddSubject = async () => {
    if (!newSubject.trim() || !user) return;
    if (subjects.includes(newSubject.trim()))
      return showToast('此科目已存在！', 'error');
    try {
      const newList = [...subjects, newSubject.trim()];
      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'subjects'),
        { list: newList }
      );
      setNewSubject('');
      showToast('科目新增成功');
    } catch (e) {
      showToast('新增失敗', 'error');
    }
  };

  const handleDeleteSubject = async (subjectToDelete) => {
    if (!user) return;
    try {
      const newList = subjects.filter((s) => s !== subjectToDelete);
      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'subjects'),
        { list: newList }
      );
      showToast('科目已刪除');
    } catch (e) {
      showToast('刪除失敗', 'error');
    }
  };

  const handleClearAllAbsences = () => {
    if (absences.length === 0) return showToast('目前沒有任何紀錄', 'error');
    showModal({
      title: '警告：刪除所有紀錄',
      message: '確定要刪除所有的缺考紀錄嗎？此動作無法復原。',
      isDanger: true,
      confirmText: '確認刪除',
      onConfirm: async () => {
        closeModal();
        try {
          const absencesRef = collection(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'absences'
          );
          const snapshot = await getDocs(absencesRef);
          snapshot.forEach(async (docSnap) => {
            await deleteDoc(
              doc(
                db,
                'artifacts',
                appId,
                'public',
                'data',
                'absences',
                docSnap.id
              )
            );
          });
          showToast('所有紀錄已清空');
        } catch (e) {
          showToast('清空失敗，請重試', 'error');
        }
      },
      onCancel: closeModal,
    });
  };

  const handleExportCSV = () => {
    if (absences.length === 0)
      return showToast('目前沒有任何紀錄可匯出', 'error');
    const BOM = '\uFEFF';
    const headers = ['時間', '班級', '科目', '狀態/缺考名單'];
    const csvRows = absences.map((record) => {
      const status =
        record.students.length === 0 ? '全勤' : record.students.join('、');
      return `"${record.timestamp}","${record.className}","${record.subject}","${status}"`;
    });
    const blob = new Blob(
      [BOM + headers.join(',') + '\n' + csvRows.join('\n')],
      { type: 'text/csv;charset=utf-8;' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `缺考紀錄_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV檔案已匯出！');
  };

  const [importText, setImportText] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!isSheetJsLoaded || !window.XLSX)
      return showToast('Excel 解析套件載入中，請稍後', 'error');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = window.XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = window.XLSX.utils.sheet_to_json(ws, { header: 1 });
        const newClassesMap = new Map();

        let classIdx = 0,
          nameIdx = 1;
        if (jsonData.length > 0) {
          const headers = jsonData[0].map((h) => String(h || '').trim());
          const foundClassIdx = headers.findIndex(
            (h) => h.includes('班級') || h.includes('班') || h.includes('Class')
          );
          const foundNameIdx = headers.findIndex(
            (h) => h.includes('姓名') || h.includes('名') || h.includes('Name')
          );
          if (foundClassIdx !== -1) classIdx = foundClassIdx;
          if (foundNameIdx !== -1) nameIdx = foundNameIdx;
        }

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          const className = row[classIdx] ? String(row[classIdx]).trim() : '';
          const studentName = row[nameIdx] ? String(row[nameIdx]).trim() : '';
          if (className && studentName) {
            if (!newClassesMap.has(className))
              newClassesMap.set(className, {
                id: className,
                name: className,
                students: [],
              });
            newClassesMap.get(className).students.push(studentName);
          }
        }
        const updatedClasses = Array.from(newClassesMap.values());
        if (updatedClasses.length > 0) {
          await setDoc(
            doc(
              db,
              'artifacts',
              appId,
              'public',
              'data',
              'settings',
              'classes'
            ),
            { list: updatedClasses }
          );
          showToast(`成功匯入 ${updatedClasses.length} 個班級！`);
        } else {
          showToast('找不到有效的資料，請檢查格式', 'error');
        }
      } catch (error) {
        showToast('檔案解析失敗', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportStudents = async () => {
    if (!importText.trim()) return;
    try {
      const newClassesMap = new Map();
      importText.split('\n').forEach((line) => {
        const parts = line
          .split('\t')
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length >= 2) {
          const [className, studentName] = parts;
          if (!newClassesMap.has(className))
            newClassesMap.set(className, {
              id: className,
              name: className,
              students: [],
            });
          newClassesMap.get(className).students.push(studentName);
        }
      });
      const updatedClasses = Array.from(newClassesMap.values());
      if (updatedClasses.length > 0) {
        await setDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'classes'),
          { list: updatedClasses }
        );
        setImportText('');
        showToast(`成功匯入 ${updatedClasses.length} 個班級！`);
      }
    } catch (e) {
      showToast('處理資料時發生錯誤', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Modal {...modalConfig} />

      <header className="bg-indigo-600 text-white shadow-md sticky top-0 z-40 print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ClipboardList size={28} />
            <h1 className="text-xl sm:text-2xl font-bold tracking-wider">
              缺考登記系統
            </h1>
          </div>
          <div className="flex gap-1 sm:gap-2 bg-indigo-700/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('teacher')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'teacher'
                  ? 'bg-white text-indigo-700 shadow'
                  : 'text-indigo-100 hover:bg-indigo-600'
              }`}
            >
              <ClipboardList size={18} />
              <span className="hidden sm:inline">教師登記</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-indigo-700 shadow'
                  : 'text-indigo-100 hover:bg-indigo-600'
              }`}
            >
              <Settings size={18} />
              <span className="hidden sm:inline">系統設定</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* 教師登記介面 */}
        {activeTab === 'teacher' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!user && (
              <div className="mb-4 p-3 bg-amber-100 text-amber-800 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                正在連線到資料庫...無法儲存請稍候。
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">
                    1
                  </span>
                  選擇考試資訊
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      考試班級
                    </label>
                    <select
                      value={selectedClass}
                      onChange={handleClassChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none bg-slate-50 hover:bg-white"
                    >
                      <option value="">-- 請選擇班級 --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      考試科目
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none bg-slate-50 hover:bg-white"
                    >
                      <option value="">-- 請選擇科目 --</option>
                      {subjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="h-px bg-slate-100 w-full mb-8"></div>

                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">
                    2
                  </span>
                  點選缺考學生
                </h2>

                {!selectedClass ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                    請先在上方選擇班級，以顯示學生名單。
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {classes
                        .find((c) => c.id === selectedClass)
                        ?.students.map((student, idx) => {
                          const isAbsent = selectedStudents.includes(student);
                          return (
                            <button
                              key={idx}
                              onClick={() => toggleStudent(student)}
                              className={`py-3 px-2 rounded-lg font-medium text-sm sm:text-base transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 ${
                                isAbsent
                                  ? 'bg-red-500 text-white shadow-md shadow-red-200 border-transparent'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                              }`}
                            >
                              <span>{idx + 1}號</span>
                              <span className={isAbsent ? 'font-bold' : ''}>
                                {student}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-6 sm:p-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-slate-600 font-medium">
                  已標記缺考：{' '}
                  <span className="text-xl font-bold text-red-600">
                    {selectedStudents.length}
                  </span>{' '}
                  人
                </div>
                <button
                  onClick={handleSubmitAbsence}
                  className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  送出缺考名單
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 系統設定介面 */}
        {activeTab === 'admin' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto mt-10 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8">
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                      <Settings size={32} />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
                    管理員驗證
                  </h2>
                  <form onSubmit={handlePasswordSubmit}>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="請輸入密碼 (test123)"
                      className="w-full px-4 py-3 mb-4 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 outline-none text-center tracking-widest text-lg"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md"
                    >
                      確認登入
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <>
                {/* 缺考總表 */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center print:hidden">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <ClipboardList className="text-indigo-600" /> 缺考紀錄總表
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExportCSV}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 text-sm"
                      >
                        <Download size={16} /> CSV
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 text-sm"
                      >
                        <Printer size={16} /> 列印
                      </button>
                      <button
                        onClick={handleClearAllAbsences}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 text-sm"
                      >
                        <Trash2 size={16} /> 清空
                      </button>
                    </div>
                  </div>

                  <div className="hidden print:block p-6 text-center">
                    <h2 className="text-2xl font-bold text-slate-900">
                      缺考紀錄總表
                    </h2>
                    <p className="text-slate-500 mt-2">
                      列印時間：{new Date().toLocaleString('zh-TW')}
                    </p>
                  </div>

                  <div className="overflow-x-auto print:overflow-visible">
                    {absences.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        目前沒有任何缺考紀錄
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 text-sm">
                            <th className="p-4 font-semibold border-b">時間</th>
                            <th className="p-4 font-semibold border-b">班級</th>
                            <th className="p-4 font-semibold border-b">科目</th>
                            <th className="p-4 font-semibold border-b">
                              狀態 / 缺考名單
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {absences.map((record) => (
                            <tr
                              key={record.id}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                                {record.timestamp}
                              </td>
                              <td className="p-4 font-medium text-slate-800 whitespace-nowrap">
                                {record.className}
                              </td>
                              <td className="p-4 text-indigo-600 font-medium whitespace-nowrap">
                                {record.subject}
                              </td>
                              <td className="p-4">
                                {record.students.length === 0 ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    全勤
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {record.students.map((student, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-red-50 text-red-700 border border-red-100"
                                      >
                                        {student}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                  {/* 科目設定 */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="text-indigo-600" />
                        考試科目設定
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="flex gap-2 mb-6">
                        <input
                          type="text"
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === 'Enter' && handleAddSubject()
                          }
                          placeholder="輸入新科目名稱..."
                          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={handleAddSubject}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-1"
                        >
                          <Plus size={18} /> 新增
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subjects.map((subject) => (
                          <div
                            key={subject}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-slate-700"
                          >
                            <span>{subject}</span>
                            <button
                              onClick={() => handleDeleteSubject(subject)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded-md hover:bg-red-50"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 名單管理 */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-indigo-600" />
                        班級名單更新
                      </h2>
                    </div>
                    <div className="p-6 space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">
                            推薦
                          </span>
                          上傳 Excel 檔案
                        </h3>
                        <label className="flex flex-col justify-center items-center w-full h-24 px-4 transition bg-slate-50 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50">
                          <div className="flex items-center space-x-2">
                            <Upload className="w-5 h-5 text-indigo-500" />
                            <span className="font-medium text-slate-600">
                              點擊選擇 Excel 檔案
                            </span>
                          </div>
                          <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            className="hidden"
                            onChange={handleFileUpload}
                          />
                        </label>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-slate-400">
                            或
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">
                          複製貼上
                        </h3>
                        <textarea
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          placeholder="例如：&#10;101班&#9;王小明&#10;101班&#9;陳大華..."
                          className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm mb-3 focus:outline-none focus:border-indigo-500 bg-slate-50"
                        />
                        <button
                          onClick={handleImportStudents}
                          className="w-full px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium flex justify-center items-center gap-2 transition-colors"
                        >
                          <FileSpreadsheet size={18} />
                          更新文字名單
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
