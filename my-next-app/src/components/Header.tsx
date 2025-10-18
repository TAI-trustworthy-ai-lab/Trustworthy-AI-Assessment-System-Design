import React from 'react';

// 定義 Header 組件的 props
// 這裡我們只接受一個標準的 React 屬性：children，它是組件內容
interface HeaderProps {
  children: React.ReactNode;
}

export default function Header({ children }: HeaderProps) {
  return (
    <header className='
      bg-blue-100/85
      fixed top-0 left-0 w-full
    '>
      {/* 將客製化的內容渲染在裡面。 
        這裡可以加上一些統一的 padding/margin 或 flexbox 設置，
        但為了最大的靈活性，我建議將內部的結構 (如 justify-end space-x-5)
        留給父組件來定義，或者在這裡設定最基礎的容器樣式。
      */}
      <div className='
        my-5 
      '>
        {children}
      </div>
    </header>
  );
}