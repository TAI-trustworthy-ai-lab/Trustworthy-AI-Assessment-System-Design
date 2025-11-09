import React from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import AuthHeader from '@/components/AuthHeader';
import QuestionnaireContent from '@/components/QuestionnaireContent';

const DURING_QUESTIONNAIRE_ID = 2; 

export default function DuringQuestionnairePage() {
    return (
        <ProtectedLayout> 
          <AuthHeader />
          <QuestionnaireContent questionnaireId={DURING_QUESTIONNAIRE_ID} />
        </ProtectedLayout>
    );
}