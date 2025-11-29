// 中英文 TAI INDICATOR 對照表
export const TAI_INDICATOR_MAP_EN_ZH: { [key: string]: string } = {
    "ACCURACY": "準確性",
    "RELIABILITY": "可靠性",
    "SAFETY": "安全性",
    "RESILIENCE": "韌性",
    "TRANSPARENCY": "透明性",
    "ACCOUNTABILITY": "當責性",
    "EXPLAINABILITY": "可解釋性",
    "AUTONOMY": "自主性",
    "PRIVACY": "隱私",
    "FAIRNESS": "公平性",
    "SECURITY": "資訊安全",
};

export const TAI_INDICATOR_MAP_ZH_EN: { [key: string]: string } = {
    "準確性": "ACCURACY",
    "可靠性": "RELIABILITY",
    "安全性": "SAFETY",
    "韌性": "RESILIENCE",
    "透明性": "TRANSPARENCY",
    "當責性": "ACCOUNTABILITY",
    "可解釋性": "EXPLAINABILITY",
    "自主性": "AUTONOMY",
    "隱私": "PRIVACY",
    "公平性": "FAIRNESS",
    "資訊安全": "SECURITY",
};

export const CATEGORY_MAP: Record<string, string> = {
    "ACCURACY": "一、準確性（Accuracy）：AI判斷的結果與真實情況相近程度",
    "RELIABILITY": "二、可靠性（Reliability)：AI 模型在面對不同類型的干擾或異常情況時，敏感度適中，不會過度敏感導致表現不穩定",
    "SAFETY": "三、安全性（Safety）：AI系統若出錯，不會對周遭環境、利害關係人（例如使用者與民眾）造成不利的影響或傷害",
    "RESILIENCE": "四、韌性(Resilience)：AI 系統與相關設備能夠適應不同的環境、需求及條件，靈活調整與擴展，以滿足不斷變化的需求和挑戰",
    "TRANSPARENCY": "五、透明性(Transparency)：AI 系統使用者可以追溯AI 在做判斷或決策時，所使用的資料、演算法或規則",
    "ACCOUNTABILITY": "六、當責性(Accountability)：當AI系統導致非預期的負面影響時，要有監督機制或該負責的單位或人",
    "EXPLAINABILITY": "七、可解釋性(Explanability)：AI 的決策邏輯（即資料輸入與決策結果之間的因果關係）可以被清楚描述與呈現，讓使用者與利害關係者更了解AI的決策理由",
    "AUTONOMY": "八、自主性(Autonomy)：AI系統使用者與AI的互動過程中，能保持充分的自主性，不過度依賴AI的判斷或決策",
    "PRIVACY": "九、隱私(Privacy)：在使用AI系統時，不會侵犯到個人隱私",
    "FAIRNESS": "十、公平性(Fairness)：AI系統在做判斷或決策時，能平等對待不同群體，避免不公正的情況",
    "SECURITY": "十一、資訊安全性(Security)：防止外部環境對AI模型的侵入和損害，以保護訓練與測試過程中的資料安全",
    "UNKNOWN": "未知分類：{{category}}"
};

export const REPORT_CATEGORY_MAP_EN: Record<string, string> = {
    "ACCURACY": "一、準確性（Accuracy）",
    "RELIABILITY": "二、可靠性（Reliability）",
    "SAFETY": "三、安全性（Safety）",
    "RESILIENCE": "四、韌性（Resilience）",
    "TRANSPARENCY": "五、透明性（Transparency）",
    "ACCOUNTABILITY": "六、當責性（Accountability）",
    "EXPLAINABILITY": "七、可解釋性（Explanability）",
    "AUTONOMY": "八、自主性（Autonomy）",
    "PRIVACY": "九、隱私（Privacy）",
    "FAIRNESS": "十、公平性（Fairness）",
    "SECURITY": "十一、資訊安全性（Security）",
};