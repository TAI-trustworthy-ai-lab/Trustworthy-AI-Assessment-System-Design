// app/model/after/page.tsx
"use client";

import { useState, useMemo} from 'react';
import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import ProtectedLayout from '@/components/ProtectedLayout';

// 導入題目 JSON 檔案
import allPages from '@/data/before.json'; 

// 定義資料類型
interface Question {
  id: string;
  text: string;
}

interface PageData {
  pageTitle: string;
  questions: Question[];
}

// 答案的結構：key是question id，value是 "是" 或 "否"
type Answers = Record<string, '是' | '否'>;

const TOTAL_PAGES = allPages.length;

// 後端 API 基礎 URL ************ 待更改API ************
const BASE_URL = "http://localhost:3001/api/";
const QUESTIONNAIRE_ID = 1;

export default function BeforePage() {
  const router = useRouter();
  
  // 狀態：當前分頁 (從 0 開始)
  const [currentPage, setCurrentPage] = useState(0); 
  
  // 狀態：收集所有答案
  const [answers, setAnswers] = useState<Answers>({});
  
  // 狀態：是否有提交中的 loading 狀態
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 獲取當前分頁的資料
  const currentPageData: PageData = allPages[currentPage];

  // 計算進度百分比
  const progressPercent = useMemo(() => {
    return Math.round(((currentPage) / TOTAL_PAGES) * 100);
  }, [currentPage]);
  
  // 檢查當前頁面是否所有題目都有答案
  const isCurrentPageComplete = useMemo(() => {
    return currentPageData.questions.every(q => answers[q.id]);
  }, [answers, currentPageData]);


  // 處理選項點擊
  const handleAnswer = (questionId: string, answer: '是' | '否') => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // 處理「下一步」
  const handleNext = () => {
    if (!isCurrentPageComplete) {
      alert("請先完成本頁所有題目才能進入下一頁。");
      return;
    }

    if (currentPage < TOTAL_PAGES - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  // 處理「上一步」
  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // 處理問卷提交 (最後一頁)
  const handleSubmit = async () => {
    if (!isCurrentPageComplete) {
      alert("請先完成本頁所有題目才能提交問卷。");
      return;
    }

    setIsSubmitting(true);
    
    // **********************************************
    // 將資料傳給後端的邏輯
    // **********************************************
    /*
    const currentUserId = localStorage.getItem('userId');
    const userToken = localStorage.getItem('authToken');

    // 檢查是否已登入
    if (!currentUserId || !userToken) {
        alert("您尚未登入或登入資訊已過期，請重新登入。");
        return;
    }
    */

    const answersPayload = Object.entries(answers).map(([idString, value]) => {
      const questionId = parseInt(idString, 10); 
      const score = value === '是' ? 100 : 0; 
      return {
        questionId: questionId, 
        score: score,
      };
    });
    
    const finalPayload = {
      // userId: parseInt(currentUserId, 10),
      questionnaireId: QUESTIONNAIRE_ID,
      answers: answersPayload,
    };

    // **********************************************

    try {
      const response = await fetch(`${BASE_URL}response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ⚠️ 如果需要，請加入認證 token
          // 'Authorization': `Bearer ${userToken}`, 
        },

        // 傳送包含 TAI_ID 和結構化答案的 Payload
        body: JSON.stringify(finalPayload), 
      });

      if (response.ok) {
        alert("問卷提交成功！");
        router.push('/report'); // 提交成功後導航到儀表板
      } else {
        // 處理 API 錯誤
        const errorData = await response.json();
        alert(`提交失敗: ${errorData.message || '伺服器錯誤'}`);
      }
    } catch (error) {
      console.error('提交錯誤:', error);
      alert("提交過程中發生網路錯誤。");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gray-50">
        <AuthHeader />
        
        <main className="pt-24 flex flex-col items-center min-h-[calc(100vh-6rem)] px-4">
          <div className="w-full max-w-3xl bg-white p-8 rounded-xl shadow-lg mt-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
                建模前測驗問卷
            </h1>

            {/* 進度條 (Progress Bar) */}
            <div className="w-full mb-8">
              <div className="text-sm font-medium text-gray-700 mb-2 flex justify-between">
                  <span>進度：第 {currentPage + 1} / {TOTAL_PAGES} 頁</span>
                  <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-purple-700 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* 當前分頁內容 */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6 text-center border-b pb-3">
                    {currentPageData.pageTitle}
                </h2>

                <div className="space-y-6">
                    {currentPageData.questions.map((q) => (
                        <div key={q.id} className="p-4 border rounded-lg bg-gray-50">
                            <p className="font-semibold text-gray-700 mb-3">{q.text}</p>
                            <div className="flex space-x-6">
                                {/* 「是」選項 */}
                                <button
                                    onClick={() => handleAnswer(q.id, '是')}
                                    className={`py-2 px-6 rounded-lg font-medium transition duration-150 
                                      ${answers[q.id] === '是' 
                                        ? 'bg-purple-700 text-white shadow-md' 
                                        : 'bg-white text-gray-800 border hover:bg-purple-50'
                                      }`}
                                >
                                    是
                                </button>
                                {/* 「否」選項 */}
                                <button
                                    onClick={() => handleAnswer(q.id, '否')}
                                    className={`py-2 px-6 rounded-lg font-medium transition duration-150 
                                      ${answers[q.id] === '否' 
                                        ? 'bg-purple-700 text-white shadow-md' 
                                        : 'bg-white text-gray-800 border hover:bg-purple-50'
                                      }`}
                                >
                                    否
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 導航按鈕 */}
            <div className="flex justify-between mt-10 pt-6 border-t">
              <button
                onClick={handlePrevious}
                disabled={currentPage === 0}
                className="py-2 px-6 bg-gray-500 text-white font-bold rounded-lg transition duration-150 hover:bg-gray-400 disabled:opacity-50"
              >
                上一步
              </button>

              {currentPage < TOTAL_PAGES - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!isCurrentPageComplete} // 未填完不給進入下一頁
                  className="py-2 px-6 bg-purple-700 text-white font-bold rounded-lg transition duration-150 hover:bg-purple-500 disabled:opacity-50"
                >
                  下一步
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isCurrentPageComplete}
                  className="py-2 px-6 bg-green-600 text-white font-bold rounded-lg transition duration-150 hover:bg-green-500 disabled:opacity-50"
                >
                  {isSubmitting ? '提交中...' : '完成並提交'}
                </button>
              )}
            </div>

          </div>
        </main>
      </div>
    </ProtectedLayout>
  );
}