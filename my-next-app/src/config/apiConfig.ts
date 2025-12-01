export const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL;
export const API_PREFIX = "/api"; 

export const USER_API_BASE = `${BASE_API_URL}${API_PREFIX}/auth`; 
export const PROJECT_API_BASE = `${BASE_API_URL}${API_PREFIX}/project`; 
export const QUESTIONNAIRE_API_BASE = `${BASE_API_URL}${API_PREFIX}/questionnaire`;
export const RESPONSE_API_BASE = `${BASE_API_URL}${API_PREFIX}/response`; 
export const REPORT_API_BASE = `${BASE_API_URL}${API_PREFIX}/report`;
