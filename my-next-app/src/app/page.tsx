"use client";
import Link from 'next/link';
import Header from '@/components/Header';

export default function PreLoginPage() {
    const titleLinkTarget = '/';
  return (
    <div className="flex flex-col justify-center">
        <Header titleHref={titleLinkTarget}>
            <div className='flex justify-end space-x-5 items-center'>
                <div>
                    關於
                </div>
                <div>
                    語言
                </div>
                
                {/* login button */}
                <Link href="/login" className='mr-3'>
                    <button className="
                        py-2 px-4 rounded-2xl
                        bg-blue-500 hover:bg-blue-400 active:bg-blue-600
                        text-white font-bold
                        transition duration-100
                    ">
                        Login
                    </button>
                </Link>
            </div>
        </Header>
        
        {/* header */}
        <div className="
            flex-col
            mb-10
            w-full h-fit
        ">
            <div className="
                flex justify-center items-end
                mt-50
                whitespace-nowrap
                text-7xl text-center
                text-gray-800
            ">
                我是標題
            </div>
        </div>

        {/* body */}
        <div className="
            w-full
            justify-center items-center
            px-5 space-y-12

            md:flex md:flex-col 
            ">
            <InfoBlock title="甚麼是 TAI" content="人工智慧（AI）技術近年來逐漸在社會各領域受到重視，為了提升AI技術在應用上的可信任程度，歐盟於2019年釋出可信任的AI倫理準則（Ethics Guidelines for Trustworthy AI），我國行政院數位發展部亦於2023年成立AI 產品與系統評測中心，為建立國內AI產品與系統評測體系而擬發展評測項目。"/>
            <TaiIntroduction />
            <InfoBlock title="問卷目的" content="本評估表根據歐盟可信任的AI倫理準則與數位發展部擬發展的評測項目，研擬11項可信任的AI倫理自我評鑑指標，提供AI模型開發者與潛在使用者於建模後，部署AI系統時進行檢視，以期符合可信任AI倫理標準。"/>
        </div>

        {/* end */}
        <div className="
            flex justify-center items-center
            w-full h-70
            text-7xl text-center
        ">
            -end-
        </div>
    </div>
  );
}

function InfoBlock({ title, content }: { title: string, content: string }){
    return(
        <div className="
            flex
            flex-col justify-center
        ">
            <div className="
                mb-5
                whitespace-nowrap
                text-center
                text-4xl
            ">
                {title}
            </div>
            <div className="
                text-center
                text-2xl

                md:w-150
                md:text-xl
            ">
                {content}
            </div>
        </div>
    )
}

function TaiIntroduction(){
    return(
        <div>
            <div className="
                w-full grid grid-cols-2 gap-2
                md:grid md:grid-cols-4 md:gap-2
            ">
            
            <TaiElement title="準確性" content="AI判斷的結果與真實情況相近程度" color="bg-blue-200" />
            <TaiElement title="可靠性" content="AI 模型在面對不同類型的干擾或異常情況時，敏感度適中，不會過度敏感導致表現不穩定" color="bg-blue-200" />
            <TaiElement title="安全性" content="AI系統若出錯，不會對周遭環境、利害關係人（例如使用者與民眾）造成不利的影響或傷害" color="bg-blue-200" />
            <TaiElement title="韌性" content="AI 系統與相關設備能夠適應不同的環境、需求及條件，靈活調整與擴展，以滿足不斷變化的需求和挑戰" color="bg-blue-200" />

            <TaiElement title="透明性" content="AI 系統使用者可以追溯AI 在做判斷或決策時，所使用的資料、演算法或規則" color="bg-blue-300" />
            <TaiElement title="當責性" content="當AI系統導致非預期的負面影響時，要有監督機制或該負責的單位或人" color="bg-blue-300" />
            <TaiElement title="可解釋性" content="AI 的決策邏輯（即資料輸入與決策結果之間的因果關係）可以被清楚描述與呈現，讓使用者與利害關係者更了解AI的決策理由" color="bg-blue-300" />
            <TaiElement title="自主性" content="AI系統使用者與AI的互動過程中，能保持充分的自主性，不過度依賴AI的判斷或決策" color="bg-blue-300" />

            <TaiElement title="隱私" content="在使用AI系統時，不會侵犯到個人隱私" color="bg-blue-400" />
            <TaiElement title="公平性" content="AI系統在做判斷或決策時，能平等對待不同群體，避免不公正的情況" color="bg-blue-400" />
            <TaiElement title="資訊安全性" content="這是你好" color="bg-blue-400" />
            
            </div>
        </div>
    )
}

function TaiElement({title, content, color}: {title: string, content: string, color: string}){
    const taiStyle = "grow h-20\
        md:grow md:max-w-50 md:h-60 " + color;
    return (
        <div className={taiStyle}>
            <div className="
                flex justify-center items-center h-full
                text-2xl font-bold
                md:h-fit
                md:py-4
            ">
                {title}
            </div>
            <div className="
                hidden

                md:flex md:justify-center md:items-center
                md:px-5
                md:text-left
            ">
                {content}
            </div>
        </div>
    )
}