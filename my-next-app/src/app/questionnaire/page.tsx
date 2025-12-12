"use client";
import React, { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import AuthHeader from '@/components/AuthHeader';
// Core component for rendering questionnaire forms
import QuestionnaireContent from '@/components/QuestionnaireContent';


// Main Questionnaire Page Component
export default function AfterQuestionnairePage() {
    // State to hold the fetched questionnaire ID
    const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);

    // Effect to load ID from local storage
    useEffect(() => {
        const id = localStorage.getItem('QuestionnaireID');
        setQuestionnaireId(id);
    }, []); 

    // Loading/Missing ID UI
    if (questionnaireId === null) {
        return (
            <ProtectedLayout>
                <AuthHeader />
                <div className="text-center p-8">加載問卷資料。。。</div>
            </ProtectedLayout>
        );
    }

    // Main Content Render
    return (
        <ProtectedLayout> 
            <AuthHeader />
            {/* Pass ID to content component */}
            <QuestionnaireContent questionnaireId={questionnaireId} />
        </ProtectedLayout>
    );
}