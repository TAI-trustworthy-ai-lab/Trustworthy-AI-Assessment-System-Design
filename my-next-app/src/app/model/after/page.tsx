import React from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import AuthHeader from '@/components/AuthHeader';
import QuestionnaireContent from '@/components/QuestionnaireContent';

const AFTER_QUESTIONNAIRE_ID = 3; 

export default function AfterQuestionnairePage() {
    return (
        <ProtectedLayout> 
          <AuthHeader />
          <QuestionnaireContent questionnaireId={AFTER_QUESTIONNAIRE_ID} />
        </ProtectedLayout>
    );
}