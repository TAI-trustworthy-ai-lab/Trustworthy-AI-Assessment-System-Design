import React from 'react';
import Link from 'next/link';

interface HeaderProps {
  children?: React.ReactNode;
  titleHref?: string; 
}

export default function Header({ children, titleHref = '/' }: HeaderProps) {
  return (
    <header className='
      bg-blue-100/85
      fixed top-0 left-0 w-full 
      z-50
      h-20
    '>
      <div className='
          flex justify-between items-center
          h-full 
          px-6
      '>
        <Link href={titleHref} className='
          text-2xl font-bold text-gray-800 hover:text-blue-600 transition
        '>
          可信任AI評估測驗
        </Link>

        {/* 右側：客製化的內容 */}
        <div className='flex space-x-5 items-center'>
          {/* 在這裏加上語言切換按鈕 */}
            {children}
        </div>
      </div>
    </header>
  );
}