import React from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import AuthHeader from '@/components/AuthHeader';
import QuestionnaireContent from '@/components/QuestionnaireContent';

const BEFORE_QUESTIONNAIRE_ID = 1; 

export default function BeforeQuestionnairePage() {
    return (
        <ProtectedLayout> 
          <AuthHeader />
          <QuestionnaireContent questionnaireId={BEFORE_QUESTIONNAIRE_ID} />
        </ProtectedLayout>
    );
}