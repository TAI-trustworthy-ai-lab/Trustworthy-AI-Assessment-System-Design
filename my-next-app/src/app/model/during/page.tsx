"use client";
import React, { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import AuthHeader from '@/components/AuthHeader';
import QuestionnaireContent from '@/components/QuestionnaireContent';


export default function DuringQuestionnairePage() {
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);

  useEffect(() => {
      // 2. 在 useEffect 內執行瀏覽器 API 讀取
      const id = localStorage.getItem('QuestionnaireID');
      
      // 3. 使用 setQuestionnaireId 更新狀態
      // 這會觸發組件重新渲染，並將新值帶入 return 區塊
      setQuestionnaireId(id);
      
  }, []); 

  // 4. 處理資料正在加載或不存在的狀態
  if (questionnaireId === null) {
      return (
        <ProtectedLayout>
            <AuthHeader />
            <div className="text-center p-8">加載問卷資料。。。</div>
        </ProtectedLayout>
      );
  }

  return (
    <ProtectedLayout> 
      <AuthHeader />
      <QuestionnaireContent questionnaireId={questionnaireId} />
    </ProtectedLayout>
  );
}