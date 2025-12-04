"use client";
import React, { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import AuthHeader from '@/components/AuthHeader';
import QuestionnaireContent from '@/components/QuestionnaireContent';


export default function AfterQuestionnairePage() {
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);

  useEffect(() => {
      const id = localStorage.getItem('QuestionnaireID');
      setQuestionnaireId(id);
      
  }, []); 

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