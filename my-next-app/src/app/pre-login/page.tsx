"use client";

export default function PreLoginPage() {

  return (
    <div className="flex flex-col justify-center">
        {/* header */}
        <div className="
            flex justify-center items-end           /* 佈局/Flex */
            mb-10                                     /* 間距 */
            w-full h-70                             /* 尺寸 */
            bg-amber-500 text-gray-800                  /* 顏色/文字 */
            text-7xl text-center
            rounded-b-4xl shadow-xl border                 /* 裝飾 */
            hover:bg-amber-600 transition duration-100    /* 互動 */
        ">
            我是標題
        </div>

        {/* body */}
        <div className="
            flex flex-col justify-center items-center
            space-y-12
            ">
            <InfoBlock title="甚麼是 ATI" content="TAI 是一個指標"/>
            <TaiIntroduction />
            <InfoBlock title="問卷目的" content="用紙本不方便"/>
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
                text-center
                text-4xl
            ">
                {title}
            </div>
            <div className="
                w-150
                text-left
            ">
                {content}
            </div>
        </div>
    )
}

function TaiIntroduction(){
    return(
        <div>
            <div className="grid grid-cols-4 gap-2">
            
            <TaiElement title="你好" content="這是你好" color="bg-blue-200" />
            <TaiElement title="你好ㄛ" content="這個也是你好，這個也是你好，這個也是你好<><>這個也是你好" color="bg-blue-200" />
            <TaiElement title="你好" content="這是你好" color="bg-blue-200" />
            <TaiElement title="你好ㄛ" content="這個也是你好" color="bg-blue-200" />

            <TaiElement title="你好" content="這是你好" color="bg-blue-300" />
            <TaiElement title="你好ㄛ" content="這個也是你好" color="bg-blue-300" />
            <TaiElement title="你好" content="這是你好" color="bg-blue-300" />
            <TaiElement title="你好ㄛ" content="這個也是你好" color="bg-blue-300" />

            <TaiElement title="你好" content="這是你好" color="bg-blue-400" />
            <TaiElement title="你好ㄛ" content="這個也是你好" color="bg-blue-400" />
            <TaiElement title="你好" content="這是你好" color="bg-blue-400" />
            
            </div>
        </div>
    )
}

function TaiElement({title, content, color}: {title: string, content: string, color: string}){
    const taiStyle = "w-50 h-50 " + color;
    return (
        <div className={taiStyle}>
            <div className="
                flex justify-center
                py-4
                text-2xl font-bold
            ">
                {title}
            </div>
            <div className="
                flex justify-center items-center
                px-5
                text-left
            ">
                {content}
            </div>
        </div>
    )
}