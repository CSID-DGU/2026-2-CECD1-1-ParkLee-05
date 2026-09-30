import { createContext, useContext } from 'react';

export const ToastContext = createContext<(text: string) => void>(() => {});

/** 화면 하단에 잠깐 뜨는 알림을 띄운다 */
export const useToast = () => useContext(ToastContext);
